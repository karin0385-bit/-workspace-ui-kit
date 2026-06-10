/**
 * 在庫 CSV のパースユーティリティ。
 *
 * 期待する CSV ヘッダー行（実ファイル形式）:
 *   商品名, カテゴリ, 色, スパーク, ボディ, メーカー, 産地, 地名, 価格, コメント, 味わい, 画像
 *
 * ・文字コード: Shift-JIS（読み込み側で shift_jis 指定）
 * ・「価格」列が仕入価格として使われる
 * ・「画像」列にファイル名（例: sake-001.jpg）を記入。画像フォルダ読込にも対応
 * ・カテゴリが空欄の行はスキップ（エラーカウントに含む）
 */

import { productSchema, type Product } from "@/lib/schema";
import { normalizeImageFile } from "@/lib/computed/product-image";

/** 必須列（これらがヘッダーにない場合は読み込みエラー） */
const REQUIRED_HEADERS = [
  "商品名",
  "メーカー",
  "産地",
  "価格",
  "コメント",
  "味わい",
  "カテゴリ",
] as const;

export type CsvParseResult =
  | { ok: true; products: Product[] }
  | { ok: false; error: string };

/** CSV テキストを Product[] にパースする。ヘッダー行必須。 */
export function parseCsv(text: string): CsvParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    // 全列が空（カンマだけ）の行を除去
    .filter((l) => l.length > 0 && l.replace(/,/g, "").trim().length > 0);

  if (lines.length < 2) {
    return { ok: false, error: "CSVにデータ行がありません。" };
  }

  const headers = splitCsvLine(lines[0]);

  for (const expected of REQUIRED_HEADERS) {
    if (!headers.includes(expected)) {
      return {
        ok: false,
        error: `CSVヘッダーに「${expected}」列が見つかりません。`,
      };
    }
  }

  const idx = (col: string) => headers.indexOf(col);
  const imageCol =
    idx("画像") >= 0 ? "画像" : idx("画像ファイル名") >= 0 ? "画像ファイル名" : null;

  const products: Product[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);

    // 商品名が空の行はスキップ
    const name = cols[idx("商品名")] ?? "";
    if (!name.trim()) continue;

    const raw = {
      name,
      maker:     cols[idx("メーカー")]  ?? "",
      origin:    cols[idx("産地")]      ?? "",
      locality:  idx("地名") >= 0 ? (cols[idx("地名")] ?? "") : "",
      costPrice: Number((cols[idx("価格")] ?? "0").replace(/,/g, "")),
      comment:   cols[idx("コメント")]  ?? "",
      flavor:    cols[idx("味わい")]    ?? "",
      category:  cols[idx("カテゴリ")]  ?? "",
      color:     idx("色")     >= 0 ? (cols[idx("色")]     ?? "") : "",
      spark:     idx("スパーク") >= 0 ? (cols[idx("スパーク")] ?? "") : "",
      body:      idx("ボディ")  >= 0 ? (cols[idx("ボディ")]  ?? "") : "",
      imageFile: imageCol ? normalizeImageFile(cols[idx(imageCol)] ?? "") : "",
      status:    idx("在庫状態") >= 0 ? (cols[idx("在庫状態")] ?? "active") : "active",
    };

    const result = productSchema.safeParse(raw);
    if (result.success) {
      products.push(result.data);
    } else {
      errors.push(`行 ${i + 1}: ${result.error.issues[0]?.message ?? "不明なエラー"}`);
    }
  }

  if (products.length === 0) {
    return {
      ok: false,
      error:
        errors.length > 0
          ? `パースエラー:\n${errors.slice(0, 5).join("\n")}`
          : "有効な商品データがありません。",
    };
  }

  return { ok: true, products };
}

/** カンマ区切り1行をダブルクォート対応で分割する。 */
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}
