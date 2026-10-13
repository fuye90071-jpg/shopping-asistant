import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import util from 'util';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const execPromise = util.promisify(exec);

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

let aiDisabled = false;

// Robust deterministic fallback explanation
function generateDetailedStrategyExplanation(plan: any, totalProductsCount?: number): string {
  const discountRateStr = (plan.discountRate * 10).toFixed(1);
  const ordersCount = plan.orders?.length || 1;
  const paddingTip =
    plan.paddingTips && plan.paddingTips.length > 0
      ? plan.paddingTips[0].suggestedAction
      : '当前优惠阶梯利用充分，无需刻意凑单。';

  let orderDetails = '';
  if (plan.orders && plan.orders.length > 1) {
    orderDetails = `分批说明：拆分为 ${ordersCount} 个订单结算，精准触发多档消费券并防止满减封顶。`;
  } else {
    orderDetails = '合并结算：全部商品放入同一个结算单提交，充分享受跨店每满减与最高档券。';
  }

  return `【精算师实操指南】
1. 核心减免：本方案原标价 ¥${Number(plan.originalTotal).toFixed(2)}，经各级规则严密抵扣后累计节省 ¥${Number(plan.totalDiscount).toFixed(2)}，综合到手折扣达 ${discountRateStr} 折。
2. 下单步骤：建议分 ${ordersCount} 批次在购物车中依次勾选结算。${orderDetails}
3. 凑单建议：${paddingTip}`;
}

// ====================================================
// 1. API: Parse Natural Language Promotion Rules
// ====================================================
app.post('/api/parse-promotions', async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'Text prompt is required.' });
    return;
  }

  // If Gemini is available and not disabled by permission errors
  if (ai && !aiDisabled) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `你是一个专业的电商（淘宝/天猫）促销规则结构化解析专家。
请将用户输入的自然语言优惠描述转换成严谨的促销规则数组。
用户的优惠输入内容：
"""
${text}
"""

规则分类准则：
- CROSS_SHOP_FULL_REDUCTION: 跨店满减 (如每满300减50，满200减30)，isTiered 通常为 true
- SHOP_COUPON: 店铺券 (如某某旗舰店满1000减120)，需要 targetShop
- CATEGORY_COUPON: 品类/行业券 (如大家电专享满3000减300，美妆券满800减80)，需要 targetCategory
- PLATFORM_COUPON: 平台大促消费券/88VIP消费券 (如满5000减400，满1500减120)
- OFFICIAL_DISCOUNT: 官方立减/折扣 (如官方立减85折，每件立减20)
- RED_PACKET: 现金红包/无门槛立减 (门槛 threshold 为 0)
`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            description: '解析出的优惠规则列表',
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING, description: '规则名称，如 跨店每满300减50' },
                type: {
                  type: Type.STRING,
                  enum: [
                    'CROSS_SHOP_FULL_REDUCTION',
                    'SHOP_COUPON',
                    'CATEGORY_COUPON',
                    'PLATFORM_COUPON',
                    'OFFICIAL_DISCOUNT',
                    'RED_PACKET',
                  ],
                },
                threshold: { type: Type.NUMBER, description: '满减门槛金额，0为无门槛' },
                discount: { type: Type.NUMBER, description: '减免金额' },
                discountRate: { type: Type.NUMBER, description: '折扣率，如0.85表示85折，默认0' },
                isTiered: { type: Type.BOOLEAN, description: '是否每满循环' },
                maxDiscount: { type: Type.NUMBER, description: '封顶金额，无则为0' },
                targetShop: { type: Type.STRING, description: '指定店铺名称，全平台则为空' },
                targetCategory: { type: Type.STRING, description: '指定品类名称，全品类则为空' },
                notes: { type: Type.STRING, description: '规则补充说明' },
                enabled: { type: Type.BOOLEAN },
              },
              required: ['name', 'type', 'threshold', 'discount'],
            },
          },
        },
      });

      const parsedJson = JSON.parse(response.text || '[]');
      const results = parsedJson.map((item: any, idx: number) => ({
        id: item.id || `promo-ai-${Date.now()}-${idx}`,
        name: item.name || '优惠规则',
        type: item.type || 'CROSS_SHOP_FULL_REDUCTION',
        threshold: Number(item.threshold) || 0,
        discount: Number(item.discount) || 0,
        discountRate: Number(item.discountRate) || 0,
        isTiered: Boolean(item.isTiered),
        maxDiscount: item.maxDiscount ? Number(item.maxDiscount) : undefined,
        targetShop: item.targetShop || undefined,
        targetCategory: item.targetCategory || undefined,
        notes: item.notes || '',
        enabled: true,
      }));

      res.json({ promotions: results, source: 'gemini' });
      return;
    } catch (err: any) {
      if (
        err?.status === 403 ||
        err?.message?.includes('403') ||
        err?.message?.includes('PERMISSION_DENIED')
      ) {
        aiDisabled = true;
      }
    }
  }

  // Fallback Rule-based parser
  const fallbackPromotions = parseRulesByHeuristic(text);
  res.json({ promotions: fallbackPromotions, source: 'heuristic' });
});

// ====================================================
// 2. API: Explain Strategy via Gemini
// ====================================================
app.post('/api/explain-strategy', async (req: Request, res: Response) => {
  const { plan, totalProductsCount } = req.body;
  if (!plan) {
    res.status(400).json({ error: 'Plan is required.' });
    return;
  }

  if (ai && !aiDisabled) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `你是一名大促资深省钱顾问与购物精算师。
请对以下优化方案给出一段简短有力、条理清晰的【购买与实付拆单指南】：
- 方案标题: ${plan.title}
- 原始金额: ¥${plan.originalTotal}
- 最终实付: ¥${plan.finalPay}
- 预计节省: ¥${plan.totalDiscount}
- 拆单数量: ${plan.orders?.length || 1} 个订单
- 商品总数: ${totalProductsCount || 0} 件
- 凑单提示: ${JSON.stringify(plan.paddingTips || [])}

输出要求：
1. 用 2~3 个小要点总结核心优惠来源（如：跨店满减贡献了多少，大额券如何被吃满）；
2. 给出明确的实操步骤建议（如：先下订单1，再下订单2）；
3. 语气客观专业、亲切直接，不要废话，字数在 200 字左右。
`,
      });

      if (response.text) {
        res.json({ explanation: response.text });
        return;
      }
    } catch (err: any) {
      if (
        err?.status === 403 ||
        err?.message?.includes('403') ||
        err?.message?.includes('PERMISSION_DENIED')
      ) {
        aiDisabled = true;
      }
    }
  }

  // Fallback explanation
  const fallbackText = generateDetailedStrategyExplanation(plan, totalProductsCount);
  res.json({ explanation: fallbackText });
});

// ====================================================
// 3. API: Parse Pasted Product Text / Links
// ====================================================
// ====================================================
// 3. API: Parse Pasted Product Text / Links (Advanced)
// ====================================================
const KNOWN_DEMO_PRODUCTS: Record<
  string,
  { name: string; price: number; shop: string; category: string; platform: 'tmall' | 'taobao' }
> = {
  '6821': {
    name: '索尼 75英寸 4K超高清游戏电视',
    price: 6499,
    shop: '索尼官方旗舰店',
    category: '大家电',
    platform: 'tmall',
  },
  '682138912': {
    name: '索尼 75英寸 4K超高清游戏电视',
    price: 6499,
    shop: '索尼官方旗舰店',
    category: '大家电',
    platform: 'tmall',
  },
  '7922': {
    name: '海尔 501升十字双开门冰箱',
    price: 3699,
    shop: '海尔官方旗舰店',
    category: '大家电',
    platform: 'tmall',
  },
  '792241920': {
    name: '海尔 501升十字双开门冰箱',
    price: 3699,
    shop: '海尔官方旗舰店',
    category: '大家电',
    platform: 'tmall',
  },
  '3812': {
    name: '小天鹅 10公斤滚筒洗烘一体机',
    price: 4999,
    shop: '小天鹅官方旗舰店',
    category: '大家电',
    platform: 'tmall',
  },
  '381290312': {
    name: '小天鹅 10公斤滚筒洗烘一体机',
    price: 4999,
    shop: '小天鹅官方旗舰店',
    category: '大家电',
    platform: 'tmall',
  },
  '9921': {
    name: '石头 P10S Pro 扫拖一体机器人',
    price: 3299,
    shop: '石头官方旗舰店',
    category: '生活电器',
    platform: 'tmall',
  },
  '992104812': {
    name: '石头 P10S Pro 扫拖一体机器人',
    price: 3299,
    shop: '石头官方旗舰店',
    category: '生活电器',
    platform: 'tmall',
  },
  '7724': {
    name: '洁柔 4层加厚抽纸 24包',
    price: 49.9,
    shop: '洁柔官方旗舰店',
    category: '生活日用',
    platform: 'tmall',
  },
  '772401928': {
    name: '洁柔 4层加厚抽纸 24包',
    price: 49.9,
    shop: '洁柔官方旗舰店',
    category: '生活日用',
    platform: 'tmall',
  },
  '5531': {
    name: '戴森 V12 Detect 无线吸尘器',
    price: 3999,
    shop: '戴森官方旗舰店',
    category: '生活电器',
    platform: 'tmall',
  },
  '6612': {
    name: '苹果 iPhone 15 Pro 256GB',
    price: 7999,
    shop: 'Apple Store官方旗舰店',
    category: '智能数码',
    platform: 'tmall',
  },
  '8823': {
    name: '华为 Mate 60 Pro 512GB',
    price: 6999,
    shop: '华为官方旗舰店',
    category: '智能数码',
    platform: 'tmall',
  },
  '4410': {
    name: '雅诗兰黛 小棕瓶特润修护肌透精华露',
    price: 690,
    shop: '雅诗兰黛官方旗舰店',
    category: '美妆个护',
    platform: 'tmall',
  },
  '1122': {
    name: '好奇 皇家御裤婴儿拉拉裤 L码',
    price: 149,
    shop: '好奇官方旗舰店',
    category: '母婴用品',
    platform: 'tmall',
  },
};

app.post('/api/parse-products', async (req: Request, res: Response) => {
  const { rawText } = req.body;
  if (!rawText || typeof rawText !== 'string') {
    res.status(400).json({ error: 'Raw text is required.' });
    return;
  }

  // Split lines or separated items
  const rawLines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const parsedProducts: any[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i].trim();
    if (!rawLine) continue;

    // 1. Extract URL and isolate it from text
    const urlMatch = rawLine.match(/(https?:\/\/[^\s]+)/i);
    let url = urlMatch ? urlMatch[1] : '';
    // Strip trailing punctuation from URL if any
    url = url.replace(/[),，。】」』]$/, '');

    // 2. Extract Item ID (from URL query, path, or explicit label)
    let itemId = '';
    const idFromUrlMatch = url.match(/[?&]id=([0-9]+)/i);
    if (idFromUrlMatch) {
      itemId = idFromUrlMatch[1];
    } else {
      const idFromPathMatch = url.match(/\/item\/([0-9]+)/i) || url.match(/\/([0-9]{7,16})\.html/i);
      if (idFromPathMatch) {
        itemId = idFromPathMatch[1];
      } else {
        const idFromTextMatch = rawLine.match(
          /(?:商品ID|商品编号|宝贝ID|ID|id)[:：\s]*([0-9]{5,16})/i
        );
        if (idFromTextMatch) {
          itemId = idFromTextMatch[1];
        }
      }
    }

    // Check if itemId matches our known catalog preset
    const knownItem = itemId ? KNOWN_DEMO_PRODUCTS[itemId] : null;

    // 3. Detect Platform
    const isTmall =
      /tmall|天猫/i.test(rawLine) || /tmall/i.test(url) || (knownItem?.platform === 'tmall');
    const platform = isTmall ? 'tmall' : 'taobao';

    // 4. Create working text: remove the URL and isolate commodity words
    let workingText = rawLine.replace(/(https?:\/\/[^\s]+)/gi, ' ').trim();

    // Remove explicit ID labels and standalone item ID so they are NEVER mistaken as title or price!
    if (itemId) {
      workingText = workingText.replace(
        new RegExp(`(?:商品ID|商品编号|宝贝ID|ID|id)[:：\\s]*${itemId}`, 'gi'),
        ' '
      );
      workingText = workingText.replace(new RegExp(`\\b${itemId}\\b`, 'g'), ' ');
    }
    workingText = workingText.replace(/(?:商品ID|商品编号|宝贝ID|ID|id)[:：\s]*[0-9]{5,16}/gi, ' ');

    // 5. Detect Price
    let price = 0;
    // Priority 5a: Explicit label like 【在售价】1899.00元, 【券后价】1699.00元, 在售价: 1899
    const explicitPriceMatch = workingText.match(
      /(?:【?(?:在售价|券后价|到手价|标价|现价|原价|单价)】?)\s*[:：]?\s*(?:¥|￥|RMB|\$)?\s*([0-9]+(?:\.[0-9]{1,2})?)\s*(?:元)?/i
    );
    if (explicitPriceMatch) {
      price = parseFloat(explicitPriceMatch[1]);
    } else {
      // Priority 5b: Currency symbol followed by number (¥1999 or ￥1999)
      const symbolPriceMatch = workingText.match(/(?:¥|￥|RMB|\$)\s*([0-9]+(?:\.[0-9]{1,2})?)/i);
      if (symbolPriceMatch) {
        price = parseFloat(symbolPriceMatch[1]);
      } else {
        // Priority 5c: Number followed by '元' (1999元)
        const yuanPriceMatch = workingText.match(/([0-9]+(?:\.[0-9]{1,2})?)\s*元/i);
        if (yuanPriceMatch) {
          price = parseFloat(yuanPriceMatch[1]);
        } else if (knownItem && knownItem.price > 0) {
          price = knownItem.price;
        } else {
          // Priority 5d: Standalone number (exclude dates like 2024, model digits like 501, 75, and IDs)
          const standaloneNums = workingText.match(/\b([1-9][0-9]{0,5}(?:\.[0-9]{1,2})?)\b/g);
          if (standaloneNums && standaloneNums.length > 0) {
            const valid = standaloneNums
              .map((n) => parseFloat(n))
              .filter(
                (n) =>
                  n > 0 &&
                  n < 200000 &&
                  n !== 2024 &&
                  n !== 2025 &&
                  n !== 2026 &&
                  n.toString() !== itemId
              );
            if (valid.length > 0) {
              price = valid[valid.length - 1];
            }
          }
        }
      }
    }

    // 6. Detect Shop
    let shop = knownItem?.shop || (isTmall ? '天猫精选旗舰店' : '淘宝优质店铺');
    const shopInBrackets = workingText.match(
      /【([^】]*(?:旗舰店|专营店|专卖店|官方店|官方旗舰店|商场|店))】/
    );
    if (shopInBrackets) {
      shop = shopInBrackets[1].trim();
    } else {
      const shopWordMatch = workingText.match(
        /([^\s，,、]+(?:官方旗舰店|旗舰店|专营店|专卖店|企业店))/
      );
      if (shopWordMatch) {
        shop = shopWordMatch[1].trim();
      }
    }

    // 7. Detect Category
    let category = knownItem?.category || '生活日用';
    if (/电视|冰箱|洗衣机|空调|热水器|油烟机|洗碗机|燃气灶|烘干机/i.test(rawLine)) category = '大家电';
    else if (/吸尘器|扫地机|电饭煲|空气净化器|吹风机|破壁机|料理机|微波炉|烤箱/i.test(rawLine)) category = '生活电器';
    else if (/手机|耳机|相机|数码|充电器|路由器|平板|键盘|鼠标|笔记本|电脑/i.test(rawLine)) category = '智能数码';
    else if (/数据线|HDMI|插座|转接头|手机壳|贴膜|支架/i.test(rawLine)) category = '数码配件';
    else if (/纸尿裤|奶粉|湿巾|婴儿|推车|安全座椅|奶瓶/i.test(rawLine)) category = '母婴用品';
    else if (/洗衣液|抽纸|卷纸|消毒液|牙膏|牙刷|沐浴露|洗发水|洗洁精/i.test(rawLine)) category = '日化家清';
    else if (/床|沙发|桌|椅|地漏|开关|灯|插座|花洒|水龙头/i.test(rawLine)) category = '家居家装';
    else if (/精华|面霜|口红|面膜|眼霜|水乳|护肤/i.test(rawLine)) category = '美妆个护';

    // 8. Extract Product Name (Accurate Multi-tier Strategy)
    let cleanName = '';

    // Tier 8a: Look for titles enclosed in quotation/corner marks: 「...」, 『...』, “...”, 《...》
    const bracketQuoteMatch = workingText.match(/[「『“《]([^」』”》]{2,60})[」』”》]/);
    if (bracketQuoteMatch && bracketQuoteMatch[1].trim().length >= 2) {
      cleanName = bracketQuoteMatch[1].trim();
    }

    // Tier 8b: Look for titles inside 【...】 if not platform or price or pure shop
    if (!cleanName) {
      const bracketSquareMatches = Array.from(workingText.matchAll(/【([^】]+)】/g));
      for (const m of bracketSquareMatches) {
        const content = m[1].trim();
        if (
          content &&
          !/^(?:淘宝|天猫|京东|拼多多|在售价|券后价|到手价|标价|原价|现价|下单链接)$/i.test(content) &&
          !/(?:官方旗舰店|旗舰店|专营店|专卖店|商场)$/i.test(content) &&
          content.length >= 2
        ) {
          cleanName = content;
          break;
        }
      }
    }

    // Tier 8c: Look for explicit prefix: 商品名称:, 商品名:, 名称:, 宝贝:
    if (!cleanName) {
      const explicitNameMatch = workingText.match(
        /(?:商品名称|商品名|宝贝名称|品名|名称)[:：\s]*([^\n\r,，、；;]+)/i
      );
      if (explicitNameMatch && explicitNameMatch[1].trim().length >= 2) {
        cleanName = explicitNameMatch[1].trim();
      }
    }

    // Tier 8d: Fallback to removing noise tokens and taking the core sentence
    if (!cleanName) {
      let filteredText = workingText
        // Remove price tags
        .replace(/【?(?:在售价|券后价|到手价|标价|原价|现价|单价)】?[:：]?\s*(?:¥|￥|RMB|\$)?[0-9.]+\s*元?/gi, ' ')
        .replace(/(?:¥|￥|RMB|\$)\s*[0-9]+(?:\.[0-9]{1,2})?/gi, ' ')
        .replace(/[0-9]+(?:\.[0-9]{1,2})?\s*元/gi, ' ')
        // Remove platform and link headers
        .replace(/【?(?:淘宝|天猫|天猫超市|京东|拼多多)】?/gi, ' ')
        .replace(/【?(?:下单链接|购买链接|商品链接)】?[:：]?/gi, ' ')
        // Remove shop tag
        .replace(/【[^】]*(?:旗舰店|专营店|专卖店|官方店|店)】/gi, ' ')
        // Remove Taobao password and share noise
        .replace(/[0-9]+[🗝✔👈👉￥$€]/gi, ' ')
        .replace(/[a-zA-Z0-9]+\s*CZ\d+/gi, ' ')
        .replace(/\bCZ\d+\b/gi, ' ')
        .replace(/\b\d+:\/[^\s]+\b/gi, ' ')
        .replace(/✔[^\s✔]+✔/gi, ' ')
        .replace(/\d{2}\/\d{2}\s+\d{2}:\d{2}/g, ' ')
        .replace(/淘口令|复制整段|fu至|点击链接直接打开|或者 淘宝搜索直接打开|復·制这段话|椱ァ製|长按复制|打开淘宝/gi, ' ')
        // Remove standalone item ID
        .replace(/(?:商品ID|宝贝ID|ID|id)[:：\s]*[0-9]+/gi, ' ')
        // Remove remaining brackets
        .replace(/[「」『』【】()（）]/g, ' ');

      if (shop && shop !== '天猫精选旗舰店' && shop !== '淘宝优质店铺') {
        filteredText = filteredText.replace(shop, ' ');
      }
      if (price > 0) {
        filteredText = filteredText.replace(new RegExp('\\b' + price + '\\b', 'g'), ' ');
      }

      // Filter out non-character noise
      filteredText = filteredText
        .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s+*.-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Ensure filteredText is not just numbers or "商品ID"
      if (filteredText && !/^[0-9\s.-]+$/.test(filteredText) && filteredText !== '商品ID') {
        cleanName = filteredText;
      }
    }

    // Tier 8e: If cleanName is still empty, check known catalog by itemId
    if (!cleanName && knownItem) {
      cleanName = knownItem.name;
    }

    // Clean up final name string
    cleanName = cleanName
      .replace(/^(?:商品ID|宝贝ID|ID|id)[:：\s]*[0-9]+/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Check if it's pure URL with no text
    const isPureUrl = !cleanName && !!url;

    parsedProducts.push({
      id: `prod-import-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
      platform,
      url,
      name: cleanName || '', // If empty, leaves empty for user to fill with convenient chips
      itemId,
      shop,
      category,
      price: price > 0 ? price : 0,
      quantity: 1,
      priority: 'must',
      participatesCrossShop: true,
      isPureUrl,
      needsNameInput: !cleanName,
      needsPriceInput: price <= 0,
    });
  }

  res.json({ products: parsedProducts });
});

// Heuristic regex parser when Gemini API key is absent
function parseRulesByHeuristic(text: string) {
  const rules: any[] = [];
  const lines = text.split(/[\n,，;；]+/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 1. 每满 X 减 Y
    const tieredMatch = trimmed.match(/(?:每满|每满减)\s*(\d+)\s*(?:减|抵|省)\s*(\d+)/);
    if (tieredMatch) {
      rules.push({
        id: `promo-rule-${Date.now()}-${rules.length}`,
        name: `跨店每满${tieredMatch[1]}减${tieredMatch[2]}`,
        type: 'CROSS_SHOP_FULL_REDUCTION',
        threshold: parseInt(tieredMatch[1], 10),
        discount: parseInt(tieredMatch[2], 10),
        isTiered: true,
        enabled: true,
        notes: '系统自动解析',
      });
      continue;
    }

    // 2. 满 X 减 Y
    const fullMatch = trimmed.match(/满\s*(\d+)\s*(?:减|省)\s*(\d+)/);
    if (fullMatch) {
      const threshold = parseInt(fullMatch[1], 10);
      const discount = parseInt(fullMatch[2], 10);

      if (/88vip|消费券|大促券/i.test(trimmed)) {
        rules.push({
          id: `promo-rule-${Date.now()}-${rules.length}`,
          name: trimmed,
          type: 'PLATFORM_COUPON',
          threshold,
          discount,
          enabled: true,
        });
      } else if (/家电|数码|母婴|美妆|服饰/i.test(trimmed)) {
        let cat = '大家电';
        if (/母婴/.test(trimmed)) cat = '母婴用品';
        else if (/数码/.test(trimmed)) cat = '数码配件';
        rules.push({
          id: `promo-rule-${Date.now()}-${rules.length}`,
          name: trimmed,
          type: 'CATEGORY_COUPON',
          threshold,
          discount,
          targetCategory: cat,
          enabled: true,
        });
      } else {
        rules.push({
          id: `promo-rule-${Date.now()}-${rules.length}`,
          name: trimmed,
          type: 'SHOP_COUPON',
          threshold,
          discount,
          enabled: true,
        });
      }
      continue;
    }

    // 3. 红包
    const redMatch = trimmed.match(/(\d+)\s*(?:元)?\s*(?:现金)?红包/);
    if (redMatch) {
      rules.push({
        id: `promo-rule-${Date.now()}-${rules.length}`,
        name: `${redMatch[1]}元现金红包`,
        type: 'RED_PACKET',
        threshold: 0,
        discount: parseInt(redMatch[1], 10),
        enabled: true,
      });
      continue;
    }

    // 4. 折扣 / 立减
    const discountMatch = trimmed.match(/(\d(?:\.\d)?)\s*折/);
    if (discountMatch) {
      const rate = parseFloat(discountMatch[1]) / 10;
      rules.push({
        id: `promo-rule-${Date.now()}-${rules.length}`,
        name: `官方立减 ${discountMatch[1]}折`,
        type: 'OFFICIAL_DISCOUNT',
        threshold: 0,
        discount: 0,
        discountRate: rate,
        enabled: true,
      });
      continue;
    }
  }

  if (rules.length === 0) {
    // Default fallback rule
    rules.push({
      id: `promo-rule-default`,
      name: '跨店每满300减50',
      type: 'CROSS_SHOP_FULL_REDUCTION',
      threshold: 300,
      discount: 50,
      isTiered: true,
      enabled: true,
    });
  }

  return rules;
}

// ====================================================
// GitHub Sync & Export APIs
// ====================================================

app.post('/api/sync-github', async (req: Request, res: Response) => {
  try {
    const { token, repoName = '网购优惠计算助手', isPrivate = false, description } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: '请提供有效的 GitHub Personal Access Token' });
    }

    const cleanToken = token.trim();
    const defaultDesc = description || '网购优惠计算助手 - 电商满减与凑单优化工具';

    // 1. Verify token & get user identity
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        'User-Agent': 'ShoppingDiscountOptimizer-App',
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!userRes.ok) {
      const errJson: any = await userRes.json().catch(() => ({}));
      return res.status(401).json({
        error: `GitHub 身份验证失败: ${errJson.message || userRes.statusText}。请检查 Token 是否有效并具有 repo 权限。`,
      });
    }

    const userData: any = await userRes.json();
    const username = userData.login;

    // 2. Determine repo name
    let targetRepoName = (repoName || '').trim() || '网购优惠计算助手';

    // Attempt creation with requested repo name
    let createRes = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        'User-Agent': 'ShoppingDiscountOptimizer-App',
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: targetRepoName,
        description: defaultDesc,
        private: !!isPrivate,
        auto_init: false,
      }),
    });

    if (!createRes.ok) {
      const err: any = await createRes.json().catch(() => ({}));
      // If validation failed because name contains characters disallowed by GitHub, try fallback ASCII slug
      const isNameInvalid = err.errors && err.errors.some((e: any) => e.field === 'name');
      if (isNameInvalid) {
        const fallbackName = 'shopping-discount-optimizer';
        createRes = await fetch('https://api.github.com/user/repos', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${cleanToken}`,
            'User-Agent': 'ShoppingDiscountOptimizer-App',
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: fallbackName,
            description: `${targetRepoName} - ${defaultDesc}`,
            private: !!isPrivate,
            auto_init: false,
          }),
        });

        if (createRes.ok) {
          targetRepoName = fallbackName;
        } else {
          const err2: any = await createRes.json().catch(() => ({}));
          if (createRes.status === 422 && err2.message?.includes('already exists')) {
            targetRepoName = fallbackName;
          } else {
            return res.status(400).json({
              error: `创建仓库失败: ${err2.message || err.message || '参数校验未通过'}`,
            });
          }
        }
      } else if (createRes.status === 422 && err.message?.includes('already exists')) {
        // Repo already exists, push to existing repo
      } else {
        return res.status(400).json({
          error: `创建仓库失败: ${err.message || '未知错误'}`,
        });
      }
    }

    // 3. Git commit & push
    const cwd = path.resolve(__dirname);
    try {
      await execPromise(`git add . && (git commit -m "feat: sync repository files" || true)`, { cwd });
      const pushUrl = `https://x-access-token:${cleanToken}@github.com/${username}/${encodeURIComponent(targetRepoName)}.git`;
      await execPromise(`git remote remove origin 2>/dev/null || true`, { cwd });
      await execPromise(`git remote add origin "${pushUrl}"`, { cwd });
      await execPromise(`git branch -M main`, { cwd });
      await execPromise(`git push -u origin main --force`, { cwd });
      // Remove token from git remote config for safety
      const cleanRemoteUrl = `https://github.com/${username}/${encodeURIComponent(targetRepoName)}.git`;
      await execPromise(`git remote set-url origin "${cleanRemoteUrl}"`, { cwd });
    } catch (gitErr: any) {
      console.error('Git push failed:', gitErr);
      return res.status(500).json({
        error: `代码推送到 GitHub 失败: ${gitErr.stderr || gitErr.message}`,
      });
    }

    const htmlUrl = `https://github.com/${username}/${encodeURIComponent(targetRepoName)}`;
    return res.json({
      success: true,
      repoUrl: htmlUrl,
      repoName: targetRepoName,
      owner: username,
    });
  } catch (error: any) {
    console.error('Error syncing to GitHub:', error);
    return res.status(500).json({
      error: error.message || '同步到 GitHub 过程中出现异常',
    });
  }
});

app.get('/api/export-zip', async (_req: Request, res: Response) => {
  try {
    const cwd = path.resolve(__dirname);
    const zipPath = path.resolve('/tmp', `shopping-calculator-${Date.now()}.zip`);
    await execPromise(`git archive --format=zip -o "${zipPath}" HEAD`, { cwd });
    res.download(zipPath, '网购优惠计算助手-源码.zip', (err) => {
      execPromise(`rm -f "${zipPath}"`).catch(() => {});
    });
  } catch (err: any) {
    res.status(500).json({ error: '导出压缩包失败: ' + err.message });
  }
});

// ====================================================
// Vite Integration in Development
// ====================================================
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
