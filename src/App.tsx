/**
 * Shopping Optimization Web App
 * 大促购物策略优化与智能凑单省钱决策引擎
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  ShoppingBag,
  Tag,
  BarChart3,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
} from 'lucide-react';
import { Product, Promotion, OptimizationExecutionResult } from './types/shopping';
import {
  SAMPLE_SCENARIO_HOME_APPLIANCE,
  SAMPLE_SCENARIO_FAMILY_RESTOCK,
} from './engine/sampleData';
import { runOptimization } from './engine/optimizer';
import { Header } from './components/Header';
import { ProductListTable } from './components/ProductListTable';
import { ProductInputModal } from './components/ProductInputModal';
import { RuleManager } from './components/RuleManager';
import { OptimizationDashboard } from './components/OptimizationDashboard';
import { PaddingSuggester } from './components/PaddingSuggester';
import { ExportSummaryModal } from './components/ExportSummaryModal';

export default function App() {
  // App state
  const [activeScenarioId, setActiveScenarioId] = useState<string>('home_appliance_618');
  const [products, setProducts] = useState<Product[]>(SAMPLE_SCENARIO_HOME_APPLIANCE.products);
  const [promotions, setPromotions] = useState<Promotion[]>(
    SAMPLE_SCENARIO_HOME_APPLIANCE.promotions
  );

  // Workflow tab: 'products' | 'rules' | 'results'
  const [activeTab, setActiveTab] = useState<'products' | 'rules' | 'results'>('results');

  // Optimization calculation result
  const [optimizationResult, setOptimizationResult] = useState<OptimizationExecutionResult | null>(
    null
  );

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPaddingModalOpen, setIsPaddingModalOpen] = useState(false);

  // Run optimization whenever products or promotions change
  const executeOptimizer = () => {
    const res = runOptimization(products, promotions);
    setOptimizationResult(res);
  };

  // Initial calculation
  useEffect(() => {
    executeOptimizer();
  }, [products, promotions]);

  // Load preset scenario
  const handleLoadScenario = (scenarioId: string) => {
    if (scenarioId === 'home_appliance_618') {
      setActiveScenarioId('home_appliance_618');
      setProducts(SAMPLE_SCENARIO_HOME_APPLIANCE.products);
      setPromotions(SAMPLE_SCENARIO_HOME_APPLIANCE.promotions);
      setActiveTab('results');
    } else if (scenarioId === 'family_restock') {
      setActiveScenarioId('family_restock');
      setProducts(SAMPLE_SCENARIO_FAMILY_RESTOCK.products);
      setPromotions(SAMPLE_SCENARIO_FAMILY_RESTOCK.promotions);
      setActiveTab('results');
    }
  };

  // Reset list
  const handleReset = () => {
    if (window.confirm('确定要清空当前所有商品清单和优惠规则吗？')) {
      setActiveScenarioId('');
      setProducts([]);
      setPromotions([
        {
          id: 'promo-default',
          name: '跨店每满300减50',
          type: 'CROSS_SHOP_FULL_REDUCTION',
          threshold: 300,
          discount: 50,
          isTiered: true,
          enabled: true,
        },
      ]);
      setActiveTab('products');
    }
  };

  // Product mutations
  const handleUpdateProduct = (id: string, updates: Partial<Product>) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const handleRemoveProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleAddProducts = (newItems: Product[]) => {
    setProducts((prev) => [...prev, ...newItems]);
  };

  // Promotion mutations
  const handleAddPromotion = (promo: Promotion) => {
    setPromotions((prev) => [...prev, promo]);
  };

  const handleUpdatePromotion = (id: string, updates: Partial<Promotion>) => {
    setPromotions((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const handleRemovePromotion = (id: string) => {
    setPromotions((prev) => prev.filter((p) => p.id !== id));
  };

  // Computations
  const totalOriginal = useMemo(
    () => products.reduce((sum, p) => sum + p.price * p.quantity, 0),
    [products]
  );
  const totalItemCount = useMemo(
    () => products.reduce((sum, p) => sum + p.quantity, 0),
    [products]
  );
  const flexibleProducts = useMemo(
    () => products.filter((p) => p.priority === 'flexible'),
    [products]
  );

  return (
    <div className="min-h-screen bg-[#faf8f5] text-slate-800 flex flex-col font-sans selection:bg-amber-300 selection:text-amber-950">
      {/* 1. Global Header */}
      <Header
        onLoadScenario={handleLoadScenario}
        onOpenImport={() => setIsImportModalOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
        onReset={handleReset}
        activeScenarioId={activeScenarioId}
        itemCount={totalItemCount}
        totalOriginal={totalOriginal}
      />

      {/* 2. Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Step Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/80 pb-3">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('results')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                activeTab === 'results'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25 ring-1 ring-amber-400'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-amber-50/80 border border-amber-200/70 shadow-xs'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>决策看板 & 最优方案</span>
              {optimizationResult && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === 'results' ? 'bg-amber-600/40 text-amber-100' : 'bg-amber-100 text-amber-800'
                }`}>
                  3方案
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                activeTab === 'products'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25 ring-1 ring-amber-400'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-amber-50/80 border border-amber-200/70 shadow-xs'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>商品清单核对 ({products.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('rules')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                activeTab === 'rules'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25 ring-1 ring-amber-400'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-amber-50/80 border border-amber-200/70 shadow-xs'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>优惠规则配置 ({promotions.length})</span>
            </button>
          </div>

          {/* Quick Re-Calculate Trigger */}
          <div className="flex items-center space-x-3">
            <button
              onClick={executeOptimizer}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-amber-950 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 transition shadow-md shadow-amber-400/30 cursor-pointer border border-amber-300"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>重新求解与精算</span>
            </button>
          </div>
        </div>

        {/* Tab View 1: Results Dashboard */}
        {activeTab === 'results' && optimizationResult && (
          <OptimizationDashboard
            result={optimizationResult}
            products={products}
            onOpenPaddingModal={() => setIsPaddingModalOpen(true)}
          />
        )}

        {/* Tab View 2: Products Table */}
        {activeTab === 'products' && (
          <ProductListTable
            products={products}
            onUpdateProduct={handleUpdateProduct}
            onRemoveProduct={handleRemoveProduct}
            onOpenAddModal={() => setIsImportModalOpen(true)}
          />
        )}

        {/* Tab View 3: Promotion Rules */}
        {activeTab === 'rules' && (
          <RuleManager
            promotions={promotions}
            onAddPromotion={handleAddPromotion}
            onUpdatePromotion={handleUpdatePromotion}
            onRemovePromotion={handleRemovePromotion}
            onBatchSetPromotions={setPromotions}
          />
        )}
      </main>

      {/* Footer Info */}
      <footer className="border-t border-amber-200/60 py-6 mt-12 bg-white text-center text-xs text-slate-500 space-y-1">
        <p className="text-slate-600 font-medium">优惠计算助手 · 专注于大促大宗采购组合最优化计算与拆单决策</p>
        <p className="text-[11px] text-slate-400">
          基于约束规划、动态规划与分支界定剪枝 · 保证理论可解释与可验证最低价
        </p>
      </footer>

      {/* Import Modal */}
      <ProductInputModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onAddProducts={handleAddProducts}
      />

      {/* Export Modal */}
      {optimizationResult && optimizationResult.plans[0] && (
        <ExportSummaryModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          plan={optimizationResult.plans[0]}
        />
      )}

      {/* Padding Modal */}
      {optimizationResult && optimizationResult.plans[0] && (
        <PaddingSuggester
          isOpen={isPaddingModalOpen}
          onClose={() => setIsPaddingModalOpen(false)}
          plan={optimizationResult.plans[0]}
          flexibleProducts={flexibleProducts}
          onAddProductToList={(p) => {
            handleAddProducts([p]);
            executeOptimizer();
          }}
        />
      )}
    </div>
  );
}
