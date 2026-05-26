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
 *   商品名, #REF!, カテゴリ, 色, スパーク, ボディ, 品種, メーカー, 産地, 価格, コメント, 味わい
 */
export const productSchema = z.object({
  /** 商品名 */
  name: z.string(),
  /** メーカー／蔵元 */
  maker: z.string(),
  /** 産地（日本酒: 都道府県/市区町村、ワイン: 国名） */
  origin: z.string(),
  /** 仕入価格（円）。CSV では「価格」列。 */
  costPrice: z.number(),
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
  /** 品種（ブドウ品種など。空欄可） */
  variety: z.string(),
  /** public/products/ 配下の画像ファイル名（例: sake-001.jpg）。空欄可。 */
  imageFile: z.string(),
  /** active: 提案対象、inactive: 非表示 */
  status: z.enum(["active", "inactive"]),
});
export type Product = z.infer<typeof productSchema>;

// ===== 店舗マスター（localStorage 保存）=====

/**
 * カテゴリ別掛け率。
 * 例: { "日本酒": 1.5, "ワイン": 1.3, "焼酎": 1.4, "ウイスキー": 1.6 }
 */
export const categoryMarkupsSchema = z.object({
  日本酒: z.number().min(0),
  ワイン: z.number().min(0),
  焼酎: z.number().min(0),
  ウイスキー: z.number().min(0),
  ジン: z.number().min(0),
  ビール: z.number().min(0),
  シードル: z.number().min(0),
});
export type CategoryMarkups = z.infer<typeof categoryMarkupsSchema>;

export const DEFAULT_CATEGORY_MARKUPS: CategoryMarkups = {
  日本酒: 1.3,
  ワイン: 1.3,
  焼酎: 1.3,
  ウイスキー: 1.3,
  ジン: 1.3,
  ビール: 1.3,
  シードル: 1.3,
};

/** 得意先店舗。カテゴリ別に掛け率を管理する。 */
export const storeSchema = z.object({
  id: z.string(),
  /** 店舗名 */
  name: z.string(),
  /** カテゴリ別掛け率 */
  categoryMarkups: categoryMarkupsSchema,
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
  /** 販売価格（仕入価格 × 掛け率、UI 上で上書き可） */
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
