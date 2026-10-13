import React, { useState } from 'react';
import {
  Tag,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { Promotion, PromotionType } from '../types/shopping';
import { parsePromotionsWithAI } from '../services/api';

interface RuleManagerProps {
  promotions: Promotion[];
  onAddPromotion: (promo: Promotion) => void;
  onUpdatePromotion: (id: string, updates: Partial<Promotion>) => void;
  onRemovePromotion: (id: string) => void;
  onBatchSetPromotions: (promos: Promotion[]) => void;
}

export const RuleManager: React.FC<RuleManagerProps> = ({
  promotions,
  onAddPromotion,
  onUpdatePromotion,
  onRemovePromotion,
  onBatchSetPromotions,
}) => {
  const [naturalText, setNaturalText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // New promo form state
  const [name, setName] = useState('');
  const [type, setType] = useState<PromotionType>('CROSS_SHOP_FULL_REDUCTION');
  const [threshold, setThreshold] = useState<number | ''>(300);
  const [discount, setDiscount] = useState<number | ''>(50);
  const [isTiered, setIsTiered] = useState(true);
  const [targetShop, setTargetShop] = useState('');
  const [targetCategory, setTargetCategory] = useState('');

  const handleAIParse = async () => {
    if (!naturalText.trim()) return;
    setIsParsing(true);
    try {
      const result = await parsePromotionsWithAI(naturalText);
      if (result.promotions.length > 0) {
        onBatchSetPromotions([...promotions, ...result.promotions]);
        setNaturalText('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsParsing(false);
    }
  };

  const handleCreatePromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || discount === '' || Number(discount) <= 0) return;

    const newPromo: Promotion = {
      id: `promo-manual-${Date.now()}`,
      name: name.trim(),
      type,
      threshold: threshold === '' ? 0 : Number(threshold),
      discount: Number(discount),
      isTiered: type === 'CROSS_SHOP_FULL_REDUCTION' ? isTiered : false,
      targetShop: targetShop.trim() || undefined,
      targetCategory: targetCategory.trim() || undefined,
      enabled: true,
    };

    onAddPromotion(newPromo);
    setName('');
    setShowAddModal(false);
  };

  const handleQuickTemplate = (templateText: string) => {
    setNaturalText(templateText);
  };

  const getTypeBadge = (pType: PromotionType) => {
    switch (pType) {
      case 'CROSS_SHOP_FULL_REDUCTION':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            跨店每满减
          </span>
        );
      case 'PLATFORM_COUPON':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
            平台/88VIP券
          </span>
        );
      case 'CATEGORY_COUPON':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
            品类专享券
          </span>
        );
      case 'SHOP_COUPON':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            店铺优惠券
          </span>
        );
      case 'OFFICIAL_DISCOUNT':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
            官方立减
          </span>
        );
      case 'RED_PACKET':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-800 border border-red-200">
            现金红包
          </span>
        );
    }
  };

  return (
    <div className="bg-white border border-amber-200/80 rounded-2xl shadow-xs overflow-hidden flex flex-col space-y-4 p-4 sm:p-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-100 pb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">大促优惠规则配置</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                {promotions.filter((p) => p.enabled).length} / {promotions.length} 启用
              </span>
            </div>
            <p className="text-xs text-slate-500">
              支持自然语言 AI 智能提炼为结构化 Schema，遵循电商严格抵扣层级
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-amber-50 text-slate-700 border border-amber-200 transition cursor-pointer self-start sm:self-auto shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5 text-amber-600" />
          <span>手动新建规则</span>
        </button>
      </div>

      {/* AI Natural Language Box */}
      <div className="p-4 bg-gradient-to-br from-amber-50/70 via-yellow-50/30 to-white border border-amber-300 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-amber-900">
            <Sparkles className="w-4 h-4 text-amber-600 fill-current animate-pulse" />
            <span>AI 自然语言优惠规则解析器</span>
          </div>
          <span className="text-[11px] text-slate-400">
            Powered by Gemini 3.8 Flash
          </span>
        </div>

        <div className="relative">
          <textarea
            value={naturalText}
            onChange={(e) => setNaturalText(e.target.value)}
            rows={2}
            placeholder="粘贴促销文案，例如：“跨店每满300减50，索尼旗舰店满1000减120，大家电满3000减300，88VIP满5000减400，还有50元无门槛红包”"
            className="w-full bg-white border border-amber-200 rounded-lg p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-400 resize-none font-sans"
          />
        </div>

        {/* Quick prompt templates */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 text-[11px]">快捷填入:</span>
            <button
              type="button"
              onClick={() =>
                handleQuickTemplate(
                  '天猫跨店每满300减50，88VIP大额消费券满5000减400，大家电超级品类券满3000减300，海尔官方旗舰店满3000减200，30元无门槛红包'
                )
              }
              className="px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200/80 text-amber-900 text-[11px] border border-amber-200 cursor-pointer"
            >
              双11高额家电套包
            </button>
            <button
              type="button"
              onClick={() =>
                handleQuickTemplate(
                  '跨店每满300减50，母婴用品专享满800减80，爱他美官方旗舰店满1200减100，20元限时红包'
                )
              }
              className="px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200/80 text-amber-900 text-[11px] border border-amber-200 cursor-pointer"
            >
              母婴日化满减套包
            </button>
          </div>

          <button
            onClick={handleAIParse}
            disabled={!naturalText.trim() || isParsing}
            className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-md shadow-amber-500/25 transition cursor-pointer"
          >
            {isParsing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>AI解析中...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI 结构化解析并导入</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Rules Table */}
      <div className="border border-amber-200/80 rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-amber-100 bg-amber-50/50 text-slate-600 font-semibold">
              <th className="py-2.5 px-4">规则名称</th>
              <th className="py-2.5 px-4">规则类型</th>
              <th className="py-2.5 px-4">门槛与减免</th>
              <th className="py-2.5 px-4">限定范围 (店铺/品类)</th>
              <th className="py-2.5 px-4 text-center">状态</th>
              <th className="py-2.5 px-4 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-100/70">
            {promotions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  暂无优惠规则，请点击上方快速解析或手动添加
                </td>
              </tr>
            ) : (
              promotions.map((p) => (
                <tr
                  key={p.id}
                  className={`hover:bg-amber-50/40 transition-colors ${
                    !p.enabled ? 'opacity-40' : 'text-slate-800'
                  }`}
                >
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {p.name}
                    {p.notes && (
                      <span className="block text-[11px] text-slate-400 font-normal">{p.notes}</span>
                    )}
                  </td>
                  <td className="py-3 px-4">{getTypeBadge(p.type)}</td>
                  <td className="py-3 px-4 font-mono">
                    {p.type === 'RED_PACKET' ? (
                      <span className="text-rose-600 font-bold">直减 ¥{p.discount}</span>
                    ) : p.type === 'OFFICIAL_DISCOUNT' && p.discountRate ? (
                      <span className="text-purple-700 font-bold">
                        {(p.discountRate * 10).toFixed(1)}折
                      </span>
                    ) : (
                      <span>
                        {p.isTiered ? '每满' : '满'}{' '}
                        <strong className="text-amber-800">¥{p.threshold}</strong> 减{' '}
                        <strong className="text-emerald-600">¥{p.discount}</strong>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {p.targetShop ? (
                      <span className="text-slate-800 font-medium">店铺: {p.targetShop}</span>
                    ) : p.targetCategory ? (
                      <span className="text-slate-800 font-medium">类目: {p.targetCategory}</span>
                    ) : (
                      <span>全平台通用</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => onUpdatePromotion(p.id, { enabled: !p.enabled })}
                      className="cursor-pointer text-slate-400 hover:text-slate-700 transition"
                      title={p.enabled ? '点击禁用' : '点击启用'}
                    >
                      {p.enabled ? (
                        <ToggleRight className="w-6 h-6 text-amber-500 inline" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-slate-300 inline" />
                      )}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => onRemovePromotion(p.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 transition cursor-pointer"
                      title="删除规则"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Manual Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-amber-200 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">手动新建优惠规则</h3>
            <form onSubmit={handleCreatePromo} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">规则名称 *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="如：88VIP专享消费券 (满5000减400)"
                  className="w-full bg-amber-50/30 border border-amber-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">规则类型</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as PromotionType)}
                    className="w-full bg-amber-50/30 border border-amber-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-amber-400"
                  >
                    <option value="CROSS_SHOP_FULL_REDUCTION">跨店每满减</option>
                    <option value="PLATFORM_COUPON">平台消费券 / 88VIP</option>
                    <option value="CATEGORY_COUPON">品类专享券</option>
                    <option value="SHOP_COUPON">店铺券</option>
                    <option value="RED_PACKET">现金红包</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">循环每满</label>
                  <select
                    value={isTiered ? 'true' : 'false'}
                    onChange={(e) => setIsTiered(e.target.value === 'true')}
                    className="w-full bg-amber-50/30 border border-amber-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-amber-400"
                  >
                    <option value="true">是 (每满即减)</option>
                    <option value="false">否 (单笔满减)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">门槛金额 (元)</label>
                  <input
                    type="number"
                    min="0"
                    value={threshold}
                    onChange={(e) =>
                      setThreshold(e.target.value === '' ? '' : parseFloat(e.target.value))
                    }
                    className="w-full bg-amber-50/30 border border-amber-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">减免金额 (元) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={discount}
                    onChange={(e) =>
                      setDiscount(e.target.value === '' ? '' : parseFloat(e.target.value))
                    }
                    className="w-full bg-amber-50/30 border border-amber-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">限定店铺 (选填)</label>
                <input
                  type="text"
                  value={targetShop}
                  onChange={(e) => setTargetShop(e.target.value)}
                  placeholder="留空为全店铺通用"
                  className="w-full bg-amber-50/30 border border-amber-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">限定品类 (选填)</label>
                <input
                  type="text"
                  value={targetCategory}
                  onChange={(e) => setTargetCategory(e.target.value)}
                  placeholder="留空为全品类通用，如：大家电、母婴用品"
                  className="w-full bg-amber-50/30 border border-amber-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 cursor-pointer shadow-xs"
                >
                  确认添加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
