/**
 * 見積書の販売価格計算。
 */

import {
  type Product,
  type Store,
  type Category,
  type CategoryPricingMode,
  type QuoteLine,
  DEFAULT_CATEGORY_MARKUPS,
} from "@/lib/schema";

/** 店舗マスターからカテゴリの掛け率（割り算係数）を取得する。 */
export function getCategoryMarkup(
  store: Store | null | undefined,
  category: Category,
): number | null {
  if (!store) return null;
  const fromStore = store.categoryMarkups[category];
  if (typeof fromStore === "number" && fromStore > 0) return fromStore;
  const fallback = DEFAULT_CATEGORY_MARKUPS[category];
  if (typeof fallback === "number" && fallback > 0) return fallback;
  return null;
}

/** 選択中店舗 ID が未設定のときは先頭店舗を見積計算に使う。 */
export function resolveActiveStore(
  storeList: Store[],
  selectedStoreId: string | null,
): Store | null {
  if (selectedStoreId) {
    const found = storeList.find((s) => s.id === selectedStoreId);
    if (found) return found;
  }
  return storeList[0] ?? null;
}

/** 長野県産ワイン（産地に「長野」を含むワイン）。 */
export function isNaganoWine(product: Product): boolean {
  return product.category === "ワイン" && product.origin.includes("長野");
}

/** 見積単価を小売価格で固定する商品（掛率を適用しない）。 */
export function usesRetailPrice(product: Product): boolean {
  return product.category === "日本酒" || isNaganoWine(product);
}

/** 小売価格を見積単価に使う。未設定時は仕入価格にフォールバック。 */
export function resolveRetailUnitPrice(product: Product): number {
  if (product.retailPrice > 0) {
    return Math.ceil(product.retailPrice);
  }
  return Math.ceil(product.costPrice);
}

/** カテゴリの価格計算モードを取得する（未設定時は cost_divide）。 */
export function getCategoryPricingMode(
  store: Store | null | undefined,
  category: Category,
): CategoryPricingMode {
  if (!store?.categoryPricingModes) return "cost_divide";
  return store.categoryPricingModes[category] ?? "cost_divide";
}

/** 店舗のカテゴリ別掛け率・モードから販売単価（円・切り上げ）を算出する。 */
export function calcSellingPrice(
  product: Product,
  store: Store | null | undefined,
): number {
  if (usesRetailPrice(product)) {
    return resolveRetailUnitPrice(product);
  }

  if (!store) {
    return Math.ceil(product.costPrice);
  }
  const markup = getCategoryMarkup(store, product.category);
  if (markup === null) {
    return Math.ceil(product.costPrice);
  }

  const mode = getCategoryPricingMode(store, product.category);
  if (mode === "retail_multiply") {
    if (product.retailPrice > 0) {
      return Math.ceil(product.retailPrice * markup);
    }
    return Math.ceil(product.costPrice);
  }

  return Math.ceil(product.costPrice / markup);
}

/** 商品の同一性キー（同名商品の区別用） */
export function productKey(product: Product): string {
  return `${product.name}|${product.maker}|${product.costPrice}`;
}

/** 見積明細の重複行を除去する（先頭のみ残す）。 */
export function dedupeQuoteLines<T extends { product: Product }>(lines: T[]): T[] {
  const seen = new Set<string>();
  return lines.filter((line) => {
    const key = productKey(line.product);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** 見積明細の販売単価を決定する（手動入力 > 店舗掛率 > 仕入価格）。 */
export function resolveQuoteLineUnitPrice(
  line: QuoteLine,
  store: Store | null | undefined,
  manualUnitPrices: Readonly<Record<string, number>>,
): number {
  const key = productKey(line.product);
  const manual = manualUnitPrices[key];
  if (typeof manual === "number" && Number.isFinite(manual) && manual >= 0) {
    return manual;
  }
  return calcSellingPrice(line.product, store);
}

/** 見積明細に確定した販売単価を付与する。 */
export function buildPricedQuoteLines(
  lines: QuoteLine[],
  store: Store | null | undefined,
  manualUnitPrices: Readonly<Record<string, number>>,
): QuoteLine[] {
  return lines.map((line) => ({
    ...line,
    sellingPrice: resolveQuoteLineUnitPrice(line, store, manualUnitPrices),
  }));
}
