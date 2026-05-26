"use client";

/**
 * Pane 3: 提案書プレビュー（読む場所）。
 * 選択された商品の画像・商品名・味わい・コメントを並べて表示する。
 * 印刷ボタンで window.print() を呼ぶ。
 */

import Image from "next/image";
import { Printer, FileText, Package } from "lucide-react";

import { type Product } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type ProposalPaneProps = {
  selectedProducts: Product[];
  businessTypeLabel: string | null;
};

const CATEGORY_COLORS: Record<string, string> = {
  日本酒: "bg-primary/10 text-primary border-primary/20",
  ワイン: "bg-destructive/10 text-destructive border-destructive/20",
  焼酎: "bg-muted text-muted-foreground border-border",
  "ウイスキー・スピリッツ": "bg-secondary text-secondary-foreground border-border",
};

export function ProposalPane({ selectedProducts, businessTypeLabel }: ProposalPaneProps) {
  const hasPrint = typeof window !== "undefined";

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-r border-border bg-background">
      {/* ヘッダー */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <FileText className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">提案書</span>
          {businessTypeLabel && (
            <span className="text-xs text-muted-foreground">— {businessTypeLabel}</span>
          )}
        </div>
        {selectedProducts.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => window.print()}
          >
            <Printer className="size-3" />
            印刷
          </Button>
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {selectedProducts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
            <FileText className="size-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              左のリストから商品を選ぶと
              <br />
              提案書が表示されます
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-0 print:gap-0" id="proposal-content">
            {selectedProducts.map((product, index) => (
              <div key={`${product.name}-${index}`}>
                {index > 0 && <Separator />}
                <div className="flex gap-4 p-4">
                  {/* 商品画像 */}
                  <div className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {product.imageFile ? (
                      <Image
                        src={`/products/${product.imageFile}`}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package className="size-8 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>

                  {/* 商品情報 */}
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold text-foreground leading-tight">
                          {product.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {product.maker}
                        </span>
                      </div>
                      <span
                        className={[
                          "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                          CATEGORY_COLORS[product.category] ?? "bg-muted text-muted-foreground border-border",
                        ].join(" ")}
                      >
                        {product.category}
                      </span>
                    </div>

                    {/* 産地 + 味わい */}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                      <span className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/60">産地: </span>
                        {product.origin}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/60">味わい: </span>
                        {product.flavor}
                      </span>
                    </div>

                    {/* コメント */}
                    {product.comment && (
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {product.comment}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
