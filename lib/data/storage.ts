/**
 * localStorage ユーティリティ。
 * サーバーサイドレンダリング（SSR）時はスキップする。
 */

import {
  storesSchema,
  settingsSchema,
  DEFAULT_SETTINGS,
  type Store,
  type Settings,
} from "@/lib/schema";

const KEYS = {
  stores: "sake-tool:stores",
  settings: "sake-tool:settings",
} as const;

// ===== 店舗マスター =====

export function loadStores(): Store[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEYS.stores);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // スキーマ変更マイグレーション: "ウイスキー・スピリッツ" → "ウイスキー"
    const migrated = migrateStores(parsed);
    return storesSchema.parse(migrated);
  } catch {
    return [];
  }
}

/** カテゴリキー名の変更に対応するマイグレーション */
function migrateStores(stores: unknown): unknown {
  if (!Array.isArray(stores)) return stores;
  return stores.map((s) => {
    if (!s || typeof s !== "object") return s;
    const markups = (s as Record<string, unknown>).categoryMarkups;
    if (!markups || typeof markups !== "object") return s;
    const m = markups as Record<string, unknown>;
    if ("ウイスキー・スピリッツ" in m && !("ウイスキー" in m)) {
      const { "ウイスキー・スピリッツ": w, ...rest } = m;
      return {
        ...s,
        categoryMarkups: {
          ...rest,
          ウイスキー: w,
          ジン: w,
          ビール: w,
          シードル: w,
        },
      };
    }
    return s;
  });
}

export function saveStores(stores: Store[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.stores, JSON.stringify(stores));
}

// ===== 会社設定 =====

export function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(KEYS.settings);
    if (!raw) return DEFAULT_SETTINGS;
    return settingsSchema.parse(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.settings, JSON.stringify(settings));
}
