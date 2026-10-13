import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { OptimizationPlan } from '../types/shopping';
import { BarChart3, TrendingDown, ArrowRight, CheckCircle2, Zap, Layers } from 'lucide-react';

interface ComparisonViewProps {
  plans: OptimizationPlan[];
  selectedPlanIndex: number;
  onSelectPlan: (index: number) => void;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const finalPay = payload.find((p) => p.dataKey === 'finalPay')?.value || 0;
    const discount = payload.find((p) => p.dataKey === 'totalDiscount')?.value || 0;
    const original = finalPay + discount;
    const rate = original > 0 ? ((finalPay / original) * 10).toFixed(1) : '10.0';

    return (
      <div className="bg-white border border-amber-200/90 p-3.5 rounded-xl shadow-xl text-xs space-y-1.5 min-w-[200px]">
        <div className="font-bold text-slate-900 border-b border-amber-100 pb-1.5 flex items-center justify-between">
          <span>{label}</span>
          <span className="text-amber-700 font-mono font-bold">{rate} 折</span>
        </div>
        <div className="flex justify-between items-center text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block"></span>
            最终实付:
          </span>
          <span className="font-mono font-bold text-slate-900">¥{Number(finalPay).toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"></span>
            优惠节省:
          </span>
          <span className="font-mono font-bold text-emerald-600">-¥{Number(discount).toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-amber-100 text-[11px]">
          <span>原始标价:</span>
          <span className="font-mono">¥{Number(original).toFixed(2)}</span>
        </div>
      </div>
    );
  }
  return null;
};

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  plans,
  selectedPlanIndex,
  onSelectPlan,
}) => {
  const [chartMode, setChartMode] = useState<'grouped' | 'stacked'>('grouped');

  if (!plans || plans.length === 0) return null;

  // Transform plans into recharts data
  const chartData = plans.map((plan, index) => {
    const shortName = plan.title.replace('方案一：', '').replace('方案二：', '').replace('方案三：', '');
    return {
      name: shortName,
      fullTitle: plan.title,
      tag: plan.tag,
      index,
      finalPay: plan.finalPay,
      totalDiscount: plan.totalDiscount,
      originalTotal: plan.originalTotal,
      ordersCount: plan.orders.length,
      discountRate: plan.discountRate,
    };
  });

  return (
    <div className="bg-white border border-amber-200/80 rounded-2xl shadow-xs overflow-hidden p-4 sm:p-6 space-y-6">
      {/* Header & Chart Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-100 pb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">方案横向精算对比 (Comparison View)</h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                Recharts 可视化
              </span>
            </div>
            <p className="text-xs text-slate-500">
              直观对比不同拆单与合并策略下的【实付金额】与【优惠节省】，点击图表柱状或卡片可直接切换
            </p>
          </div>
        </div>

        {/* Chart View Toggle (Grouped vs Stacked) */}
        <div className="flex items-center bg-amber-50 rounded-xl p-1 border border-amber-200/80 text-xs self-start sm:self-auto">
          <button
            onClick={() => setChartMode('grouped')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              chartMode === 'grouped'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            并列对比 (Grouped)
          </button>
          <button
            onClick={() => setChartMode('stacked')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              chartMode === 'stacked'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            堆叠占比 (Stacked)
          </button>
        </div>
      </div>

      {/* Recharts Bar Chart Container */}
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
            onClick={(state) => {
              if (state && typeof state.activeTooltipIndex === 'number') {
                onSelectPlan(state.activeTooltipIndex);
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              tickFormatter={(value) => `¥${value}`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(245, 158, 11, 0.05)' }} />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
              formatter={(value) => {
                if (value === 'finalPay') return <span className="text-slate-700 font-medium">最终实付金额</span>;
                if (value === 'totalDiscount') return <span className="text-slate-700 font-medium">优惠节省总额</span>;
                return value;
              }}
            />
            <Bar
              dataKey="finalPay"
              name="finalPay"
              stackId={chartMode === 'stacked' ? 'a' : undefined}
              fill="#f59e0b"
              radius={chartMode === 'stacked' ? [0, 0, 0, 0] : [6, 6, 0, 0]}
              cursor="pointer"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-pay-${index}`}
                  fill={selectedPlanIndex === index ? '#d97706' : '#f59e0b'}
                  opacity={selectedPlanIndex === index ? 1 : 0.8}
                  stroke={selectedPlanIndex === index ? '#b45309' : undefined}
                  strokeWidth={selectedPlanIndex === index ? 2 : 0}
                />
              ))}
            </Bar>
            <Bar
              dataKey="totalDiscount"
              name="totalDiscount"
              stackId={chartMode === 'stacked' ? 'a' : undefined}
              fill="#10b981"
              radius={[6, 6, 0, 0]}
              cursor="pointer"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-disc-${index}`}
                  fill={selectedPlanIndex === index ? '#059669' : '#10b981'}
                  opacity={selectedPlanIndex === index ? 1 : 0.8}
                  stroke={selectedPlanIndex === index ? '#047857' : undefined}
                  strokeWidth={selectedPlanIndex === index ? 2 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Comparative Cards with Direct Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
        {plans.map((plan, idx) => {
          const isSelected = selectedPlanIndex === idx;
          return (
            <div
              key={plan.id}
              onClick={() => onSelectPlan(idx)}
              className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                isSelected
                  ? 'bg-amber-50/80 border-amber-400 shadow-sm ring-1 ring-amber-400/50'
                  : 'bg-white border-amber-200/60 hover:border-amber-300 hover:bg-amber-50/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded ${
                    isSelected
                      ? 'bg-amber-500 text-white'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {plan.tag}
                </span>
                {isSelected && (
                  <span className="flex items-center text-xs font-semibold text-amber-700 gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" /> 当前选定
                  </span>
                )}
              </div>

              <div className="font-bold text-sm text-slate-900 mb-2">{plan.title}</div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center text-slate-500">
                  <span>最终实付:</span>
                  <span className="font-mono font-bold text-base text-slate-900">
                    ¥{plan.finalPay.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>节省金额:</span>
                  <span className="font-mono font-bold text-emerald-600">
                    -¥{plan.totalDiscount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>实付折扣:</span>
                  <span className="font-mono text-amber-700 font-bold">
                    {(plan.discountRate * 10).toFixed(1)} 折
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>拆单数量:</span>
                  <span className="text-slate-800 font-medium">{plan.orders.length} 批次下单</span>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-amber-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>{idx === 0 ? '理论最低支付' : idx === 1 ? '一键付款无拆单' : '适度加购再省'}</span>
                <span className="text-amber-700 font-semibold flex items-center gap-0.5">
                  查看详情 <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
