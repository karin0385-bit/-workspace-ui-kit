/**
 * 日付フォーマットユーティリティ（UI コンポーネントから利用）。
 */

/**
 * ISO 8601 (YYYY-MM-DD) 文字列を Date オブジェクトに変換する。
 * 空文字・不正な文字列は undefined を返す。
 */
export function parseISODate(iso: string): Date | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? undefined : d;
}

/**
 * Date オブジェクトを ISO 8601 (YYYY-MM-DD) 文字列に変換する。
 * undefined は空文字を返す。
 */
export function formatISODate(date: Date | undefined): string {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
