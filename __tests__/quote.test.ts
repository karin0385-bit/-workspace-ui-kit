import { describe, it, expect } from "vitest";
import {
  calcSellingPrice,
  buildPricedQuoteLines,
  dedupeQuoteLines,
  resolveActiveStore,
  isNaganoWine,
  usesRetailPrice,
  getCategoryPricingMode,
} from "@/lib/computed/quote";
import { normalizeCategoryMarkups } from "@/lib/data/storage";
import { DEFAULT_CATEGORY_MARKUPS, type Product, type Store } from "@/lib/schema";

const product: Product = {
  name: "テスト日本酒",
  maker: "テスト酒造",
  origin: "長野県",
  locality: "佐久市",
  costPrice: 1000,
  retailPrice: 1500,
  capacity: "720ml",
  comment: "",
  flavor: "辛口",
  category: "日本酒",
  color: "",
  spark: "",
  body: "",
  imageFile: "",
  status: "active",
};

const store: Store = {
  id: "s-1",
  name: "テスト店",
  categoryMarkups: { ...DEFAULT_CATEGORY_MARKUPS, 日本酒: 0.8 },
};

describe("resolveActiveStore", () => {
  it("選択店舗がなければ先頭店舗を使う", () => {
    expect(resolveActiveStore([store], null)?.id).toBe("s-1");
  });
});

describe("isNaganoWine / usesRetailPrice", () => {
  it("長野県産ワインを判定する", () => {
    const naganoWine: Product = {
      ...product,
      category: "ワイン",
      origin: "長野県",
      retailPrice: 2800,
    };
    expect(isNaganoWine(naganoWine)).toBe(true);
    expect(usesRetailPrice(naganoWine)).toBe(true);
  });

  it("フランスワインは小売価格固定にしない", () => {
    const frenchWine: Product = {
      ...product,
      category: "ワイン",
      origin: "フランス",
      retailPrice: 5000,
    };
    expect(isNaganoWine(frenchWine)).toBe(false);
    expect(usesRetailPrice(frenchWine)).toBe(false);
  });
});

describe("getCategoryPricingMode", () => {
  it("categoryPricingModes 未設定時は cost_divide を返す", () => {
    expect(getCategoryPricingMode(store, "ワイン")).toBe("cost_divide");
  });

  it("retail_multiply に設定した店舗は retail_multiply を返す", () => {
    const retailStore: typeof store = {
      ...store,
      categoryPricingModes: {
        日本酒: "cost_divide",
        ワイン: "retail_multiply",
        焼酎: "cost_divide",
        ウイスキー: "cost_divide",
        ジン: "cost_divide",
        ビール: "cost_divide",
        シードル: "cost_divide",
      },
    };
    expect(getCategoryPricingMode(retailStore, "ワイン")).toBe("retail_multiply");
    expect(getCategoryPricingMode(retailStore, "焼酎")).toBe("cost_divide");
  });
});

describe("calcSellingPrice", () => {
  it("日本酒は掛率に関わらず小売価格を使う", () => {
    expect(calcSellingPrice(product, store)).toBe(1500);
  });

  it("長野県ワインは掛率に関わらず小売価格を使う", () => {
    const naganoWine: Product = {
      ...product,
      category: "ワイン",
      origin: "長野県",
      costPrice: 2000,
      retailPrice: 2800,
    };
    expect(calcSellingPrice(naganoWine, store)).toBe(2800);
  });

  it("その他カテゴリは店舗の掛け率を反映する（仕入 ÷ 掛け率）", () => {
    const whiskey: Product = {
      ...product,
      category: "ウイスキー",
      costPrice: 1000,
      retailPrice: 2000,
    };
    expect(calcSellingPrice(whiskey, store)).toBe(1250);
  });

  it("店舗未選択時は仕入価格のまま（小売価格固定以外）", () => {
    const whiskey: Product = {
      ...product,
      category: "ウイスキー",
      costPrice: 1000,
      retailPrice: 2000,
    };
    expect(calcSellingPrice(whiskey, null)).toBe(1000);
  });

  it("retail_multiply モードのワインは 小売価格×係数 を使う", () => {
    const frenchWine: Product = {
      ...product,
      category: "ワイン",
      origin: "フランス",
      costPrice: 3000,
      retailPrice: 4400,
    };
    const retailStore: typeof store = {
      ...store,
      categoryMarkups: { ...DEFAULT_CATEGORY_MARKUPS, ワイン: 0.9 },
      categoryPricingModes: {
        日本酒: "cost_divide",
        ワイン: "retail_multiply",
        焼酎: "cost_divide",
        ウイスキー: "cost_divide",
        ジン: "cost_divide",
        ビール: "cost_divide",
        シードル: "cost_divide",
      },
    };
    expect(calcSellingPrice(frenchWine, retailStore)).toBe(Math.ceil(4400 * 0.9));
  });
});

describe("dedupeQuoteLines", () => {
  it("同一商品の重複行を除去する", () => {
    const lines = [
      { product, quantity: 1, sellingPrice: 1000 },
      { product, quantity: 1, sellingPrice: 1000 },
    ];
    expect(dedupeQuoteLines(lines)).toHaveLength(1);
  });
});

describe("buildPricedQuoteLines", () => {
  it("日本酒明細の販売単価を小売価格にする", () => {
    const lines = [{ product, quantity: 1, sellingPrice: 1000 }];
    const updated = buildPricedQuoteLines(lines, store, {});
    expect(updated[0].sellingPrice).toBe(1500);
  });

  it("茜さす純米大吟醸は小売価格4000円を使う", () => {
    const akane = {
      ...product,
      name: "茜さす　純米大吟醸",
      costPrice: 3000,
      retailPrice: 4000,
    };
    const lines = [{ product: akane, quantity: 1, sellingPrice: 3000 }];
    expect(buildPricedQuoteLines(lines, store, {})[0].sellingPrice).toBe(4000);
  });

  it("ウイスキーは掛率0.8で1225円にする", () => {
    const spark = {
      ...product,
      name: "テストウイスキー",
      category: "ウイスキー" as const,
      costPrice: 980,
      retailPrice: 1500,
    };
    const lines = [{ product: spark, quantity: 1, sellingPrice: 980 }];
    expect(buildPricedQuoteLines(lines, store, {})[0].sellingPrice).toBe(1225);
  });

  it("手動入力単価を優先する", () => {
    const lines = [{ product, quantity: 1, sellingPrice: 1000 }];
    const key = `${product.name}|${product.maker}|${product.costPrice}`;
    const updated = buildPricedQuoteLines(lines, store, { [key]: 1600 });
    expect(updated[0].sellingPrice).toBe(1600);
  });
});

describe("normalizeCategoryMarkups", () => {
  it("旧単一 markup（倍率）を割り算係数に変換する", () => {
    const result = normalizeCategoryMarkups(undefined, 1.6);
    expect(result.日本酒).toBe(0.625);
    expect(result.ジン).toBe(0.625);
  });

  it("categoryMarkups がある場合は legacy markup を無視する", () => {
    const result = normalizeCategoryMarkups(
      { 日本酒: 0.8, ワイン: 0.8, 焼酎: 0.8, ウイスキー: 0.8, ジン: 0.8, ビール: 0.8, シードル: 0.8 },
      1.0,
    );
    expect(result.日本酒).toBe(0.8);
  });

  it("1.0 の掛け率は 0.8 へ移行する", () => {
    const result = normalizeCategoryMarkups({ 日本酒: 1.0, ワイン: 1.0, 焼酎: 1.0, ウイスキー: 1.0, ジン: 1.0, ビール: 1.0, シードル: 1.0 });
    expect(result.日本酒).toBe(0.8);
  });

  it("旧形式の倍率（1 超）を割り算係数へ変換する", () => {
    const result = normalizeCategoryMarkups({ 日本酒: 1.5, ワイン: 1.4 });
    expect(result.日本酒).toBeCloseTo(0.6667, 4);
    expect(result.ワイン).toBeCloseTo(0.7143, 4);
  });

  it("文字列の掛け率も読み込める", () => {
    const result = normalizeCategoryMarkups({ 日本酒: "0.8", ワイン: "1.4" });
    expect(result.日本酒).toBe(0.8);
    expect(result.ワイン).toBeCloseTo(0.7143, 4);
  });

  it("欠損カテゴリをデフォルト値で補完する", () => {
    const result = normalizeCategoryMarkups({ 日本酒: 0.75, ワイン: 0.85 });
    expect(result.日本酒).toBe(0.75);
    expect(result.ジン).toBe(DEFAULT_CATEGORY_MARKUPS.ジン);
  });
});
