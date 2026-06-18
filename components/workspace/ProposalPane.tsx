"use client";

/**
 * Pane 3: 提案書プレビュー（読む場所）。
 * 選択された商品の画像・商品名・味わい・コメントと見積単価を表示する。
 */

import { Printer, FileText } from "lucide-react";

import { type Product, type QuoteLine } from "@/lib/schema";
import { productKey } from "@/lib/computed/quote";
import { printDocument } from "@/lib/print";
import { ProductImage } from "@/components/primitives/ProductImage";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type ProposalPaneProps = {
  selectedProducts: Product[];
  quoteLines: QuoteLine[];
  businessTypeLabel: string | null;
  productImageUrls?: Readonly<Record<string, string>>;
};

const CATEGORY_COLORS: Record<string, string> = {
  日本酒: "bg-primary/10 text-primary border-primary/20",
  ワイン: "bg-destructive/10 text-destructive border-destructive/20",
  焼酎: "bg-muted text-muted-foreground border-border",
  ウイスキー: "bg-secondary text-secondary-foreground border-border",
  ジン: "bg-secondary text-secondary-foreground border-border",
  ビール: "bg-muted text-muted-foreground border-border",
  シードル: "bg-muted text-muted-foreground border-border",
};

function formatProductLabel(product: Product): string {
  return product.capacity ? `${product.name}（${product.capacity}）` : product.name;
}

export function ProposalPane({
  selectedProducts,
  quoteLines,
  businessTypeLabel,
  productImageUrls,
}: ProposalPaneProps) {
  const unitPriceByKey = new Map(
    quoteLines.map((line) => [productKey(line.product), line.sellingPrice]),
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-r border-border bg-background">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-4 print:hidden">
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
            onClick={() => printDocument("proposal")}
          >
            <Printer className="size-3" />
            印刷
          </Button>
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1 print:overflow-visible print:h-auto">
        {selectedProducts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-16 text-center print:hidden">
            <FileText className="size-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              左のリストから商品を選ぶと
              <br />
              提案書が表示されます
            </p>
          </div>
        ) : (
          <div
            data-print-area="proposal"
            className="flex flex-col gap-4 bg-background p-4 print:p-0"
          >
            <div className="flex flex-col gap-1 data-print-only">
              <h1 className="text-lg font-bold text-foreground">提案書</h1>
              {businessTypeLabel && (
                <p className="text-sm text-muted-foreground">{businessTypeLabel}</p>
              )}
            </div>

            {selectedProducts.map((product, index) => {
              const key = productKey(product);
              const unitPrice = unitPriceByKey.get(key);

              return (
                <div key={key}>
                  {index > 0 && <Separator className="print:my-3" />}
                  <div className="flex gap-4 p-4 print:p-0">
                    <ProductImage
                      imageFile={product.imageFile}
                      productName={product.name}
                      localImageUrls={productImageUrls}
                      className="size-28 shrink-0 rounded-lg print:size-24"
                      sizes="112px"
                      placeholderIconClassName="size-10"
                    />

                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-semibold text-foreground leading-tight">
                            {formatProductLabel(product)}
                          </span>
                          <span className="text-xs text-muted-foreground">{product.maker}</span>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span
                            className={[
                              "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                              CATEGORY_COLORS[product.category] ??
                                "bg-muted text-muted-foreground border-border",
                            ].join(" ")}
                          >
                            {product.category}
                          </span>
                          {unitPrice !== undefined && (
                            <span className="text-xs font-semibold tabular-nums text-foreground">
                              ¥{unitPrice.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                        <span className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground/60">産地: </span>
                          {[product.origin, product.locality].filter(Boolean).join(" ")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground/60">味わい: </span>
                          {product.flavor}
                        </span>
                      </div>

                      {product.comment && (
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {product.comment}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            <Separator className="print:my-2" />

            <div className="flex flex-col gap-1">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 text-left font-medium">商品名</th>
                    <th className="w-24 py-2 text-right font-medium">単価</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProducts.map((product) => {
                    const key = productKey(product);
                    const unitPrice = unitPriceByKey.get(key);

                    return (
                      <tr key={`price-${key}`} className="border-b border-border/50">
                        <td className="py-2 pr-2">{formatProductLabel(product)}</td>
                        <td className="py-2 text-right tabular-nums">
                          {unitPrice !== undefined
                            ? `¥${unitPrice.toLocaleString()}`
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
