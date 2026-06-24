import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  businessTypeLabel: z.string(),
  customerName: z.string(),
  customerMemo: z.string(),
  companyName: z.string(),
  staffName: z.string(),
  products: z.array(
    z.object({
      name: z.string(),
      category: z.string(),
      origin: z.string(),
      locality: z.string(),
      flavor: z.string(),
      comment: z.string(),
    }),
  ),
});

export async function POST(req: Request) {
  try {
    const body = await req.json() as unknown;
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { businessTypeLabel, customerName, customerMemo, companyName, staffName, products } =
      parsed.data;

    const productLines = products
      .map(
        (p) =>
          `・${p.name}（${p.category}／${[p.origin, p.locality].filter(Boolean).join(" ")}）　味わい: ${p.flavor}　${p.comment}`,
      )
      .join("\n");

    const prompt = `あなたは日本酒・ワインの専門商社の営業担当です。以下の情報をもとに、お客様への提案書の導入文（200〜300文字）と、各商品の紹介コメント（1商品あたり1〜2文）を柔らかく親しみやすい文体で書いてください。

【差出人】
会社名: ${companyName || "弊社"}
担当者: ${staffName || "担当"}

【お客様情報】
お客様名: ${customerName || "ご担当者様"}
業態: ${businessTypeLabel || "飲食店"}
ご要望: ${customerMemo || "なし"}

【ご提案商品】
${productLines}

【出力形式】
=== 導入文 ===
（ここに導入文）

=== 商品コメント ===
・商品名: （コメント）
（全商品分）

丁寧すぎず、温かみのある文体でお願いします。`;

    const { text } = await generateText({
      model: google("gemini-1.5-flash"),
      prompt,
    });

    return NextResponse.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("generate-proposal error:", message);
    return NextResponse.json({ error: `生成に失敗しました: ${message}` }, { status: 500 });
  }
}
