import { readFileSync } from "node:fs";
import { join } from "node:path";
import iconv from "iconv-lite";
import { describe, it, expect } from "vitest";
import { parseCsv } from "@/lib/data/csv";

/** 実ファイル形式に合わせたサンプル CSV（UTF-8 文字列として渡す） */
const VALID_CSV = `商品名,カテゴリ,色,スパーク,ボディ,メーカー,産地,地名,容量,価格,小売価格,コメント,味わい
純米大吟醸 〇〇,日本酒,,,,〇〇酒造,長野県,佐久市,720,2000,3000,フルーティーな香り,淡麗辛口
シャトー〇〇,ワイン,赤,,フルボディ,〇〇ワイナリー,フランス,ボルドー,750,3000,4500,タンニンが豊か,フルボディ
`;

describe("parseCsv", () => {
  it("有効な CSV をパースできる", () => {
    const result = parseCsv(VALID_CSV);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.products).toHaveLength(2);
    expect(result.products[0].name).toBe("純米大吟醸 〇〇");
    expect(result.products[0].category).toBe("日本酒");
    expect(result.products[0].locality).toBe("佐久市");
    expect(result.products[0].retailPrice).toBe(3000);
    expect(result.products[0].capacity).toBe("720");
    expect(result.products[1].category).toBe("ワイン");
    expect(result.products[1].color).toBe("赤");
    expect(result.products[1].locality).toBe("ボルドー");
    expect(result.products[1].retailPrice).toBe(4500);
    expect(result.products[1].capacity).toBe("750");
  });

  it("ヘッダーがない場合はエラーを返す", () => {
    const result = parseCsv("テスト商品,日本酒,,,,メーカー,産地,,1000,コメント,辛口");
    expect(result.ok).toBe(false);
  });

  it("データ行がない場合はエラーを返す", () => {
    const result = parseCsv(
      "商品名,カテゴリ,色,スパーク,ボディ,メーカー,産地,地名,価格,小売価格,容量,コメント,味わい\n",
    );
    expect(result.ok).toBe(false);
  });

  it("カテゴリが空の行はスキップされる", () => {
    const csv = `商品名,カテゴリ,色,スパーク,ボディ,メーカー,産地,地名,容量,価格,小売価格,コメント,味わい
有効商品,日本酒,,,,〇〇酒造,長野県,佐久市,720,1800,2500,コメント,辛口
カテゴリ空,,,,,ヴェネト,イタリア,,750,4000,,コメント,辛口
`;
    const result = parseCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.products).toHaveLength(1);
    expect(result.products[0].name).toBe("有効商品");
  });

  it("画像列を imageFile に読み込む", () => {
    const csv = `商品名,カテゴリ,色,スパーク,ボディ,メーカー,産地,地名,容量,価格,小売価格,コメント,味わい,画像
茜さす　純米大吟醸,日本酒,,,,土屋酒造,長野県,佐久市,720,3000,4000,コメント,辛口,akane-daiginjo.jpg
`;
    const result = parseCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.products[0].imageFile).toBe("akane-daiginjo.jpg");
    expect(result.products[0].retailPrice).toBe(4000);
    expect(result.products[0].capacity).toBe("720");
  });

  it("public のサンプル POP CSV をパースできる", () => {
    const buf = readFileSync(
      join(process.cwd(), "public/products/sample-inventory.csv"),
    );
    const text = iconv.decode(buf, "Shift_JIS");
    const result = parseCsv(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.products.length).toBeGreaterThan(800);
    const akane = result.products.find((p) => p.name.includes("茜さす") && p.name.includes("純米大吟醸"));
    expect(akane?.retailPrice).toBe(3300);
    expect(akane?.capacity).toBe("720");
  });

  it("小売価格・容量列がない旧形式 CSV も読み込める", () => {
    const csv = `商品名,カテゴリ,色,スパーク,ボディ,メーカー,産地,地名,価格,コメント,味わい
旧形式商品,日本酒,,,,〇〇酒造,長野県,佐久市,1800,コメント,辛口
`;
    const result = parseCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.products[0].retailPrice).toBe(0);
    expect(result.products[0].capacity).toBe("");
  });
});
