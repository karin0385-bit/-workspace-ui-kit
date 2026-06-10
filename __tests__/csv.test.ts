import { describe, it, expect } from "vitest";
import { parseCsv } from "@/lib/data/csv";

/** 実ファイル形式に合わせたサンプル CSV（UTF-8 文字列として渡す） */
const VALID_CSV = `商品名,カテゴリ,色,スパーク,ボディ,メーカー,産地,地名,価格,コメント,味わい
純米大吟醸 〇〇,日本酒,,,,〇〇酒造,長野県,佐久市,2000,フルーティーな香り,淡麗辛口
シャトー〇〇,ワイン,赤,,フルボディ,〇〇ワイナリー,フランス,ボルドー,3000,タンニンが豊か,フルボディ
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
    expect(result.products[1].category).toBe("ワイン");
    expect(result.products[1].color).toBe("赤");
    expect(result.products[1].locality).toBe("ボルドー");
  });

  it("ヘッダーがない場合はエラーを返す", () => {
    const result = parseCsv("テスト商品,日本酒,,,,メーカー,産地,,1000,コメント,辛口");
    expect(result.ok).toBe(false);
  });

  it("データ行がない場合はエラーを返す", () => {
    const result = parseCsv(
      "商品名,カテゴリ,色,スパーク,ボディ,メーカー,産地,地名,価格,コメント,味わい\n",
    );
    expect(result.ok).toBe(false);
  });

  it("カテゴリが空の行はスキップされる", () => {
    const csv = `商品名,カテゴリ,色,スパーク,ボディ,メーカー,産地,地名,価格,コメント,味わい
有効商品,日本酒,,,,〇〇酒造,長野県,佐久市,1800,コメント,辛口
カテゴリ空,,,,,ヴェネト,イタリア,,4000,コメント,辛口
`;
    const result = parseCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.products).toHaveLength(1);
    expect(result.products[0].name).toBe("有効商品");
  });

  it("画像列を imageFile に読み込む", () => {
    const csv = `商品名,カテゴリ,色,スパーク,ボディ,メーカー,産地,地名,価格,コメント,味わい,画像
茜さす　純米大吟醸,日本酒,,,,土屋酒造,長野県,佐久市,3000,コメント,辛口,akane-daiginjo.jpg
`;
    const result = parseCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.products[0].imageFile).toBe("akane-daiginjo.jpg");
  });
});
