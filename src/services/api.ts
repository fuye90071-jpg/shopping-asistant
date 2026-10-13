import { Promotion, Product, OptimizationPlan } from '../types/shopping';

export async function parsePromotionsWithAI(text: string): Promise<{
  promotions: Promotion[];
  source: 'gemini' | 'heuristic';
}> {
  try {
    const res = await fetch('/api/parse-promotions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }
    return await res.json();
  } catch {
    return {
      promotions: [
        {
          id: `promo-client-${Date.now()}`,
          name: '跨店每满300减50',
          type: 'CROSS_SHOP_FULL_REDUCTION',
          threshold: 300,
          discount: 50,
          isTiered: true,
          enabled: true,
        },
      ],
      source: 'heuristic',
    };
  }
}

export async function explainStrategyWithAI(
  plan: OptimizationPlan,
  totalProductsCount: number
): Promise<string> {
  try {
    const res = await fetch('/api/explain-strategy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, totalProductsCount }),
    });
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }
    const data = await res.json();
    return data.explanation;
  } catch (err) {
    return plan.explanation;
  }
}

export async function parseRawProducts(rawText: string): Promise<Product[]> {
  try {
    const res = await fetch('/api/parse-products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText }),
    });
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }
    const data = await res.json();
    return data.products;
  } catch {
    return [];
  }
}
