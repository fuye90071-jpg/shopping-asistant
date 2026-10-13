import React, { useState } from 'react';
import { X, Sparkles, Plus, Check, ArrowRight, ShoppingCart, HelpCircle } from 'lucide-react';
import { Product, OptimizationPlan } from '../types/shopping';

interface PaddingSuggesterProps {
  isOpen: boolean;
  onClose: () => void;
  plan: OptimizationPlan;
  flexibleProducts: Product[];
  onAddProductToList: (product: Product) => void;
}

// Built-in popular low-cost daily essentials for padding
const COMMON_PADDING_ITEMS: Omit<Product, 'id'>[] = [
  {
    platform: 'tmall',
    name: '洁柔 油画抽纸 4层加厚 6包便携装',
    shop: '洁柔官方旗舰店',
    category: '生活日用',
    price: 15.9,
    quantity: 1,
    priority: 'flexible',
    participatesCrossShop: true,
  },
  {
    platform: 'tmall',
    name: '奥妙 洗衣凝珠 3合1除菌抑菌 20颗盒装',
    shop: '联合利华官方旗舰店',
    category: '日化家清',
    price: 24.9,
    quantity: 1,
    priority: 'flexible',
    participatesCrossShop: true,
  },
  {
    platform: 'taobao',
    name: '加厚封口食品保鲜袋 大中小混合50只',
    shop: '居家生活精品店',
    category: '生活日用',
    price: 9.9,
    quantity: 1,
    priority: 'flexible',
    participatesCrossShop: true,
  },
  {
    platform: 'tmall',
    name: '绿联 高速编织Type-C快充数据线 1米',
    shop: '绿联数码旗舰店',
    category: '数码配件',
    price: 19.9,
    quantity: 1,
    priority: 'flexible',
    participatesCrossShop: true,
  },
  {
    platform: 'tmall',
    name: '狮王 细齿洁软毛超密牙刷 2支装',
    shop: '狮王官方旗舰店',
    category: '生活日用',
    price: 19.9,
    quantity: 1,
    priority: 'flexible',
    participatesCrossShop: true,
  },
];

export const PaddingSuggester: React.FC<PaddingSuggesterProps> = ({
  isOpen,
  onClose,
  plan,
  flexibleProducts,
  onAddProductToList,
}) => {
  const [addedItemNames, setAddedItemNames] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const handleAddItem = (item: Omit<Product, 'id'>) => {
    const fullProduct: Product = {
      ...item,
      id: `prod-padding-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    onAddProductToList(fullProduct);
    setAddedItemNames((prev) => new Set([...prev, item.name]));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-amber-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-amber-100 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <Sparkles className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">智能凑单微调器</h3>
              <p className="text-xs text-slate-500">
                利用差额嗅探，以极低成本甚至“负成本”跨过满减门槛
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-amber-100/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Active Gaps */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              当前检测到的临界门槛差距
            </h4>
            {plan.paddingTips.length === 0 ? (
              <div className="p-4 bg-amber-50/40 rounded-xl border border-amber-200 text-xs text-slate-600">
                🎉 当前方案各个满减阶梯利用率极高，暂无紧迫凑单缺口。
              </div>
            ) : (
              plan.paddingTips.map((tip, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-gradient-to-r from-amber-50 via-yellow-50/40 to-white border border-amber-200 rounded-xl text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-900">{tip.message}</span>
                    {tip.gapAmount > 0 && (
                      <span className="font-mono font-bold text-amber-900 px-2 py-0.5 rounded bg-amber-100 border border-amber-300">
                        仅差 ¥{tip.gapAmount.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-700 leading-relaxed">{tip.suggestedAction}</p>
                </div>
              ))
            )}
          </div>

          {/* User's existing flexible items */}
          {flexibleProducts.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                当前清单中已有的【凑单/备选】商品
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {flexibleProducts.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 bg-amber-50/30 border border-amber-200/80 rounded-xl flex items-center justify-between"
                  >
                    <div className="truncate mr-2">
                      <div className="text-slate-800 font-semibold truncate">{p.name}</div>
                      <span className="text-[11px] text-slate-400">
                        ¥{p.price} × {p.quantity} 件 · {p.shop}
                      </span>
                    </div>
                    <span className="text-amber-700 font-mono font-bold shrink-0">
                      ¥{(p.price * p.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Low-Cost Padding Essentials */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                一键加购：高性价比日用凑单神器
              </h4>
              <span className="text-[11px] text-slate-400">
                支持跨店每满减 · 居家刚需消耗品
              </span>
            </div>

            <div className="space-y-2">
              {COMMON_PADDING_ITEMS.map((item, idx) => {
                const isAdded = addedItemNames.has(item.name);
                return (
                  <div
                    key={idx}
                    className="p-3 bg-white border border-amber-200/80 rounded-xl flex items-center justify-between text-xs hover:border-amber-300 hover:bg-amber-50/20 transition"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
                        <ShoppingCart className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {item.shop} · {item.category}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="font-mono font-bold text-amber-700">
                        ¥{item.price.toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleAddItem(item)}
                        disabled={isAdded}
                        className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center space-x-1 transition cursor-pointer ${
                          isAdded
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>已加购</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>加购凑单</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-amber-100 bg-amber-50/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 transition cursor-pointer shadow-xs"
          >
            完成并重新计算方案
          </button>
        </div>
      </div>
    </div>
  );
};
