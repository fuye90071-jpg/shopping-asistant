import React, { useState } from 'react';
import {
  Trash2,
  Plus,
  Minus,
  Search,
  Filter,
  Check,
  Tag,
  Store,
  Layers,
  ArrowUpDown,
  Edit3,
} from 'lucide-react';
import { Product, ProductPriority } from '../types/shopping';

interface ProductListTableProps {
  products: Product[];
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
  onRemoveProduct: (id: string) => void;
  onOpenAddModal: () => void;
}

export const ProductListTable: React.FC<ProductListTableProps> = ({
  products,
  onUpdateProduct,
  onRemoveProduct,
  onOpenAddModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'priceDesc' | 'priceAsc' | 'default'>('default');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'name' | 'price'>('name');

  // Available categories in current list
  const categories = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);

  // Filter & Search
  let filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.shop.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPrio = priorityFilter === 'all' || p.priority === priorityFilter;
    const matchesCat = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesPrio && matchesCat;
  });

  if (sortBy === 'priceDesc') {
    filtered.sort((a, b) => b.price * b.quantity - a.price * a.quantity);
  } else if (sortBy === 'priceAsc') {
    filtered.sort((a, b) => a.price * a.quantity - b.price * b.quantity);
  }

  const mustCount = products.filter((p) => p.priority === 'must').length;
  const flexCount = products.filter((p) => p.priority === 'flexible').length;
  const crossCount = products.filter((p) => p.participatesCrossShop).length;
  const totalSubtotal = products.reduce((sum, p) => sum + p.price * p.quantity, 0);

  return (
    <div className="bg-white border border-amber-200/80 rounded-2xl shadow-xs overflow-hidden flex flex-col">
      {/* Table Header Controls */}
      <div className="p-4 sm:p-5 border-b border-amber-100 bg-amber-50/40 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">大促商品清单核对</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                {products.length} 款
              </span>
            </div>
            <p className="text-xs text-slate-500">
              确认单价与数量，标注【必买 / 优先 / 凑单备选】，供优化引擎精密规划
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>添加商品</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="px-4 py-3 bg-white border-b border-amber-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2 flex-1 min-w-[200px] max-w-sm">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索商品名称、店铺..."
              className="w-full bg-amber-50/30 border border-amber-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-400 focus:bg-white"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Priority filter */}
          <div className="flex items-center space-x-1 bg-white border border-amber-200 rounded-lg px-2 py-1">
            <Filter className="w-3 h-3 text-amber-600" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent text-slate-700 text-xs focus:outline-none cursor-pointer"
            >
              <option value="all">所有购买意愿</option>
              <option value="must">核心必买 ({mustCount})</option>
              <option value="prefer">优先购买</option>
              <option value="flexible">凑单备选 ({flexCount})</option>
            </select>
          </div>

          {/* Category filter */}
          {categories.length > 0 && (
            <div className="flex items-center space-x-1 bg-white border border-amber-200 rounded-lg px-2 py-1">
              <Tag className="w-3 h-3 text-amber-600" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent text-slate-700 text-xs focus:outline-none cursor-pointer"
              >
                <option value="all">所有品类</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sort */}
          <button
            onClick={() =>
              setSortBy((prev) =>
                prev === 'default' ? 'priceDesc' : prev === 'priceDesc' ? 'priceAsc' : 'default'
              )
            }
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg border text-xs transition cursor-pointer ${
              sortBy !== 'default'
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-white text-slate-600 border-amber-200 hover:text-slate-900'
            }`}
          >
            <ArrowUpDown className="w-3 h-3" />
            <span>
              {sortBy === 'priceDesc'
                ? '小计从高到低'
                : sortBy === 'priceAsc'
                ? '小计从低到高'
                : '默认排序'}
            </span>
          </button>
        </div>
      </div>

      {/* Table content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-amber-100 bg-amber-50/50 text-slate-600 font-semibold">
              <th className="py-3 px-4">商品名称 / 平台</th>
              <th className="py-3 px-4">店铺 / 类目</th>
              <th className="py-3 px-4 text-right">标价 (元)</th>
              <th className="py-3 px-4 text-center">数量</th>
              <th className="py-3 px-4 text-right">标价小计</th>
              <th className="py-3 px-4 text-center">购买优先级</th>
              <th className="py-3 px-4 text-center">跨店满减</th>
              <th className="py-3 px-4 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-100/70">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  {products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <p className="text-slate-600 text-sm font-medium">清单暂无商品</p>
                      <button
                        onClick={onOpenAddModal}
                        className="px-4 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 cursor-pointer shadow-xs"
                      >
                        立即导入或添加商品
                      </button>
                    </div>
                  ) : (
                    '无符合筛选条件的商品'
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const subtotal = item.price * item.quantity;
                return (
                  <tr
                    key={item.id}
                    className="hover:bg-amber-50/40 transition-colors group text-slate-700"
                  >
                    {/* Name */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="flex items-start space-x-2">
                        <span
                          className={`mt-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded ${
                            item.platform === 'tmall'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {item.platform === 'tmall' ? '天猫' : '淘宝'}
                        </span>
                        <div className="flex-1 min-w-0">
                          {editingId === item.id && editingField === 'name' ? (
                            <input
                              type="text"
                              autoFocus
                              defaultValue={item.name}
                              onBlur={(e) => {
                                if (e.target.value.trim()) {
                                  onUpdateProduct(item.id, { name: e.target.value.trim() });
                                }
                                setEditingId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const target = e.target as HTMLInputElement;
                                  if (target.value.trim()) {
                                    onUpdateProduct(item.id, { name: target.value.trim() });
                                  }
                                  setEditingId(null);
                                } else if (e.key === 'Escape') {
                                  setEditingId(null);
                                }
                              }}
                              className="w-full bg-white border border-amber-400 rounded px-1.5 py-0.5 text-xs text-slate-900 font-semibold focus:outline-none"
                            />
                          ) : (
                            <div
                              onClick={() => {
                                setEditingId(item.id);
                                setEditingField('name');
                              }}
                              className="font-semibold text-slate-900 leading-snug line-clamp-2 cursor-pointer hover:text-amber-800 group/title flex items-center gap-1"
                              title="点击修改商品名称"
                            >
                              <span>{item.name}</span>
                              <Edit3 className="w-3 h-3 text-slate-300 group-hover/title:text-amber-600 opacity-0 group-hover/title:opacity-100 transition shrink-0" />
                            </div>
                          )}
                          {item.notes && (
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              {item.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Shop & Category */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1 text-slate-800 font-medium">
                        <Store className="w-3 h-3 text-slate-400" />
                        <span className="truncate max-w-[130px]">{item.shop}</span>
                      </div>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] bg-amber-50 text-slate-600 border border-amber-200/60 font-medium">
                        {item.category}
                      </span>
                    </td>

                    {/* Unit Price */}
                    <td className="py-3 px-4 text-right font-mono font-medium text-slate-900">
                      {editingId === item.id && editingField === 'price' ? (
                        <input
                          type="number"
                          step="0.01"
                          min="0.1"
                          autoFocus
                          defaultValue={item.price}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (val > 0) {
                              onUpdateProduct(item.id, { price: val });
                            }
                            setEditingId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const target = e.target as HTMLInputElement;
                              const val = parseFloat(target.value);
                              if (val > 0) {
                                onUpdateProduct(item.id, { price: val });
                              }
                              setEditingId(null);
                            } else if (e.key === 'Escape') {
                              setEditingId(null);
                            }
                          }}
                          className="w-20 bg-white border border-amber-400 rounded px-1.5 py-0.5 text-xs text-right font-mono font-bold text-slate-900 focus:outline-none"
                        />
                      ) : (
                        <div
                          onClick={() => {
                            setEditingId(item.id);
                            setEditingField('price');
                          }}
                          className="cursor-pointer hover:text-amber-800 flex items-center justify-end gap-1 group/price"
                          title="点击修改标价"
                        >
                          <span>¥{item.price.toFixed(2)}</span>
                          <Edit3 className="w-2.5 h-2.5 text-slate-300 group-hover/price:text-amber-600 opacity-0 group-hover/price:opacity-100 transition shrink-0" />
                        </div>
                      )}
                    </td>

                    {/* Quantity Stepper */}
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() =>
                            onUpdateProduct(item.id, {
                              quantity: Math.max(1, item.quantity - 1),
                            })
                          }
                          disabled={item.quantity <= 1}
                          className="p-1 rounded-md bg-amber-50 text-slate-600 hover:text-slate-900 hover:bg-amber-100 disabled:opacity-30 cursor-pointer border border-amber-200/60"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center font-mono font-bold text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            onUpdateProduct(item.id, { quantity: item.quantity + 1 })
                          }
                          className="p-1 rounded-md bg-amber-50 text-slate-600 hover:text-slate-900 hover:bg-amber-100 cursor-pointer border border-amber-200/60"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    {/* Subtotal */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-700">
                      ¥{subtotal.toFixed(2)}
                    </td>

                    {/* Priority Selector */}
                    <td className="py-3 px-4 text-center">
                      <select
                        value={item.priority}
                        onChange={(e) =>
                          onUpdateProduct(item.id, {
                            priority: e.target.value as ProductPriority,
                          })
                        }
                        className={`text-[11px] font-semibold px-2 py-1 rounded-md border focus:outline-none cursor-pointer ${
                          item.priority === 'must'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : item.priority === 'prefer'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        <option value="must">🔴 核心必买</option>
                        <option value="prefer">🟡 优先购买</option>
                        <option value="flexible">🟢 凑单备选</option>
                      </select>
                    </td>

                    {/* Cross Shop Toggle */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() =>
                          onUpdateProduct(item.id, {
                            participatesCrossShop: !item.participatesCrossShop,
                          })
                        }
                        className={`p-1.5 rounded-lg border transition cursor-pointer ${
                          item.participatesCrossShop
                            ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                            : 'bg-slate-100 text-slate-400 border-slate-200'
                        }`}
                        title={
                          item.participatesCrossShop ? '已参与跨店每满减' : '未参与跨店满减'
                        }
                      >
                        <Check
                          className={`w-3.5 h-3.5 ${
                            item.participatesCrossShop ? 'opacity-100' : 'opacity-20'
                          }`}
                        />
                      </button>
                    </td>

                    {/* Remove */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onRemoveProduct(item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="删除此商品"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className="p-4 bg-amber-50/40 border-t border-amber-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center space-x-3">
          <span>
            必买项: <strong className="text-slate-900">{mustCount}</strong>
          </span>
          <span>
            凑单备选项: <strong className="text-emerald-700">{flexCount}</strong>
          </span>
          <span>
            参与满减项: <strong className="text-amber-800">{crossCount}</strong>
          </span>
        </div>
        <div className="text-right">
          <span>清单标价总额: </span>
          <span className="text-sm font-bold font-mono text-amber-700">
            ¥{totalSubtotal.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};
