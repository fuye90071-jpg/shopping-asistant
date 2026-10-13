import React, { useState } from 'react';
import {
  X,
  Plus,
  Upload,
  CheckCircle2,
  Sparkles,
  Loader2,
  AlertTriangle,
  Trash2,
  ArrowLeft,
  Check,
  ShoppingBag,
} from 'lucide-react';
import { Product, ProductPriority } from '../types/shopping';
import { parseRawProducts } from '../services/api';

interface ProductInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProducts: (newProducts: Product[]) => void;
}

export const ProductInputModal: React.FC<ProductInputModalProps> = ({
  isOpen,
  onClose,
  onAddProducts,
}) => {
  const [activeTab, setActiveTab] = useState<'batch' | 'single'>('batch');
  const [batchText, setBatchText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedPreviewItems, setParsedPreviewItems] = useState<Product[] | null>(null);

  // Single product form state
  const [name, setName] = useState('');
  const [shop, setShop] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [category, setCategory] = useState('大家电');
  const [quantity, setQuantity] = useState(1);
  const [priority, setPriority] = useState<ProductPriority>('must');
  const [participatesCrossShop, setParticipatesCrossShop] = useState(true);
  const [previewError, setPreviewError] = useState('');

  if (!isOpen) return null;

  const handleStartParse = async () => {
    if (!batchText.trim()) return;
    setIsParsing(true);
    try {
      const results = await parseRawProducts(batchText);
      if (results && results.length > 0) {
        setParsedPreviewItems(results);
      } else {
        // Fallback default item
        setParsedPreviewItems([
          {
            id: `prod-${Date.now()}`,
            platform: 'tmall',
            name: '待命名商品',
            shop: '天猫旗舰店',
            category: '生活日用',
            price: 99,
            quantity: 1,
            priority: 'must',
            participatesCrossShop: true,
            url: batchText.match(/https?:\/\/[^\s]+/)?.[0] || '',
          },
        ]);
      }
    } catch {
      // Fallback
    } finally {
      setIsParsing(false);
    }
  };

  const handleUpdatePreviewItem = (index: number, updates: Partial<Product>) => {
    setPreviewError('');
    if (!parsedPreviewItems) return;
    setParsedPreviewItems((prev) =>
      prev ? prev.map((item, i) => (i === index ? { ...item, ...updates } : item)) : null
    );
  };

  const handleRemovePreviewItem = (index: number) => {
    if (!parsedPreviewItems) return;
    setParsedPreviewItems((prev) => (prev ? prev.filter((_, i) => i !== index) : null));
  };

  const handleConfirmImport = () => {
    if (!parsedPreviewItems || parsedPreviewItems.length === 0) return;
    // Check if any item lacks a name or has invalid price
    const invalidIndex = parsedPreviewItems.findIndex(
      (p) => !p.name.trim() || p.price <= 0
    );
    if (invalidIndex !== -1) {
      setPreviewError(
        `第 ${invalidIndex + 1} 件商品尚未填写完整的名称或标价（标价需大于0元），请补充后导入。`
      );
      return;
    }

    onAddProducts(parsedPreviewItems);
    setParsedPreviewItems(null);
    setBatchText('');
    setPreviewError('');
    onClose();
  };

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price || Number(price) <= 0) return;

    const newProd: Product = {
      id: `prod-${Date.now()}`,
      platform: 'tmall',
      name: name.trim(),
      shop: shop.trim() || '天猫优质店铺',
      category: category.trim() || '综合',
      price: Number(price),
      quantity: quantity || 1,
      priority,
      participatesCrossShop,
    };

    onAddProducts([newProd]);
    setName('');
    setPrice('');
    setShop('');
    onClose();
  };

  const loadExampleBatch = (type: 'rich' | 'taopass' | 'urls' = 'rich') => {
    if (type === 'rich') {
      setBatchText(
        `【淘宝】https://detail.tmall.com/item.htm?id=6821 索尼 75英寸 4K超高清游戏电视 【在售价】6499.00元 索尼官方旗舰店 大家电
【淘宝】https://detail.tmall.com/item.htm?id=7922 海尔 501升十字双开门冰箱 【券后价】3699.00元 海尔官方旗舰店 大家电
【淘宝】https://detail.tmall.com/item.htm?id=3812 小天鹅 10公斤滚筒洗烘一体机 4999元 小天鹅官方旗舰店 大家电
【淘宝】https://detail.tmall.com/item.htm?id=9921 石头 P10S Pro 扫拖一体机器人 ¥3299 石头官方旗舰店 生活电器
【淘宝】https://detail.tmall.com/item.htm?id=7724 洁柔 4层加厚抽纸24包 ¥49.9 洁柔官方旗舰店 生活日用`
      );
    } else if (type === 'taopass') {
      setBatchText(
        `【淘宝】79￥ CZ0001 2:/✔7kM8Wq2qQ3s✔ https://m.tb.cn/h.5t1AbCd?tk=7kM8Wq2qQ3s 「海尔501升十字双开门冰箱家用风冷无霜一级能效超薄大容量电冰箱」 3699元 海尔官方旗舰店
【淘宝】48￥ CZ3457 2:/✔aBcDeFg✔ https://detail.tmall.com/item.htm?id=6821 「索尼 75英寸 4K超高清游戏电视」【标价】6499元 索尼官方旗舰店
【淘宝】https://detail.tmall.com/item.htm?id=9921 「石头 P10S Pro 扫拖一体机器人」 3299元 石头官方旗舰店`
      );
    } else {
      setBatchText(
        `https://detail.tmall.com/item.htm?id=6821
https://detail.tmall.com/item.htm?id=7922
https://detail.tmall.com/item.htm?id=3812
https://detail.tmall.com/item.htm?id=9921`
      );
    }
  };

  const previewSubtotal = parsedPreviewItems
    ? parsedPreviewItems.reduce((sum, p) => sum + p.price * p.quantity, 0)
    : 0;

  // Preset chips for quick name & category fill
  const QUICK_NAME_CHIPS = [
    { label: '📺 75吋4K电视', name: '索尼 75英寸 4K超高清游戏电视', cat: '大家电', price: 6499 },
    { label: '🧊 双开门冰箱', name: '海尔 501升十字双开门冰箱', cat: '大家电', price: 3699 },
    { label: '🧺 洗烘一体机', name: '小天鹅 10公斤滚筒洗烘一体机', cat: '大家电', price: 4999 },
    { label: '🤖 扫拖机器人', name: '石头 P10S Pro 扫拖一体机器人', cat: '生活电器', price: 3299 },
    { label: '📱 智能手机', name: '华为 Mate 60 Pro 512GB', cat: '智能数码', price: 6999 },
    { label: '🎧 降噪耳机', name: '索尼 WH-1000XM5 无线降噪耳机', cat: '智能数码', price: 1999 },
    { label: '🧻 抽纸24包', name: '洁柔 4层加厚抽纸 24包', cat: '生活日用', price: 49.9 },
    { label: '🍼 婴儿纸尿裤', name: '好奇 皇家御裤婴儿拉拉裤 L码', cat: '母婴用品', price: 149 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-amber-200 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-amber-100 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {parsedPreviewItems ? '商品解析核对与导入' : '添加 / 批量导入大促商品'}
              </h3>
              <p className="text-xs text-slate-500">
                {parsedPreviewItems
                  ? '已提取商品信息，请在下方确认或微调名称与标价后一键导入'
                  : '支持淘宝/天猫分享链接、淘口令或批量文字'}
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

        {/* Tab switch (only if not in preview) */}
        {!parsedPreviewItems && (
          <div className="flex border-b border-amber-100 bg-white px-6 pt-3">
            <button
              onClick={() => setActiveTab('batch')}
              className={`pb-3 px-4 text-xs font-semibold border-b-2 transition cursor-pointer ${
                activeTab === 'batch'
                  ? 'border-amber-500 text-amber-700'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              智能链接 / 批量粘贴解析 (推荐)
            </button>
            <button
              onClick={() => setActiveTab('single')}
              className={`pb-3 px-4 text-xs font-semibold border-b-2 transition cursor-pointer ${
                activeTab === 'single'
                  ? 'border-amber-500 text-amber-700'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              单件精细录入
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {parsedPreviewItems ? (
            /* STEP 2: Parsed Preview and Confirmation Table */
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-amber-600" />
                  已识别出 <strong>{parsedPreviewItems.length}</strong> 件商品。标价和名称均可在此直接点击修改！
                </span>
                <button
                  type="button"
                  onClick={() => setParsedPreviewItems(null)}
                  className="text-slate-500 hover:text-slate-800 underline flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> 重新粘贴
                </button>
              </div>

              {previewError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{previewError}</span>
                </div>
              )}

              <div className="space-y-3">
                {parsedPreviewItems.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-4 rounded-xl border border-amber-200/90 bg-amber-50/20 space-y-3 shadow-2xs hover:border-amber-300 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                            <span>商品名称</span>
                            {item.itemId && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
                                宝贝ID: {item.itemId}
                              </span>
                            )}
                            {(!item.name || item.name.includes('待填写')) && (
                              <span className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded font-medium">
                                请输入真实品名
                              </span>
                            )}
                          </label>
                        </div>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdatePreviewItem(idx, { name: e.target.value })}
                          placeholder="请输入商品名称，如：海尔 501升十字双开门冰箱"
                          className={`w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none transition ${
                            !item.name
                              ? 'border-rose-400 bg-rose-50/20 ring-1 ring-rose-300'
                              : 'border-amber-200 focus:border-amber-400'
                          }`}
                        />

                        {/* Quick Name / Category fill chips when name is missing or for convenience */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          <span className="text-[10px] text-slate-400">快捷预设:</span>
                          {QUICK_NAME_CHIPS.map((chip) => (
                            <button
                              key={chip.label}
                              type="button"
                              onClick={() =>
                                handleUpdatePreviewItem(idx, {
                                  name: chip.name,
                                  category: chip.cat,
                                  price: item.price > 0 ? item.price : chip.price,
                                })
                              }
                              className="text-[10px] px-2 py-0.5 bg-white border border-amber-200 rounded-md text-slate-600 hover:text-amber-800 hover:bg-amber-50 hover:border-amber-300 transition cursor-pointer"
                            >
                              {chip.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemovePreviewItem(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 mt-2 transition cursor-pointer"
                        title="移除此项"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                          标价 (元) *
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-amber-700">
                            ¥
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0.1"
                            value={item.price > 0 ? item.price : ''}
                            placeholder="如 3699"
                            onChange={(e) =>
                              handleUpdatePreviewItem(idx, {
                                price: parseFloat(e.target.value) || 0,
                              })
                            }
                            className={`w-full bg-white border rounded-lg pl-6 pr-2 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none transition ${
                              item.price <= 0
                                ? 'border-rose-400 bg-rose-50/20 ring-1 ring-rose-300'
                                : 'border-amber-200 focus:border-amber-400'
                            }`}
                          />
                        </div>
                        {/* Quick price chips */}
                        {item.price <= 0 && (
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {[49.9, 299, 999, 3699, 6499].map((pVal) => (
                              <button
                                key={pVal}
                                type="button"
                                onClick={() => handleUpdatePreviewItem(idx, { price: pVal })}
                                className="text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-mono hover:bg-amber-200 cursor-pointer"
                              >
                                ¥{pVal}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                          购买数量
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdatePreviewItem(idx, {
                              quantity: Math.max(1, parseInt(e.target.value, 10) || 1),
                            })
                          }
                          className="w-full bg-white border border-amber-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                          店铺名称
                        </label>
                        <input
                          type="text"
                          value={item.shop}
                          onChange={(e) => handleUpdatePreviewItem(idx, { shop: e.target.value })}
                          placeholder="店铺名"
                          className="w-full bg-white border border-amber-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                          所属类目
                        </label>
                        <select
                          value={item.category}
                          onChange={(e) =>
                            handleUpdatePreviewItem(idx, { category: e.target.value })
                          }
                          className="w-full bg-white border border-amber-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-400"
                        >
                          <option value="大家电">大家电</option>
                          <option value="生活电器">生活电器</option>
                          <option value="厨卫大电">厨卫大电</option>
                          <option value="智能数码">智能数码</option>
                          <option value="数码配件">数码配件</option>
                          <option value="母婴用品">母婴用品</option>
                          <option value="日化家清">日化家清</option>
                          <option value="家居家装">家居家装</option>
                          <option value="美妆个护">美妆个护</option>
                          <option value="生活日用">生活日用</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-amber-100 text-[11px] text-slate-500">
                      <div className="flex items-center space-x-3">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.participatesCrossShop}
                            onChange={(e) =>
                              handleUpdatePreviewItem(idx, {
                                participatesCrossShop: e.target.checked,
                              })
                            }
                            className="rounded bg-white border-amber-300 text-amber-500 focus:ring-amber-400 w-3.5 h-3.5"
                          />
                          <span className="ml-1.5 text-slate-700">参与跨店每满减</span>
                        </label>
                      </div>
                      <div className="text-right">
                        <span>标价小计: </span>
                        <span className="font-mono font-bold text-amber-700">
                          ¥{(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Confirm toolbar */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-700">
                  <span>总计商品: </span>
                  <strong className="text-slate-900">{parsedPreviewItems.length}</strong> 款 /{' '}
                  <strong className="text-slate-900">
                    {parsedPreviewItems.reduce((s, p) => s + p.quantity, 0)}
                  </strong>{' '}
                  件， 标价总计:{' '}
                  <strong className="text-amber-700 font-mono text-sm">
                    ¥{previewSubtotal.toFixed(2)}
                  </strong>
                </div>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setParsedPreviewItems(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-amber-200 hover:bg-amber-50 transition cursor-pointer"
                  >
                    返回修改
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 transition flex items-center space-x-1.5 shadow-md shadow-amber-500/25 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>确认加入清单并计算</span>
                  </button>
                </div>
              </div>
            </div>
          ) : activeTab === 'batch' ? (
            /* STEP 1: Textarea paste */
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                <span className="text-slate-600">
                  支持直接粘贴手机淘宝/天猫分享文案、淘口令或商品链接：
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">快速填入示例:</span>
                  <button
                    type="button"
                    onClick={() => loadExampleBatch('rich')}
                    className="text-amber-800 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer"
                  >
                    标准文案
                  </button>
                  <button
                    type="button"
                    onClick={() => loadExampleBatch('taopass')}
                    className="text-amber-800 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer"
                  >
                    淘口令文案
                  </button>
                  <button
                    type="button"
                    onClick={() => loadExampleBatch('urls')}
                    className="text-amber-800 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer"
                  >
                    纯商品链接
                  </button>
                </div>
              </div>

              <textarea
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                rows={7}
                placeholder="支持以下任一格式（支持多行批量输入）：
1. 完整淘宝/天猫链接：https://item.taobao.com/item.htm?id=6821 索尼 75英寸电视 6499元
2. 手机淘口令文案：【淘宝】CZ0001 「海尔501升双开门冰箱」3699元 海尔官方旗舰店
3. 分享卡片文案：【在售价】1899.00元 索尼WH-1000XM5耳机 https://m.tb.cn/h.xxx
4. 纯网址：https://detail.tmall.com/item.htm?id=7922 (可在下一步快捷补充名称)"
                className="w-full bg-amber-50/20 border border-amber-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-400 font-mono resize-none leading-relaxed"
              />

              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-amber-900">💡 智能解析提示：</p>
                <p>• 系统已深度优化商品名称与标价识别算法，准确剥离淘口令代码与商品ID，提取真实商品名称与标价。</p>
                <p>• 若粘贴的是无标注文案的纯网址，系统将自动识别对应商品ID，并在下一步提供快捷品类标签，一键即可补充名称与标价。</p>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={!batchText.trim() || isParsing}
                  onClick={handleStartParse}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 transition flex items-center space-x-1.5 shadow-md shadow-amber-500/25 cursor-pointer"
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>正在识别链接与商品...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>智能识别并核对商品</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Single entry form */
            <form onSubmit={handleSingleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    商品名称 *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="如：索尼 75英寸 4K超高清电视"
                    className="w-full bg-amber-50/20 border border-amber-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">店铺名称</label>
                  <input
                    type="text"
                    value={shop}
                    onChange={(e) => setShop(e.target.value)}
                    placeholder="如：索尼官方旗舰店"
                    className="w-full bg-amber-50/20 border border-amber-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">所属类目</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-amber-50/20 border border-amber-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-400"
                  >
                    <option value="大家电">大家电</option>
                    <option value="生活电器">生活电器</option>
                    <option value="厨卫大电">厨卫大电</option>
                    <option value="智能数码">智能数码</option>
                    <option value="数码配件">数码配件</option>
                    <option value="母婴用品">母婴用品</option>
                    <option value="日化家清">日化家清</option>
                    <option value="家居家装">家居家装</option>
                    <option value="美妆个护">美妆个护</option>
                    <option value="生活日用">生活日用</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    标价 (元) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    required
                    value={price}
                    onChange={(e) =>
                      setPrice(e.target.value === '' ? '' : parseFloat(e.target.value))
                    }
                    placeholder="如：6499"
                    className="w-full bg-amber-50/20 border border-amber-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">购买数量</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full bg-amber-50/20 border border-amber-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    购买意愿优先级
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as ProductPriority)}
                    className="w-full bg-amber-50/20 border border-amber-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-400"
                  >
                    <option value="must">必须购买 (核心大件)</option>
                    <option value="prefer">优先购买 (主要商品)</option>
                    <option value="flexible">凑单/弹性备选 (供凑满减)</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={participatesCrossShop}
                      onChange={(e) => setParticipatesCrossShop(e.target.checked)}
                      className="rounded bg-white border-amber-300 text-amber-500 focus:ring-amber-400 w-4 h-4"
                    />
                    <span className="ml-2 text-xs text-slate-700 font-medium">参与平台跨店每满减</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-amber-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 transition flex items-center space-x-1.5 shadow-md shadow-amber-500/25 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>添加至清单</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
