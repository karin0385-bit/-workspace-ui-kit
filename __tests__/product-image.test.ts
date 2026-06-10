import { describe, it, expect } from "vitest";
import {
  normalizeImageFile,
  normalizeImageMatchKey,
  looksLikeImageFile,
  findImageInFolder,
  resolveProductImageSrc,
} from "@/lib/computed/product-image";

describe("normalizeImageFile", () => {
  it("ファイル名だけを残す", () => {
    expect(normalizeImageFile("images\\kurosawa.jpg")).toBe("kurosawa.jpg");
  });

  it("URL はそのまま", () => {
    expect(normalizeImageFile("https://example.com/a.jpg")).toBe(
      "https://example.com/a.jpg",
    );
  });
});

describe("looksLikeImageFile", () => {
  it("拡張子付きは画像とみなす", () => {
    expect(looksLikeImageFile("foo.jpg")).toBe(true);
  });

  it("商品名だけは画像とみなさない", () => {
    expect(looksLikeImageFile("黒澤生もと純米酒720")).toBe(false);
    expect(looksLikeImageFile("images")).toBe(false);
  });
});

describe("findImageInFolder", () => {
  const folder = {
    "黒澤生もと純米酒720.jpg": "blob:1",
    "other.png": "blob:2",
  };

  it("CSV 画像列の商品名ヒントでフォルダ内を照合する", () => {
    expect(
      findImageInFolder(["黒澤生もと純米酒720"], folder),
    ).toBe("blob:1");
  });

  it("商品名からフォルダ内を照合する", () => {
    expect(
      findImageInFolder(
        [normalizeImageMatchKey("黒澤生もと純米酒")],
        folder,
      ),
    ).toBe("blob:1");
  });
});

describe("resolveProductImageSrc", () => {
  it("画像フォルダの blob URL を優先する", () => {
    const src = resolveProductImageSrc(
      "akane.jpg",
      { "akane.jpg": "blob:local" },
      "茜さす",
    );
    expect(src).toBe("blob:local");
  });

  it("public/products は拡張子付きのみ", () => {
    expect(resolveProductImageSrc("sake-001.jpg")).toBe("/products/sake-001.jpg");
    expect(resolveProductImageSrc("黒澤生もと純米酒720")).toBeNull();
  });

  it("images と書いても商品名でフォルダ照合する", () => {
    const folder = { "黒澤生もと純米酒720.jpg": "blob:kurosawa" };
    expect(
      resolveProductImageSrc("images", folder, "黒澤生もと純米酒"),
    ).toBe("blob:kurosawa");
  });
});
