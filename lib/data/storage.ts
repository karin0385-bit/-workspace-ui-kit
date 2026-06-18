/**
 * localStorage ユーティリティ。
 * サーバーサイドレンダリング（SSR）時はスキップする。
 */

import {
  storeSchema,
  settingsSchema,
  categoryPricingModeSchema,
  DEFAULT_SETTINGS,
  DEFAULT_CATEGORY_MARKUPS,
  DEFAULT_CATEGORY_PRICING_MODES,
  CATEGORY_ORDER,
  type Store,
  type Settings,
  type CategoryMarkups,
  type CategoryPricingModes,
  type Category,
} from "@/lib/schema";

const KEYS = {
  stores: "sake-tool:stores",
  settings: "sake-tool:settings",
  selectedStoreId: "sake-tool:selected-store-id",
} as const;

// ===== 店舗マスター =====

/** 数値または数値文字列を正の数に変換する。 */
function toPositiveNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

/** 旧「掛け率＝倍率」（1.3 等）を割り算係数（0.8 等）へ変換する。 */
export function normalizeMarkupDivisor(value: number): number {
  if (value <= 0) return DEFAULT_CATEGORY_MARKUPS.日本酒;
  // 1.0 は旧データの「掛率なし」→ 0.8（仕入÷0.8）へ移行
  if (value >= 0.99 && value <= 1.01) return DEFAULT_CATEGORY_MARKUPS.日本酒;
  // 1 より大きい値は旧形式（仕入 × 掛け率）とみなし、同等の割り算係数へ変換
  if (value > 1) return Math.round((1 / value) * 10000) / 10000;
  return value;
}

/** categoryMarkups に有効な値が入っているか。 */
function hasExplicitCategoryMarkups(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const m = raw as Record<string, unknown>;
  return CATEGORY_ORDER.some((cat) => toPositiveNumber(m[cat]) !== null);
}

/** 旧形式・欠損キーを含む categoryMarkups を正規化する。 */
export function normalizeCategoryMarkups(
  raw: unknown,
  legacyMarkup?: unknown,
): CategoryMarkups {
  const result = { ...DEFAULT_CATEGORY_MARKUPS };

  // categoryMarkups が明示されていれば legacy の単一 markup は使わない
  const useLegacyMarkup =
    !hasExplicitCategoryMarkups(raw) && toPositiveNumber(legacyMarkup) !== null;

  if (useLegacyMarkup) {
    const divisor = normalizeMarkupDivisor(toPositiveNumber(legacyMarkup)!);
    for (const cat of CATEGORY_ORDER) {
      result[cat] = divisor;
    }
    return result;
  }

  if (!raw || typeof raw !== "object") return result;

  const m = { ...(raw as Record<string, unknown>) };
  if ("ウイスキー・スピリッツ" in m && !("ウイスキー" in m)) {
    m["ウイスキー"] = m["ウイスキー・スピリッツ"];
  }

  for (const cat of CATEGORY_ORDER) {
    const value = toPositiveNumber(m[cat]);
    if (value !== null) {
      result[cat as Category] = normalizeMarkupDivisor(value);
    }
  }

  return result;
}

/** categoryPricingModes を正規化する（不正値・欠損はデフォルト値で補完）。 */
export function normalizeCategoryPricingModes(raw: unknown): CategoryPricingModes {
  const result = { ...DEFAULT_CATEGORY_PRICING_MODES };
  if (!raw || typeof raw !== "object") return result;
  const m = raw as Record<string, unknown>;
  for (const cat of CATEGORY_ORDER) {
    const parsed = categoryPricingModeSchema.safeParse(m[cat]);
    if (parsed.success) {
      result[cat as Category] = parsed.data;
    }
  }
  return result;
}

function parseStoreCandidate(raw: unknown): Store | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const candidate = {
    id: typeof o.id === "string" ? o.id : String(o.id ?? ""),
    name: typeof o.name === "string" ? o.name : "",
    categoryMarkups: normalizeCategoryMarkups(o.categoryMarkups, o.markup),
    categoryPricingModes: normalizeCategoryPricingModes(o.categoryPricingModes),
  };
  const parsed = storeSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

function parseStoresArray(raw: unknown): Store[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => parseStoreCandidate(item)).filter((store): store is Store => store !== null);
}

function writeStoresToStorage(stores: Store[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.stores, JSON.stringify(stores));
}

export function loadStores(): Store[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEYS.stores);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    const stores = parseStoresArray(parsed);
    if (stores.length > 0) {
      writeStoresToStorage(stores);
    }
    return stores;
  } catch {
    return [];
  }
}

export function saveStores(stores: Store[]): void {
  if (typeof window === "undefined") return;
  const normalized = stores
    .map((store) =>
      storeSchema.safeParse({
        ...store,
        categoryMarkups: normalizeCategoryMarkups(store.categoryMarkups),
      }),
    )
    .flatMap((parsed) => (parsed.success ? [parsed.data] : []));
  writeStoresToStorage(normalized);
}

export function loadSelectedStoreId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEYS.selectedStoreId);
}

export function saveSelectedStoreId(storeId: string | null): void {
  if (typeof window === "undefined") return;
  if (storeId) {
    localStorage.setItem(KEYS.selectedStoreId, storeId);
  } else {
    localStorage.removeItem(KEYS.selectedStoreId);
  }
}

// ===== 会社設定 =====

export function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(KEYS.settings);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as unknown;
    const result = settingsSchema.safeParse(parsed);
    if (result.success) return result.data;
    // スキーマ検証に失敗しても、取り出せるフィールドだけ使う
    if (parsed && typeof parsed === "object") {
      const o = parsed as Record<string, unknown>;
      return {
        companyName: typeof o.companyName === "string" ? o.companyName : "",
        address: typeof o.address === "string" ? o.address : "",
        tel: typeof o.tel === "string" ? o.tel : "",
        staffName: typeof o.staffName === "string" ? o.staffName : "",
      };
    }
    return DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.settings, JSON.stringify(settings));
}

// ===== 設定のエクスポート／インポート =====

/** 店舗マスター＋会社設定を JSON ファイルとしてダウンロードする。 */
export function exportSettingsAsJson(stores: Store[], settings: Settings): void {
  const data = { stores, settings };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sake-tool-settings-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** JSON テキストから店舗マスター＋会社設定を復元する。失敗時は null を返す。 */
export function importSettingsFromJson(
  jsonText: string,
): { stores: Store[]; settings: Settings } | null {
  try {
    const raw = JSON.parse(jsonText) as unknown;
    if (!raw || typeof raw !== "object") return null;
    const o = raw as Record<string, unknown>;
    const stores = parseStoresArray(o.stores);
    const settingsResult = settingsSchema.safeParse(o.settings);
    const settings = settingsResult.success ? settingsResult.data : DEFAULT_SETTINGS;
    return { stores, settings };
  } catch {
    return null;
  }
}
