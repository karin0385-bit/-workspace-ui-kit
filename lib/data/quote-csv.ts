/**
 * 見積書 CSV エクスポート。
 * Excel で開けるよう UTF-8 BOM 付きでダウンロードする。
 */

import {
  type QuoteLine,
  type Store,
  type Settings,
} from "@/lib/schema";
import { getCategoryMarkup, getCategoryPricingMode, usesRetailPrice } from "@/lib/computed/quote";

export type QuoteExportInput = {
  quoteNumber: string;
  date: string;
  validUntil: string;
  store: Store | null;
  settings: Settings;
  lines: QuoteLine[];
};

/** 明細行に適用した掛け率（店舗マスター値。未設定時は販売単価から逆算）。 */
export function getLineMarkup(line: QuoteLine, store: Store | null): number {
  if (usesRetailPrice(line.product)) {
    if (line.product.costPrice > 0) {
      return Math.round((line.product.costPrice / line.sellingPrice) * 100) / 100;
    }
    return 1;
  }

  const fromStore = store ? getCategoryMarkup(store, line.product.category) : null;
  if (fromStore !== null) {
    return fromStore;
  }
  if (line.product.costPrice > 0) {
    return Math.round((line.product.costPrice / line.sellingPrice) * 100) / 100;
  }
  return 1;
}

/** CSV 出力用の掛け率表示（小売価格固定の行は「小売」、×係数の行は「×0.90」形式）。 */
export function formatLineMarkup(line: QuoteLine, store: Store | null): string {
  if (usesRetailPrice(line.product)) {
    return "小売";
  }
  const mode = getCategoryPricingMode(store, line.product.category);
  if (mode === "retail_multiply") {
    const markup = store ? getCategoryMarkup(store, line.product.category) : null;
    return `×${(markup ?? 0.8).toFixed(2)}`;
  }
  return getLineMarkup(line, store).toFixed(2);
}

function escapeCsvCell(value: string | number): string {
  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function row(cells: (string | number)[]): string {
  return cells.map(escapeCsvCell).join(",");
}

/** 見積書1件分の CSV 文字列を生成する。 */
export function buildQuoteCsv(input: QuoteExportInput): string {
  const { quoteNumber, date, validUntil, store, settings, lines } = input;

  const subtotal = lines.reduce((sum, l) => sum + l.sellingPrice * l.quantity, 0);
  const tax = Math.ceil(subtotal * 0.1);
  const grandTotal = subtotal + tax;

  const headerRows = [
    row(["見積番号", quoteNumber, "作成日", date, "有効期限", validUntil]),
    row(["宛先店舗", store?.name ?? "", "会社名", settings.companyName]),
    row(["住所", settings.address, "TEL", settings.tel, "担当", settings.staffName]),
    "",
    row([
      "商品名",
      "容量",
      "カテゴリ",
      "メーカー",
      "仕入価格",
      "小売価格",
      "掛け率",
      "販売単価",
      "数量",
      "小計",
    ]),
  ];

  const detailRows = lines.map((line) => {
    const lineSubtotal = line.sellingPrice * line.quantity;
    return row([
      line.product.name,
      line.product.capacity,
      line.product.category,
      line.product.maker,
      line.product.costPrice,
      line.product.retailPrice,
      formatLineMarkup(line, store),
      line.sellingPrice,
      line.quantity,
      lineSubtotal,
    ]);
  });

  const footerRows = [
    "",
    row(["", "", "", "", "", "", "", "小計", "", subtotal]),
    row(["", "", "", "", "", "", "", "消費税（10%）", "", tax]),
    row(["", "", "", "", "", "", "", "合計（税込）", "", grandTotal]),
  ];

  return [...headerRows, ...detailRows, ...footerRows].join("\r\n");
}

/** ブラウザで CSV ファイルをダウンロードする。 */
export function downloadQuoteCsv(input: QuoteExportInput): void {
  const csv = buildQuoteCsv(input);
  const storeLabel = (input.store?.name ?? "店舗未設定").replace(/[\\/:*?"<>|]/g, "_");
  const filename = `見積_${input.quoteNumber}_${storeLabel}.csv`;
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
