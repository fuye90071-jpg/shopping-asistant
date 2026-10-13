import React from 'react';
import { Sparkles, ShoppingBag, RotateCcw, Share2, Layers } from 'lucide-react';

interface HeaderProps {
  onLoadScenario: (scenarioId: string) => void;
  onOpenImport: () => void;
  onOpenExport: () => void;
  onReset: () => void;
  activeScenarioId?: string;
  itemCount: number;
  totalOriginal: number;
}

export const Header: React.FC<HeaderProps> = ({
  onLoadScenario,
  onOpenImport,
  onOpenExport,
  onReset,
  activeScenarioId,
  itemCount,
  totalOriginal,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 border-b border-amber-200/80 text-slate-800 shadow-xs backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Logo & App Title */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-400 via-amber-500 to-yellow-400 flex items-center justify-center shadow-md shadow-amber-400/30 text-amber-950">
              <Sparkles className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-slate-900">
                  优惠计算助手
                </span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-800 border border-amber-200">
                  大促精算引擎 v1.0
                </span>
              </div>
              <p className="text-xs text-slate-500">
                淘宝/天猫大宗采购 · 规则严谨求解 · 极限最低实付决策
              </p>
            </div>
          </div>

          {/* Quick Scenario & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-amber-50/70 rounded-xl p-1 border border-amber-200/80 text-xs">
              <span className="px-2 text-slate-500 font-medium flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-amber-600" /> 预设测试场景:
              </span>
              <button
                onClick={() => onLoadScenario('home_appliance_618')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  activeScenarioId === 'home_appliance_618'
                    ? 'bg-amber-500 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
                title="22件数码家电，多店铺大宗采购"
              >
                新家数码家电 (22件)
              </button>
              <button
                onClick={() => onLoadScenario('family_restock')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  activeScenarioId === 'family_restock'
                    ? 'bg-amber-500 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
                title="24件母婴日化高频消耗品"
              >
                母婴日用囤货 (24件)
              </button>
            </div>

            <button
              onClick={onOpenImport}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white transition shadow-sm cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>导入商品链接</span>
            </button>

            <button
              onClick={onOpenExport}
              disabled={itemCount === 0}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-amber-50 text-slate-700 border border-amber-200/80 disabled:opacity-40 transition cursor-pointer shadow-2xs"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-500" />
              <span>导出方案</span>
            </button>


            <button
              onClick={onReset}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-amber-100/60 transition cursor-pointer"
              title="清空当前清单"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global summary badge */}
        <div className="mt-2.5 pt-2 border-t border-amber-100 flex flex-wrap items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-4">
            <span>
              已选商品: <strong className="text-slate-900">{itemCount}</strong> 件
            </span>
            <span>
              清单标价总计: <strong className="text-amber-700 font-bold font-mono">¥{totalOriginal.toFixed(2)}</strong>
            </span>
            <span className="hidden sm:inline text-amber-200">|</span>
            <span className="hidden sm:inline text-slate-500">
              算法支持: 理论最优分支界定 (B&B) · 动态规划分摊 · 凑单差额嗅探
            </span>
          </div>
          <div className="text-slate-500 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>确定性计算引擎已就绪</span>
          </div>
        </div>
      </div>
    </header>
  );
};
