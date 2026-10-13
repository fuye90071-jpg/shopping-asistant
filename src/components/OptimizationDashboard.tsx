import React, { useState, useEffect } from 'react';
import {
  TrendingDown,
  Sparkles,
  CheckCircle2,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info,
  Clock,
  ChevronDown,
  ChevronUp,
  Receipt,
  FileCheck,
} from 'lucide-react';
import {
  OptimizationExecutionResult,
  OptimizationPlan,
  SingleOrderResult,
  Product,
} from '../types/shopping';
import { explainStrategyWithAI } from '../services/api';
import { ComparisonView } from './ComparisonView';

interface OptimizationDashboardProps {
  result: OptimizationExecutionResult;
  products: Product[];
  onOpenPaddingModal?: () => void;
}

export const OptimizationDashboard: React.FC<OptimizationDashboardProps> = ({
  result,
  products,
  onOpenPaddingModal,
}) => {
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0);
  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [isGeneratingAdvice, setIsGeneratingAdvice] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Record<number, boolean>>({
    0: true,
    1: true,
  });

  const activePlan: OptimizationPlan | undefined = result.plans[selectedPlanIndex];

  // Request AI explanation on active plan change
  useEffect(() => {
    if (!activePlan) return;
    let isCancelled = false;
    setIsGeneratingAdvice(true);

    explainStrategyWithAI(activePlan, products.length)
      .then((explanation) => {
        if (!isCancelled) {
          setAiAdvice(explanation);
          setIsGeneratingAdvice(false);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setAiAdvice(activePlan.explanation);
          setIsGeneratingAdvice(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [activePlan?.id]);

  if (!activePlan) return null;

  const toggleOrderExpand = (index: number) => {
    setExpandedOrders((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="space-y-6">
      {/* 1. First Screen Hero KPI Cards (Yellow-White Theme) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: 最低实付金额 */}
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white border border-amber-300 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-400/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-xs text-amber-800 font-semibold mb-1">
            <span>最低实付金额</span>
            <span className="p-1 rounded-md bg-amber-500/20 text-amber-800">
              <Zap className="w-3.5 h-3.5 fill-current" />
            </span>
          </div>
          <div className="text-3xl font-extrabold font-mono text-slate-900 tracking-tight mt-1">
            ¥{activePlan.finalPay.toFixed(2)}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center space-x-1">
            <span>清单原总额:</span>
            <span className="line-through text-slate-400 font-mono">
              ¥{activePlan.originalTotal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Card 2: 预计节省总额 */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white border border-emerald-300 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-400/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold mb-1">
            <span>预计节省总额</span>
            <span className="p-1 rounded-md bg-emerald-500/20 text-emerald-700">
              <TrendingDown className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-3xl font-extrabold font-mono text-emerald-600 tracking-tight mt-1">
            -¥{activePlan.totalDiscount.toFixed(2)}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            综合减免率:{' '}
            <strong className="text-emerald-700">
              {(100 - activePlan.discountRate * 100).toFixed(1)}% OFF
            </strong>
          </div>
        </div>

        {/* Card 3: 综合折扣与拆单 */}
        <div className="bg-white border border-amber-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>折算折扣 / 拆单数</span>
            <span className="p-1 rounded-md bg-amber-100 text-amber-800">
              <Package className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-3xl font-extrabold font-mono text-amber-600 tracking-tight mt-1">
            {(activePlan.discountRate * 10).toFixed(1)} 折
          </div>
          <div className="mt-2 text-xs text-slate-500">
            建议拆为{' '}
            <strong className="text-slate-900 font-semibold">
              {activePlan.orders.length} 个订单
            </strong>{' '}
            分批结算
          </div>
        </div>

        {/* Card 4: 算法质量与耗时指标 */}
        <div className="bg-white border border-amber-200/90 rounded-2xl p-5 shadow-xs text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-600 font-semibold">
            <span className="flex items-center gap-1 text-slate-700">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> 求解质量保证
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
              Gap ≤ {activePlan.optimalityGap}%
            </span>
          </div>
          <div className="text-slate-600 space-y-1 pt-1 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">算法引擎:</span>
              <span className="text-slate-800 font-medium truncate max-w-[130px]" title={result.algorithmUsed}>
                {result.algorithmUsed}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">求解耗时:</span>
              <span className="text-emerald-700 font-semibold">{result.calculationTimeMs} ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">搜索组合数:</span>
              <span className="text-slate-900 font-semibold">{result.evaluatedCombinationsCount} 组</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Comparison View with Recharts Bar Chart (Yellow-White Theme) */}
      <ComparisonView
        plans={result.plans}
        selectedPlanIndex={selectedPlanIndex}
        onSelectPlan={(idx) => setSelectedPlanIndex(idx)}
      />

      {/* 3. AI Strategy Advice & Plain Language Guidance */}
      <div className="bg-gradient-to-br from-amber-50/70 via-white to-amber-50/40 border border-amber-200/90 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-amber-800 font-semibold text-xs">
            <Sparkles className="w-4 h-4 text-amber-600 fill-current" />
            <span>AI 精算师实操解读与下单指南</span>
          </div>
          <span className="text-[11px] text-slate-400">
            {isGeneratingAdvice ? '智能分析生成中...' : '已结合当前规则与清单综合审定'}
          </span>
        </div>

        <div className="text-xs text-slate-700 leading-relaxed bg-white rounded-xl p-4 border border-amber-200/70 font-sans whitespace-pre-line shadow-2xs">
          {aiAdvice || activePlan.explanation}
        </div>

        {/* Padding hints trigger */}
        {activePlan.paddingTips && activePlan.paddingTips.length > 0 && (
          <div className="p-3 bg-amber-100/70 border border-amber-300 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-amber-900">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>凑单红利提醒：</strong>
                {activePlan.paddingTips[0].suggestedAction}
              </span>
            </div>
            {onOpenPaddingModal && (
              <button
                onClick={onOpenPaddingModal}
                className="px-3 py-1 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600 transition cursor-pointer shrink-0 ml-2 shadow-xs"
              >
                查看凑单微调
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. Multi-Order Breakdown & Coupon Deduction Waterfall */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-base text-slate-900">
              拆单执行清单与优惠扣减瀑布流 (共 {activePlan.orders.length} 批次)
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            请在手机淘宝/天猫购物车中按批次分别勾选结算
          </span>
        </div>

        {activePlan.orders.map((order, orderIdx) => {
          const isExpanded = expandedOrders[orderIdx] ?? true;
          return (
            <div
              key={order.orderIndex}
              className="bg-white border border-amber-200/80 rounded-2xl shadow-xs overflow-hidden"
            >
              {/* Order Header Summary */}
              <div
                onClick={() => toggleOrderExpand(orderIdx)}
                className="p-4 sm:p-5 bg-amber-50/50 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-amber-50/80 transition"
              >
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-lg bg-amber-500 text-white font-bold font-mono flex items-center justify-center text-sm shadow-xs">
                    #{order.orderIndex}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-slate-900">
                        订单批次 {order.orderIndex}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-amber-200 text-slate-700">
                        {order.products.length} 款商品
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      包含店铺: {Array.from(new Set(order.products.map((p) => p.product.shop))).join(', ')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <span className="text-xs text-slate-500">批次实付: </span>
                    <span className="text-base font-bold font-mono text-amber-600">
                      ¥{order.finalPay.toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-400 ml-2 line-through font-mono">
                      ¥{order.originalTotal.toFixed(2)}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-500" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 sm:p-5 space-y-5 border-t border-amber-100">
                  {/* Coupon Waterfall Badges */}
                  <div className="p-3.5 bg-amber-50/30 rounded-xl border border-amber-200/60 text-xs space-y-2">
                    <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-600" />
                      <span>本批次优惠叠加链路 (Waterfall):</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-1 rounded bg-white border border-slate-200 text-slate-700 font-mono">
                        原标价 ¥{order.originalTotal.toFixed(2)}
                      </span>
                      {order.shopCouponDiscount > 0 && (
                        <>
                          <span className="text-slate-400">→</span>
                          <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                            店铺券 -¥{order.shopCouponDiscount.toFixed(2)}
                          </span>
                        </>
                      )}
                      {order.categoryCouponDiscount > 0 && (
                        <>
                          <span className="text-slate-400">→</span>
                          <span className="px-2 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200 font-mono">
                            品类券 -¥{order.categoryCouponDiscount.toFixed(2)}
                          </span>
                        </>
                      )}
                      {order.crossShopDiscount > 0 && (
                        <>
                          <span className="text-slate-400">→</span>
                          <span className="px-2 py-1 rounded bg-amber-100 text-amber-900 border border-amber-300 font-mono font-medium">
                            跨店每满减 -¥{order.crossShopDiscount.toFixed(2)}
                          </span>
                        </>
                      )}
                      {order.platformCouponDiscount > 0 && (
                        <>
                          <span className="text-slate-400">→</span>
                          <span className="px-2 py-1 rounded bg-rose-50 text-rose-800 border border-rose-200 font-mono">
                            平台/88VIP消费券 -¥{order.platformCouponDiscount.toFixed(2)}
                          </span>
                        </>
                      )}
                      {order.redPacketDiscount > 0 && (
                        <>
                          <span className="text-slate-400">→</span>
                          <span className="px-2 py-1 rounded bg-red-50 text-red-800 border border-red-200 font-mono">
                            红包 -¥{order.redPacketDiscount.toFixed(2)}
                          </span>
                        </>
                      )}
                      <span className="text-slate-400">→</span>
                      <span className="px-2.5 py-1 rounded bg-amber-500 text-white font-bold font-mono shadow-2xs">
                        本单实付 ¥{order.finalPay.toFixed(2)}
                      </span>
                    </div>

                    {/* Applied Promotions Explanations */}
                    {order.appliedPromotions.length > 0 && (
                      <div className="pt-2 border-t border-amber-100 text-[11px] text-slate-500 space-y-1">
                        {order.appliedPromotions.map((p, i) => (
                          <div key={i} className="flex items-start space-x-2">
                            <span className="text-amber-600 font-bold">✓</span>
                            <span>
                              <strong className="text-slate-700">{p.promotionName}:</strong>{' '}
                              {p.explanation}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Items in this order */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-amber-100 text-slate-500 font-semibold bg-amber-50/30">
                          <th className="py-2.5 px-3">批次内商品</th>
                          <th className="py-2.5 px-3">店铺 / 类目</th>
                          <th className="py-2.5 px-3 text-right">标价小计</th>
                          <th className="py-2.5 px-3 text-right">分摊优惠</th>
                          <th className="py-2.5 px-3 text-right">实际到手价</th>
                          <th className="py-2.5 px-3 text-center">折扣率</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100/70">
                        {order.products.map((item, pIdx) => {
                          const rate =
                            item.subtotal > 0
                              ? ((item.finalPrice / item.subtotal) * 10).toFixed(1)
                              : '10.0';
                          return (
                            <tr key={pIdx} className="hover:bg-amber-50/40">
                              <td className="py-2.5 px-3 max-w-xs">
                                <div className="font-medium text-slate-900 truncate">
                                  {item.product.name}
                                </div>
                                <span className="text-[11px] text-slate-400">
                                  单价 ¥{item.product.price} × {item.quantity} 件
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">
                                <div className="truncate max-w-[120px]">
                                  {item.product.shop}
                                </div>
                                <span className="text-[10px] text-slate-400">
                                  {item.product.category}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                                ¥{item.subtotal.toFixed(2)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-emerald-600 font-semibold">
                                -¥{item.apportionedDiscount.toFixed(2)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-600">
                                ¥{item.finalPrice.toFixed(2)}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono text-xs text-amber-800 font-semibold">
                                {rate} 折
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
