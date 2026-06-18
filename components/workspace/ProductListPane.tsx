"use client";

/**
 * Pane 2: フィルター結果の商品リスト。チェックで最大5件まで提案商品に追加できる。
 */

import { Check, Package } from "lucide-react";

import { type Product } from "@/lib/schema";
import { ProductImage } from "@/components/primitives/ProductImage";
import { ScrollArea } from "@/components/ui/scroll-area";

type ProductListPaneProps = {
  products: Product[];
  selectedProducts: Product[];
  maxSelect: number;
  onToggleProduct: (product: Product) => void;
  productImageUrls?: Readonly<Record<string, string>>;
};

const CATEGORY_COLORS: Record<string, string> = {
  日本酒: "bg-primary/10 text-primary",
  ワイン: "bg-destructive/10 text-destructive",
  焼酎: "bg-muted text-muted-foreground",
  "ウイスキー・スピリッツ": "bg-secondary text-secondary-foreground",
};

export function ProductListPane({
  products,
  selectedProducts,
  maxSelect,
  onToggleProduct,
  productImageUrls,
}: ProductListPaneProps) {
  const selectedNames = new Set(selectedProducts.map((p) => p.name));
  const canSelectMore = selectedProducts.length < maxSelect;

  return (
    <div className="flex min-h-0 w-64 shrink-0 flex-col overflow-hidden border-r border-border bg-background">
      {/* ヘッダー */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
        <span className="text-xs font-semibold text-foreground">
          {products.length > 0 ? `${products.length} 件` : "商品なし"}
        </span>
        <span className="text-xs text-muted-foreground">
          {selectedProducts.length}/{maxSelect} 選択中
        </span>
      </div>

      {/* リスト */}
      <ScrollArea className="min-h-0 flex-1">
        {products.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <Package className="size-8 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">
              CSV を読み込んで
              <br />
              業態を選択してください
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 p-2">
            {products.map((product, i) => {
              const isSelected = selectedNames.has(product.name);
              const isDisabled = !isSelected && !canSelectMore;

              return (
                <button
                  key={`${product.name}-${i}`}
                  onClick={() => !isDisabled && onToggleProduct(product)}
                  disabled={isDisabled}
                  className={[
                    "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors",
                    isSelected
                      ? "bg-primary/8 ring-1 ring-primary/20"
                      : isDisabled
                        ? "cursor-not-allowed opacity-40"
                        : "hover:bg-muted",
                  ].join(" ")}
                >
                  {/* チェックマーク or 画像 */}
                  <div className="relative size-10 shrink-0 overflow-hidden rounded-md">
                    <ProductImage
                      imageFile={product.imageFile}
                      productName={product.name}
                      localImageUrls={productImageUrls}
                      className="size-10 rounded-md"
                      sizes="40px"
                      placeholderIconClassName="size-5"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center bg-primary/80">
                        <Check className="size-5 text-primary-foreground" />
                      </div>
                    )}
                  </div>

                  {/* 商品情報 */}
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-xs font-medium text-foreground">
                      {product.capacity
                        ? `${product.name}（${product.capacity}）`
                        : product.name}
                    </span>
                    <span className="truncate text-[10px] text-muted-foreground">
                      {product.maker}
                    </span>
                    <div className="flex items-center gap-1">
                      <span
                        className={[
                          "rounded px-1 py-0 text-[10px] font-medium",
                          CATEGORY_COLORS[product.category] ?? "bg-muted text-muted-foreground",
                        ].join(" ")}
                      >
                        {product.category}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        ¥{product.costPrice.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
