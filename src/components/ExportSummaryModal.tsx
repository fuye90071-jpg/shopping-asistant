import React, { useState } from 'react';
import { X, Copy, Check, Share2, Download } from 'lucide-react';
import { OptimizationPlan } from '../types/shopping';

interface ExportSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: OptimizationPlan;
}

export const ExportSummaryModal: React.FC<ExportSummaryModalProps> = ({
  isOpen,
  onClose,
  plan,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const generateMarkdown = () => {
    let md = `# 【优惠计算助手】大促购物精算与拆单方案\n\n`;
    md += `方案类型: ${plan.title} (${plan.tag})\n`;
    md += `清单总标价: ¥${plan.originalTotal.toFixed(2)}\n`;
    md += `最终实付款: ¥${plan.finalPay.toFixed(2)}\n`;
    md += `累计节省金额: ¥${plan.totalDiscount.toFixed(2)} (${(
      (1 - plan.discountRate) *
      100
    ).toFixed(1)}% OFF)\n\n`;
    md += `## 拆单实操指南\n\n`;

    plan.orders.forEach((order) => {
      md += `### 订单批次 #${order.orderIndex} (实付: ¥${order.finalPay.toFixed(2)})\n`;
      md += `- 标价小计: ¥${order.originalTotal.toFixed(2)}\n`;
      md += `- 享受优惠: 店铺券-¥${order.shopCouponDiscount} | 品类券-¥${order.categoryCouponDiscount} | 跨店满减-¥${order.crossShopDiscount} | 消费券-¥${order.platformCouponDiscount} | 红包-¥${order.redPacketDiscount}\n`;
      md += `**商品清单:**\n`;
      order.products.forEach((p) => {
        md += `  * ${p.product.name} (¥${p.product.price} × ${p.quantity}) -> 到手价: ¥${p.finalPrice.toFixed(2)}\n`;
      });
      md += `\n`;
    });

    if (plan.paddingTips.length > 0) {
      md += `## 凑单建议\n`;
      plan.paddingTips.forEach((t) => {
        md += `- ${t.message}: ${t.suggestedAction}\n`;
      });
    }

    return md;
  };

  const mdText = generateMarkdown();

  const handleCopy = () => {
    navigator.clipboard.writeText(mdText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-amber-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-amber-100 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">导出购买方案与拆单清单</h3>
              <p className="text-xs text-slate-500">一键复制纯文本或 Markdown，便于微信发送或备忘</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-amber-100/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          <div className="relative">
            <textarea
              readOnly
              value={mdText}
              rows={14}
              className="w-full bg-amber-50/20 border border-amber-200 rounded-xl p-4 text-xs text-slate-800 font-mono resize-none focus:outline-none leading-relaxed"
            />
          </div>
        </div>

        <div className="p-4 border-t border-amber-100 bg-amber-50/30 flex justify-between items-center">
          <span className="text-xs text-slate-500">
            包含 {plan.orders.length} 个订单批次及分摊明细
          </span>
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 bg-slate-100 transition cursor-pointer"
            >
              关闭
            </button>
            <button
              onClick={handleCopy}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 transition flex items-center space-x-1.5 shadow-md shadow-amber-500/25 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>已复制到剪贴板！</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>一键复制方案文本</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
