/**
 * Shopping Optimization Engine - Data Models
 * Follows PRD specifications for Taobao/Tmall promotions and combinatorial order partitioning.
 */

export type Platform = 'taobao' | 'tmall';

export type ProductPriority = 'must' | 'prefer' | 'flexible';

export interface Product {
  id: string;
  platform: Platform;
  url?: string;
  name: string;
  shop: string;
  category: string;
  price: number; // 单价 (元)
  quantity: number; // 数量 (默认 1)
  priority: ProductPriority; // must: 核心必买, prefer: 优先购买, flexible: 凑单/弹性备选
  participatesCrossShop: boolean; // 是否参与跨店满减 (默认 true)
  notes?: string;
  itemId?: string;
  isPureUrl?: boolean;
  needsNameInput?: boolean;
  needsPriceInput?: boolean;
}

export type PromotionType =
  | 'CROSS_SHOP_FULL_REDUCTION' // 跨店每满减 (如: 每满300减50)
  | 'SHOP_COUPON'              // 店铺券 (如: 索尼旗舰店满1000减120)
  | 'CATEGORY_COUPON'          // 品类券 / 行业券 (如: 家电专享满3000减300)
  | 'PLATFORM_COUPON'          // 平台大促消费券 / 88VIP券 (如: 满5000减400)
  | 'OFFICIAL_DISCOUNT'        // 官方立减 / 直降 (如: 官方立减 85折 或 单件减20)
  | 'RED_PACKET';              // 现金红包 (无门槛抵扣)

export interface Promotion {
  id: string;
  name: string;
  type: PromotionType;
  threshold: number; // 门槛金额 (0 为无门槛)
  discount: number; // 减免金额 (如减 50)
  discountRate?: number; // 折扣比例 (如 0.85 表示 85 折, 0 表示非打折)
  isTiered?: boolean; // 是否每满 (循环叠加, 如每满300减50)
  maxDiscount?: number; // 循环叠加封顶金额 (可选)
  targetShop?: string; // 指定适用店铺 (留空为全店铺)
  targetCategory?: string; // 指定适用类目 (留空为全品类)
  targetProductIds?: string[]; // 指定特定商品 ID 列表
  notes?: string;
  enabled: boolean;
}

export interface AppliedPromotionDetail {
  promotionId: string;
  promotionName: string;
  type: PromotionType;
  discountAmount: number;
  explanation: string;
}

export interface SingleOrderResult {
  orderIndex: number;
  products: {
    product: Product;
    quantity: number;
    subtotal: number;
    apportionedDiscount: number; // 分摊到的总优惠
    finalPrice: number; // 分摊后的实付
  }[];
  originalTotal: number;
  shopCouponDiscount: number;
  categoryCouponDiscount: number;
  crossShopDiscount: number;
  platformCouponDiscount: number;
  redPacketDiscount: number;
  totalDiscount: number;
  finalPay: number;
  appliedPromotions: AppliedPromotionDetail[];
  paddingDistance?: {
    promotionName: string;
    threshold: number;
    currentQualifiedAmount: number;
    shortfall: number; // 距离下一次或该满减门槛还差多少元
    potentialSaving: number; // 如果凑满可多减多少元
  };
}

export interface OptimizationPlan {
  id: string;
  title: string;
  tag: string;
  description: string;
  originalTotal: number;
  totalDiscount: number;
  finalPay: number;
  discountRate: number; // 例如 0.72 (7.2折)
  orders: SingleOrderResult[];
  explanation: string;
  optimalityGap: number; // 0% 理论最优, <= 1%
  paddingTips: {
    message: string;
    gapAmount: number;
    extraBenefit: number;
    suggestedAction: string;
  }[];
}

export interface OptimizationExecutionResult {
  plans: OptimizationPlan[];
  calculationTimeMs: number;
  evaluatedCombinationsCount: number;
  algorithmUsed: string;
  timestamp: string;
}
