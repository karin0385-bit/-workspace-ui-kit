/**
 * 業務用酒類販売ツールの Zod スキーマと派生型。
 * UI コンポーネントはここから型をインポートする。
 */

import { z } from "zod";

// ===== カテゴリ =====

export const categorySchema = z.enum([
  "日本酒",
  "ワイン",
  "焼酎",
  "ウイスキー",
  "ジン",
  "ビール",
  "シードル",
]);
export type Category = z.infer<typeof categorySchema>;

export const CATEGORY_ORDER = categorySchema.options;

// ===== 業態 =====

export const businessTypeIdSchema = z.enum([
  "japanese",
  "izakaya",
  "western",
  "chinese",
  "hotel",
  "bistro",
  "multicultural",
  "cafe",
]);
export type BusinessTypeId = z.infer<typeof businessTypeIdSchema>;

/** 業態マスター。カテゴリ優先順位を持つ。 */
export const businessTypeSchema = z.object({
  id: businessTypeIdSchema,
  label: z.string(),
  /** カテゴリの優先順位。先頭ほど優先度が高い。 */
  categoryPriority: z.array(categorySchema),
});
export type BusinessType = z.infer<typeof businessTypeSchema>;

// ===== 商品（在庫 CSV 1行に対応）=====

/**
 * 在庫 CSV の1行。ブラウザ上で CSV を読み込んだ後にパースして使う。
 *
 * CSV 列順（ヘッダー行必須）:
 *   商品名, カテゴリ, 色, スパーク, ボディ, メーカー, 産地, 地名, 容量, 価格, 小売価格, コメント, 味わい, 画像
 */
export const productSchema = z.object({
  /** 商品名 */
  name: z.string(),
  /** メーカー／蔵元 */
  maker: z.string(),
  /** 産地（日本酒: 都道府県、ワイン: 国名 など） */
  origin: z.string(),
  /** 地名（市区町村・産地詳細。空欄可） */
  locality: z.string(),
  /** 仕入価格（円）。CSV では「価格」列。 */
  costPrice: z.number(),
  /** 小売価格（円）。CSV「小売価格」列。日本酒・長野県ワインの見積単価に使用。 */
  retailPrice: z.number(),
  /** 容量（例: 720ml）。空欄可。 */
  capacity: z.string(),
  /** 商品コメント */
  comment: z.string(),
  /** 味わい */
  flavor: z.string(),
  /** カテゴリ */
  category: categorySchema,
  /** ワイン色調（赤 / 白 / ロゼ など）。空欄可。 */
  color: z.string(),
  /** スパークリング区分（空欄可） */
  spark: z.string(),
  /** ボディ感（フルボディ など。空欄可） */
  body: z.string(),
  /** public/products/ または画像フォルダ内のファイル名（CSV「画像」列）。空欄可。 */
  imageFile: z.string(),
  /** active: 提案対象、inactive: 非表示 */
  status: z.enum(["active", "inactive"]),
});
export type Product = z.infer<typeof productSchema>;

// ===== 店舗マスター（localStorage 保存）=====

/**
 * カテゴリ別掛け率（割り算係数）。
 * 販売単価 = 仕入価格 ÷ 掛け率。例: 仕入 800 円・掛け率 0.8 → 800 ÷ 0.8 = 1,000 円
 */
export const categoryMarkupsSchema = z.object({
  日本酒: z.number().positive(),
  ワイン: z.number().positive(),
  焼酎: z.number().positive(),
  ウイスキー: z.number().positive(),
  ジン: z.number().positive(),
  ビール: z.number().positive(),
  シードル: z.number().positive(),
});
export type CategoryMarkups = z.infer<typeof categoryMarkupsSchema>;

export const DEFAULT_CATEGORY_MARKUPS: CategoryMarkups = {
  日本酒: 0.8,
  ワイン: 0.8,
  焼酎: 0.8,
  ウイスキー: 0.8,
  ジン: 0.8,
  ビール: 0.8,
  シードル: 0.8,
};

/**
 * カテゴリ別の価格計算モード。
 * - cost_divide   : 仕入価格 ÷ 掛率（例: 仕入 800 ÷ 0.8 = 1,000 円）
 * - retail_multiply: 小売価格 × 係数（例: 小売 1,000 × 0.9 = 900 円）
 */
export const categoryPricingModeSchema = z.enum(["cost_divide", "retail_multiply"]);
export type CategoryPricingMode = z.infer<typeof categoryPricingModeSchema>;

export const categoryPricingModesSchema = z.object({
  日本酒: categoryPricingModeSchema,
  ワイン: categoryPricingModeSchema,
  焼酎: categoryPricingModeSchema,
  ウイスキー: categoryPricingModeSchema,
  ジン: categoryPricingModeSchema,
  ビール: categoryPricingModeSchema,
  シードル: categoryPricingModeSchema,
});
export type CategoryPricingModes = z.infer<typeof categoryPricingModesSchema>;

export const DEFAULT_CATEGORY_PRICING_MODES: CategoryPricingModes = {
  日本酒: "cost_divide",
  ワイン: "cost_divide",
  焼酎: "cost_divide",
  ウイスキー: "cost_divide",
  ジン: "cost_divide",
  ビール: "cost_divide",
  シードル: "cost_divide",
};

/** 得意先店舗。カテゴリ別に掛け率と価格計算モードを管理する。 */
export const storeSchema = z.object({
  id: z.string(),
  /** 店舗名 */
  name: z.string(),
  /** カテゴリ別掛け率 */
  categoryMarkups: categoryMarkupsSchema,
  /** カテゴリ別価格計算モード（省略時は全カテゴリ cost_divide） */
  categoryPricingModes: categoryPricingModesSchema.optional(),
});
export type Store = z.infer<typeof storeSchema>;

export const storesSchema = z.array(storeSchema);

// ===== 会社設定（localStorage 保存）=====

export const settingsSchema = z.object({
  companyName: z.string(),
  address: z.string(),
  tel: z.string(),
  /** 担当者名（見積書に記載） */
  staffName: z.string(),
});
export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  companyName: "",
  address: "",
  tel: "",
  staffName: "",
};

// ===== フィルター条件 =====

/** Pane1 で選択するフィルター条件。 */
export const filterSchema = z.object({
  businessTypeId: businessTypeIdSchema.nullable(),
  /** カテゴリ絞り込み（複数選択可）。空配列 = すべてのカテゴリを対象 */
  categories: z.array(categorySchema),
  /** 仕入価格の上限（円）。null = 上限なし */
  maxCostPrice: z.number().nullable(),
  /** 産地フィルター（部分一致）。空文字 = フィルターなし */
  origin: z.string(),
  /** 提案件数の上限（1〜20）。デフォルト5件。 */
  maxSelect: z.number().int().min(1).max(20),
});
export type Filter = z.infer<typeof filterSchema>;

export const DEFAULT_FILTER: Filter = {
  businessTypeId: null,
  categories: [],
  maxCostPrice: null,
  origin: "",
  maxSelect: 5,
};

// ===== 提案・見積書 =====

/** 見積書1行 */
export const quoteLineSchema = z.object({
  product: productSchema,
  /** 数量（本） */
  quantity: z.number().int().min(1),
  /** 販売価格（仕入価格 ÷ 掛け率、UI 上で上書き可） */
  sellingPrice: z.number(),
});
export type QuoteLine = z.infer<typeof quoteLineSchema>;

/** 見積書全体 */
export const quoteSchema = z.object({
  /** 採番（YYYY-MM-DD-NNN 形式で自動生成） */
  quoteNumber: z.string(),
  /** 作成日 */
  date: z.string(),
  /** 有効期限 */
  validUntil: z.string(),
  store: storeSchema,
  lines: z.array(quoteLineSchema),
});
export type Quote = z.infer<typeof quoteSchema>;

// ===== Workspace 全体の UI 状態 =====

/** Pane2 で選択中の商品インデックス（提案書・見積書に連動）。 */
export type SelectedProducts = Product[];
