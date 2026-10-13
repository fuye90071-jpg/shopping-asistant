/**
 * couponEngine.ts
 * Rigorous deterministic coupon calculation & apportionment engine
 * adhering to Taobao/Tmall promotional deduction hierarchy:
 * 1. 标价 / 单品优惠
 * 2. 店铺优惠券 (Shop Coupon)
 * 3. 品类优惠券 (Category Coupon)
 * 4. 跨店满减 (Cross-Shop Full Reduction, e.g. 每满300减50)
 * 5. 平台大促消费券 / 88VIP 券 (Platform Coupon)
 * 6. 现金红包 (Red Packet)
 */

import { Product, Promotion, SingleOrderResult, AppliedPromotionDetail } from '../types/shopping';

export interface EvaluatedOrder {
  orderResult: SingleOrderResult;
  usedPromotionIds: string[];
}

export function evaluateSingleOrder(
  productsWithQty: { product: Product; quantity: number }[],
  availablePromotions: Promotion[],
  orderIndex: number = 1
): EvaluatedOrder {
  // 1. Initial product list and subtotals
  const items = productsWithQty.map(({ product, quantity }) => {
    const subtotal = Math.round(product.price * quantity * 100) / 100;
    return {
      product,
      quantity,
      subtotal,
      apportionedDiscount: 0,
      finalPrice: subtotal,
      // Internal tracking for sequential stages
      stageAmount: subtotal,
    };
  });

  const originalTotal = Math.round(items.reduce((sum, item) => sum + item.subtotal, 0) * 100) / 100;
  const appliedPromotions: AppliedPromotionDetail[] = [];
  const usedPromotionIds: string[] = [];

  let shopCouponDiscount = 0;
  let categoryCouponDiscount = 0;
  let crossShopDiscount = 0;
  let platformCouponDiscount = 0;
  let redPacketDiscount = 0;

  // Track potential padding distance for highest value tiered or platform coupon
  let paddingDistance: SingleOrderResult['paddingDistance'] = undefined;

  // Active promotions
  const activePromos = availablePromotions.filter((p) => p.enabled);

  // ----------------------------------------------------
  // Stage 1: Official discount / 直降
  // ----------------------------------------------------
  const officialDiscounts = activePromos.filter((p) => p.type === 'OFFICIAL_DISCOUNT');
  for (const promo of officialDiscounts) {
    let eligibleSubtotal = 0;
    const eligibleIndices: number[] = [];

    items.forEach((item, idx) => {
      if (
        (!promo.targetShop || item.product.shop === promo.targetShop) &&
        (!promo.targetCategory || item.product.category === promo.targetCategory) &&
        (!promo.targetProductIds || promo.targetProductIds.includes(item.product.id))
      ) {
        eligibleSubtotal += item.stageAmount;
        eligibleIndices.push(idx);
      }
    });

    if (eligibleSubtotal >= promo.threshold && eligibleSubtotal > 0) {
      let discountVal = 0;
      if (promo.discountRate && promo.discountRate > 0 && promo.discountRate < 1) {
        discountVal = Math.round(eligibleSubtotal * (1 - promo.discountRate) * 100) / 100;
      } else {
        discountVal = promo.discount;
      }
      discountVal = Math.min(discountVal, eligibleSubtotal);

      if (discountVal > 0) {
        // Apportion to eligible items
        eligibleIndices.forEach((idx) => {
          const ratio = items[idx].stageAmount / eligibleSubtotal;
          const share = Math.round(discountVal * ratio * 100) / 100;
          items[idx].stageAmount = Math.max(0, items[idx].stageAmount - share);
          items[idx].apportionedDiscount += share;
        });
        appliedPromotions.push({
          promotionId: promo.id,
          promotionName: promo.name,
          type: promo.type,
          discountAmount: discountVal,
          explanation: `适用商品金额 ¥${eligibleSubtotal.toFixed(2)}，立减 ¥${discountVal.toFixed(2)}`,
        });
        usedPromotionIds.push(promo.id);
      }
    }
  }

  // ----------------------------------------------------
  // Stage 2: Shop Coupons (店铺券)
  // Per shop: pick best available shop coupon
  // ----------------------------------------------------
  const shopPromos = activePromos.filter((p) => p.type === 'SHOP_COUPON');
  // Group eligible items by shop
  const shops = Array.from(new Set(items.map((i) => i.product.shop)));

  for (const shop of shops) {
    const shopItems = items
      .map((item, idx) => ({ ...item, idx }))
      .filter((item) => item.product.shop === shop);
    const shopEligibleTotal = shopItems.reduce((sum, item) => sum + item.stageAmount, 0);

    // Find best shop coupon for this shop
    const eligibleCoupons = shopPromos.filter(
      (p) => (!p.targetShop || p.targetShop === shop) && shopEligibleTotal >= p.threshold
    );

    if (eligibleCoupons.length > 0) {
      // Pick coupon with highest discount
      const bestCoupon = eligibleCoupons.reduce((prev, curr) =>
        curr.discount > prev.discount ? curr : prev
      );
      const discountVal = Math.min(bestCoupon.discount, shopEligibleTotal);

      if (discountVal > 0) {
        shopCouponDiscount += discountVal;
        shopItems.forEach((item) => {
          const ratio = item.stageAmount / shopEligibleTotal;
          const share = Math.round(discountVal * ratio * 100) / 100;
          items[item.idx].stageAmount = Math.max(0, items[item.idx].stageAmount - share);
          items[item.idx].apportionedDiscount += share;
        });

        appliedPromotions.push({
          promotionId: bestCoupon.id,
          promotionName: bestCoupon.name,
          type: bestCoupon.type,
          discountAmount: discountVal,
          explanation: `店铺【${shop}】金额达 ¥${shopEligibleTotal.toFixed(2)}，满足门槛 ¥${bestCoupon.threshold}，减免 ¥${discountVal.toFixed(2)}`,
        });
        usedPromotionIds.push(bestCoupon.id);
      }
    } else {
      // Check if close to a shop coupon threshold
      const missedCoupons = shopPromos.filter(
        (p) => (!p.targetShop || p.targetShop === shop) && shopEligibleTotal < p.threshold
      );
      if (missedCoupons.length > 0) {
        const closest = missedCoupons.reduce((prev, curr) =>
          curr.threshold - shopEligibleTotal < prev.threshold - shopEligibleTotal ? curr : prev
        );
        const gap = Math.round((closest.threshold - shopEligibleTotal) * 100) / 100;
        if (gap <= 200 && (!paddingDistance || gap < paddingDistance.shortfall)) {
          paddingDistance = {
            promotionName: `【${shop}】${closest.name}`,
            threshold: closest.threshold,
            currentQualifiedAmount: shopEligibleTotal,
            shortfall: gap,
            potentialSaving: closest.discount,
          };
        }
      }
    }
  }

  // ----------------------------------------------------
  // Stage 3: Category Coupons (品类券 / 行业专享券)
  // Group by category, find eligible
  // ----------------------------------------------------
  const catPromos = activePromos.filter((p) => p.type === 'CATEGORY_COUPON');
  const categories = Array.from(new Set(items.map((i) => i.product.category)));

  for (const cat of categories) {
    const catItems = items
      .map((item, idx) => ({ ...item, idx }))
      .filter((item) => item.product.category === cat);
    const catEligibleTotal = catItems.reduce((sum, item) => sum + item.stageAmount, 0);

    const eligibleCoupons = catPromos.filter(
      (p) => (!p.targetCategory || p.targetCategory === cat) && catEligibleTotal >= p.threshold
    );

    if (eligibleCoupons.length > 0) {
      const bestCoupon = eligibleCoupons.reduce((prev, curr) =>
        curr.discount > prev.discount ? curr : prev
      );
      const discountVal = Math.min(bestCoupon.discount, catEligibleTotal);

      if (discountVal > 0) {
        categoryCouponDiscount += discountVal;
        catItems.forEach((item) => {
          const ratio = item.stageAmount / catEligibleTotal;
          const share = Math.round(discountVal * ratio * 100) / 100;
          items[item.idx].stageAmount = Math.max(0, items[item.idx].stageAmount - share);
          items[item.idx].apportionedDiscount += share;
        });

        appliedPromotions.push({
          promotionId: bestCoupon.id,
          promotionName: bestCoupon.name,
          type: bestCoupon.type,
          discountAmount: discountVal,
          explanation: `品类【${cat}】合格金额 ¥${catEligibleTotal.toFixed(2)}，满足满 ¥${bestCoupon.threshold} 减 ¥${bestCoupon.discount}`,
        });
        usedPromotionIds.push(bestCoupon.id);
      }
    } else {
      const missedCoupons = catPromos.filter(
        (p) => (!p.targetCategory || p.targetCategory === cat) && catEligibleTotal < p.threshold
      );
      if (missedCoupons.length > 0) {
        const closest = missedCoupons.reduce((prev, curr) =>
          curr.threshold - catEligibleTotal < prev.threshold - catEligibleTotal ? curr : prev
        );
        const gap = Math.round((closest.threshold - catEligibleTotal) * 100) / 100;
        if (gap <= 300 && (!paddingDistance || gap < paddingDistance.shortfall)) {
          paddingDistance = {
            promotionName: `品类券【${closest.name}】`,
            threshold: closest.threshold,
            currentQualifiedAmount: catEligibleTotal,
            shortfall: gap,
            potentialSaving: closest.discount,
          };
        }
      }
    }
  }

  // ----------------------------------------------------
  // Stage 4: Cross-shop Full Reduction (跨店每满减)
  // E.g. 每满300减50
  // ----------------------------------------------------
  const crossShopPromos = activePromos.filter((p) => p.type === 'CROSS_SHOP_FULL_REDUCTION');
  const crossItems = items
    .map((item, idx) => ({ ...item, idx }))
    .filter((item) => item.product.participatesCrossShop);
  const crossEligibleTotal = crossItems.reduce((sum, item) => sum + item.stageAmount, 0);

  if (crossShopPromos.length > 0 && crossEligibleTotal > 0) {
    const promo = crossShopPromos[0]; // Primary cross shop rule
    const step = promo.threshold;
    const stepDiscount = promo.discount;

    if (step > 0 && crossEligibleTotal >= step) {
      const count = Math.floor(crossEligibleTotal / step);
      let calculatedDiscount = count * stepDiscount;
      if (promo.maxDiscount && promo.maxDiscount > 0) {
        calculatedDiscount = Math.min(calculatedDiscount, promo.maxDiscount);
      }
      calculatedDiscount = Math.min(calculatedDiscount, crossEligibleTotal);

      if (calculatedDiscount > 0) {
        crossShopDiscount += calculatedDiscount;
        crossItems.forEach((item) => {
          const ratio = item.stageAmount / crossEligibleTotal;
          const share = Math.round(calculatedDiscount * ratio * 100) / 100;
          items[item.idx].stageAmount = Math.max(0, items[item.idx].stageAmount - share);
          items[item.idx].apportionedDiscount += share;
        });

        appliedPromotions.push({
          promotionId: promo.id,
          promotionName: promo.name,
          type: promo.type,
          discountAmount: calculatedDiscount,
          explanation: `参与跨店商品金额 ¥${crossEligibleTotal.toFixed(2)}，满足 ${count} 档每满 ¥${step} 减 ¥${stepDiscount}，累计立减 ¥${calculatedDiscount.toFixed(2)}`,
        });
        usedPromotionIds.push(promo.id);
      }

      // Check shortfall to next tier
      const remainder = crossEligibleTotal % step;
      const shortfallToNext = Math.round((step - remainder) * 100) / 100;
      if (shortfallToNext > 0 && shortfallToNext <= step * 0.4) {
        // Less than 40% of step to next tier -> strong padding candidate
        paddingDistance = {
          promotionName: `跨店满减下一档 (${promo.name})`,
          threshold: (count + 1) * step,
          currentQualifiedAmount: crossEligibleTotal,
          shortfall: shortfallToNext,
          potentialSaving: stepDiscount,
        };
      }
    } else if (step > 0 && crossEligibleTotal < step) {
      const shortfall = Math.round((step - crossEligibleTotal) * 100) / 100;
      if (shortfall <= step * 0.5) {
        paddingDistance = {
          promotionName: `跨店满减首档 (${promo.name})`,
          threshold: step,
          currentQualifiedAmount: crossEligibleTotal,
          shortfall: shortfall,
          potentialSaving: stepDiscount,
        };
      }
    }
  }

  // ----------------------------------------------------
  // Stage 5: Platform Coupons (平台大促券 / 88VIP 消费券)
  // E.g. 满5000减400
  // Evaluated on payable subtotal of eligible items after earlier discounts
  // ----------------------------------------------------
  const platformPromos = activePromos.filter((p) => p.type === 'PLATFORM_COUPON');
  for (const promo of platformPromos) {
    let eligibleRemaining = 0;
    const eligibleIndices: number[] = [];

    items.forEach((item, idx) => {
      if (
        (!promo.targetShop || item.product.shop === promo.targetShop) &&
        (!promo.targetCategory || item.product.category === promo.targetCategory) &&
        (!promo.targetProductIds || promo.targetProductIds.includes(item.product.id))
      ) {
        eligibleRemaining += item.stageAmount;
        eligibleIndices.push(idx);
      }
    });

    if (eligibleRemaining >= promo.threshold && promo.discount > 0) {
      const discountVal = Math.min(promo.discount, eligibleRemaining);
      platformCouponDiscount += discountVal;

      eligibleIndices.forEach((idx) => {
        const ratio = items[idx].stageAmount / eligibleRemaining;
        const share = Math.round(discountVal * ratio * 100) / 100;
        items[idx].stageAmount = Math.max(0, items[idx].stageAmount - share);
        items[idx].apportionedDiscount += share;
      });

      appliedPromotions.push({
        promotionId: promo.id,
        promotionName: promo.name,
        type: promo.type,
        discountAmount: discountVal,
        explanation: `大促券有效金额 ¥${eligibleRemaining.toFixed(2)} 达到满 ¥${promo.threshold} 门槛，减免 ¥${discountVal.toFixed(2)}`,
      });
      usedPromotionIds.push(promo.id);
    } else if (eligibleRemaining < promo.threshold && promo.threshold > 0) {
      const gap = Math.round((promo.threshold - eligibleRemaining) * 100) / 100;
      if (gap <= promo.threshold * 0.25) {
        if (!paddingDistance || gap < paddingDistance.shortfall) {
          paddingDistance = {
            promotionName: `平台券【${promo.name}】`,
            threshold: promo.threshold,
            currentQualifiedAmount: eligibleRemaining,
            shortfall: gap,
            potentialSaving: promo.discount,
          };
        }
      }
    }
  }

  // ----------------------------------------------------
  // Stage 6: Red Packets (现金红包)
  // ----------------------------------------------------
  const redPackets = activePromos.filter((p) => p.type === 'RED_PACKET');
  const currentPayable = items.reduce((sum, item) => sum + item.stageAmount, 0);

  for (const promo of redPackets) {
    if (currentPayable > 0 && promo.discount > 0) {
      const discountVal = Math.min(promo.discount, currentPayable);
      redPacketDiscount += discountVal;

      items.forEach((item) => {
        const ratio = item.stageAmount / (currentPayable || 1);
        const share = Math.round(discountVal * ratio * 100) / 100;
        item.stageAmount = Math.max(0, item.stageAmount - share);
        item.apportionedDiscount += share;
      });

      appliedPromotions.push({
        promotionId: promo.id,
        promotionName: promo.name,
        type: promo.type,
        discountAmount: discountVal,
        explanation: `无门槛现金红包直接抵扣 ¥${discountVal.toFixed(2)}`,
      });
      usedPromotionIds.push(promo.id);
    }
  }

  // Re-calculate final prices and total discount
  const finalPay = Math.round(items.reduce((sum, item) => sum + item.stageAmount, 0) * 100) / 100;
  const totalDiscount = Math.round((originalTotal - finalPay) * 100) / 100;

  const resultItems = items.map((item) => ({
    product: item.product,
    quantity: item.quantity,
    subtotal: item.subtotal,
    apportionedDiscount: Math.round(item.apportionedDiscount * 100) / 100,
    finalPrice: Math.round(item.stageAmount * 100) / 100,
  }));

  const orderResult: SingleOrderResult = {
    orderIndex,
    products: resultItems,
    originalTotal,
    shopCouponDiscount: Math.round(shopCouponDiscount * 100) / 100,
    categoryCouponDiscount: Math.round(categoryCouponDiscount * 100) / 100,
    crossShopDiscount: Math.round(crossShopDiscount * 100) / 100,
    platformCouponDiscount: Math.round(platformCouponDiscount * 100) / 100,
    redPacketDiscount: Math.round(redPacketDiscount * 100) / 100,
    totalDiscount,
    finalPay,
    appliedPromotions,
    paddingDistance,
  };

  return { orderResult, usedPromotionIds };
}
