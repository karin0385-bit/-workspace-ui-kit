/**
 * 商品画像のパス解決。
 * CSV「画像」列のファイル名と、読み込んだ画像フォルダを突き合わせる。
 */

const IMAGE_EXT_PATTERN = /\.(jpe?g|png|gif|webp|bmp|svg)$/i;

const TRY_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"] as const;

/** マッチング用に商品名・ファイル名を正規化する。 */
export function normalizeImageMatchKey(value: string): string {
  return value
    .replace(/\.[^.]+$/i, "")
    .replace(/[\s　・／/\\._\-（）()［］\[\]]/g, "")
    .toLowerCase();
}

/** CSV の画像セル値をファイル名に正規化する。 */
export function normalizeImageFile(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return trimmed.replace(/^.*[\\/]/, "");
}

/** 画像ファイル名らしい値か（拡張子付き or URL）。 */
export function looksLikeImageFile(value: string): boolean {
  const normalized = normalizeImageFile(value);
  if (!normalized) return false;
  return IMAGE_EXT_PATTERN.test(normalized) || /^https?:\/\//i.test(normalized);
}

function lookupLocalImageExact(
  fileName: string,
  localImageUrls: Readonly<Record<string, string>>,
): string | undefined {
  if (!fileName) return undefined;
  if (localImageUrls[fileName]) return localImageUrls[fileName];
  const lower = fileName.toLowerCase();
  const match = Object.entries(localImageUrls).find(
    ([key]) => key.toLowerCase() === lower,
  );
  return match?.[1];
}

/** 画像フォルダ内をヒント（CSV 画像列・商品名）で探す。 */
export function findImageInFolder(
  hints: string[],
  localImageUrls: Readonly<Record<string, string>>,
): string | undefined {
  if (Object.keys(localImageUrls).length === 0) return undefined;

  const entries = Object.entries(localImageUrls).map(([fileName, url]) => ({
    fileName,
    url,
    key: normalizeImageMatchKey(fileName),
  }));

  const normalizedHints = hints
    .map((h) => normalizeImageMatchKey(h))
    .filter((h) => h.length > 0);

  for (const hint of normalizedHints) {
    const exact = entries.find((e) => e.key === hint);
    if (exact) return exact.url;

    const partial = entries.find(
      (e) => e.key.includes(hint) || hint.includes(e.key),
    );
    if (partial) return partial.url;
  }

  return undefined;
}

function resolveFromFolder(
  imageFile: string,
  productName: string,
  localImageUrls?: Readonly<Record<string, string>>,
): string | undefined {
  if (!localImageUrls || Object.keys(localImageUrls).length === 0) {
    return undefined;
  }

  const normalized = normalizeImageFile(imageFile);
  const hints: string[] = [];

  if (normalized && normalized.toLowerCase() !== "images") {
    hints.push(normalized);
    if (!IMAGE_EXT_PATTERN.test(normalized)) {
      for (const ext of TRY_EXTENSIONS) {
        const withExt = `${normalized}${ext}`;
        const exact = lookupLocalImageExact(withExt, localImageUrls);
        if (exact) return exact;
      }
    } else {
      const exact = lookupLocalImageExact(normalized, localImageUrls);
      if (exact) return exact;
    }
  }

  if (productName) hints.push(productName);

  return findImageInFolder(hints, localImageUrls);
}

/** 提案書・商品リストで表示する画像 URL。見つからなければ null。 */
export function resolveProductImageSrc(
  imageFile: string,
  localImageUrls?: Readonly<Record<string, string>>,
  productName = "",
): string | null {
  const fromFolder = resolveFromFolder(imageFile, productName, localImageUrls);
  if (fromFolder) return fromFolder;

  const normalized = normalizeImageFile(imageFile);
  if (!normalized) return null;

  if (/^https?:\/\//i.test(normalized)) return normalized;

  // 拡張子のない文字列（商品名など）は public パスにしない（壊れた画像の alt 文字化けを防ぐ）
  if (!looksLikeImageFile(normalized)) return null;

  return `/products/${encodeURI(normalized)}`;
}
