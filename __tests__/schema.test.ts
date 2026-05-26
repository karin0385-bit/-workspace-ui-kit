import { describe, it, expect } from "vitest";
import { productSchema, storeSchema, settingsSchema, businessTypeSchema, DEFAULT_CATEGORY_MARKUPS } from "@/lib/schema";

const BASE_PRODUCT = {
  name: "純米大吟醸 〇〇",
  maker: "〇〇酒造",
  origin: "長野県",
  costPrice: 2000,
  comment: "フルーティーな香り",
  flavor: "淡麗辛口",
  category: "日本酒",
  color: "",
  spark: "",
  body: "",
  variety: "",
  imageFile: "sake-001.jpg",
  status: "active",
} as const;

describe("productSchema", () => {
  it("有効な商品データを受け入れる", () => {
    const result = productSchema.safeParse(BASE_PRODUCT);
    expect(result.success).toBe(true);
  });

  it("不正なカテゴリを拒否する", () => {
    const result = productSchema.safeParse({ ...BASE_PRODUCT, category: "スパークリング" });
    expect(result.success).toBe(false);
  });

  it("ビール・ジン・シードル・ウイスキーを受け入れる", () => {
    for (const cat of ["ビール", "ジン", "シードル", "ウイスキー"] as const) {
      const result = productSchema.safeParse({ ...BASE_PRODUCT, category: cat });
      expect(result.success).toBe(true);
    }
  });

  it("inactive ステータスを受け入れる", () => {
    const result = productSchema.safeParse({ ...BASE_PRODUCT, status: "inactive" });
    expect(result.success).toBe(true);
  });
});

describe("storeSchema", () => {
  it("有効な店舗データを受け入れる", () => {
    const result = storeSchema.safeParse({
      id: "s-001",
      name: "〇〇酒場",
      categoryMarkups: { ...DEFAULT_CATEGORY_MARKUPS },
    });
    expect(result.success).toBe(true);
  });
});

describe("businessTypeSchema", () => {
  it("有効な業態データを受け入れる", () => {
    const result = businessTypeSchema.safeParse({
      id: "izakaya",
      label: "居酒屋",
      categoryPriority: ["日本酒", "焼酎", "ビール", "ウイスキー", "ワイン"],
    });
    expect(result.success).toBe(true);
  });
});
