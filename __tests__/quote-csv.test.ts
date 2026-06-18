import { describe, it, expect } from "vitest";
import { buildQuoteCsv, formatLineMarkup, getLineMarkup } from "@/lib/data/quote-csv";
import { DEFAULT_CATEGORY_MARKUPS, type QuoteLine, type Store } from "@/lib/schema";

const store: Store = {
  id: "s-1",
  name: "テスト店",
  categoryMarkups: { ...DEFAULT_CATEGORY_MARKUPS, 日本酒: 0.8 },
};

const line: QuoteLine = {
  product: {
    name: "純米大吟醸 〇〇",
    maker: "〇〇酒造",
    origin: "長野県",
    locality: "佐久市",
    costPrice: 2000,
    retailPrice: 2500,
    capacity: "720ml",
    comment: "",
    flavor: "辛口",
    category: "日本酒",
    color: "",
    spark: "",
    body: "",
    imageFile: "",
    status: "active",
  },
  quantity: 2,
  sellingPrice: 2500,
};

describe("getLineMarkup", () => {
  it("日本酒は販売単価から実効掛け率を返す", () => {
    expect(getLineMarkup(line, store)).toBe(0.8);
  });

  it("日本酒の CSV 表示は小売とする", () => {
    expect(formatLineMarkup(line, store)).toBe("小売");
  });
});

describe("buildQuoteCsv", () => {
  it("見積ヘッダー・明細・掛け率・合計を含む", () => {
    const csv = buildQuoteCsv({
      quoteNumber: "20250608-001",
      date: "2025/06/08",
      validUntil: "2025/07/08",
      store,
      settings: {
        companyName: "テスト会社",
        address: "長野県",
        tel: "026-000-0000",
        staffName: "山田",
      },
      lines: [line],
    });

    expect(csv).toContain("見積番号");
    expect(csv).toContain("20250608-001");
    expect(csv).toContain("テスト店");
    expect(csv).toContain("純米大吟醸 〇〇");
    expect(csv).toContain("小売");
    expect(csv).toContain("720ml");
    expect(csv).toContain("5000");
    expect(csv).toContain("5500");
  });
});
