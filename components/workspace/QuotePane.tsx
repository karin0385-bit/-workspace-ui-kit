"use client";

/**
 * Pane 4: 見積書作成（編集の本拠地）。
 * 店舗を選択すると掛け率が自動適用され、販売価格を手動上書き可能。
 * 印刷ボタンで window.print() を呼ぶ。
 */

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Printer, Receipt } from "lucide-react";

import { type Product, type Store, type Settings, type QuoteLine, CATEGORY_ORDER } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pane4Toggle } from "@/components/workspace/Pane4Toggle";

type QuotePaneProps = {
  selectedProducts: Product[];
  quoteLines: QuoteLine[];
  stores: Store[];
  selectedStoreId: string | null;
  settings: Settings;
  onStoreChange: (storeId: string | null) => void;
  onUpdateQuoteLine: (
    productName: string,
    field: "quantity" | "sellingPrice",
    value: number,
  ) => void;
  pane4Open: boolean;
  onTogglePane4: () => void;
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function generateQuoteNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  return `${y}${m}${d}-${rand}`;
}

export function QuotePane({
  selectedProducts,
  quoteLines,
  stores,
  selectedStoreId,
  settings,
  onStoreChange,
  onUpdateQuoteLine,
  pane4Open,
  onTogglePane4,
}: QuotePaneProps) {
  const today = formatDate(new Date());
  const [quoteNumber] = useState(() => generateQuoteNumber());
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return formatDate(d);
  });

  const selectedStore = stores.find((s) => s.id === selectedStoreId) ?? null;

  const total = useMemo(
    () => quoteLines.reduce((sum, l) => sum + l.sellingPrice * l.quantity, 0),
    [quoteLines],
  );

  const tax = Math.ceil(total * 0.1);

  if (!pane4Open) {
    return (
      <div className="flex w-10 shrink-0 flex-col items-center border-l border-border bg-background pt-2">
        <Pane4Toggle
            open={pane4Open}
            onToggle={onTogglePane4}
          />
      </div>
    );
  }

  return (
    <div className="flex w-80 shrink-0 flex-col border-l border-border bg-background">
      {/* ヘッダー */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
        <div className="flex items-center gap-2">
          <Pane4Toggle
            open={pane4Open}
            onToggle={onTogglePane4}
          />
          <div className="flex items-center gap-1.5">
            <Receipt className="size-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">見積書</span>
          </div>
        </div>
        {quoteLines.length > 0 && (
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

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-4 p-4">
          {/* 見積基本情報 */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">見積番号</span>
              <span className="text-xs font-medium tabular-nums">{quoteNumber}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">作成日</span>
              <span className="text-xs tabular-nums">{today}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground shrink-0">有効期限</span>
              <Input
                type="text"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="h-6 w-32 text-right text-xs"
              />
            </div>
          </div>

          <Separator />

          {/* 店舗選択 */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground">宛先店舗</span>
            {stores.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                設定から店舗を追加してください
              </p>
            ) : (
              <Select
                value={selectedStoreId ?? ""}
                onValueChange={(v) => onStoreChange(v || null)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="店舗を選択..." />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id} className="text-xs">
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedStore && (
              <div className="flex flex-col gap-0.5">
                {CATEGORY_ORDER.map((cat) => {
                  const m = selectedStore.categoryMarkups[cat];
                  return (
                    <span key={cat} className="text-xs text-muted-foreground">
                      {cat}: ×{(m ?? 1).toFixed(2)}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <Separator />

          {/* 明細 */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-foreground">明細</span>
            {quoteLines.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                商品リストから商品を選択してください
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {quoteLines.map((line) => (
                  <div
                    key={line.product.name}
                    className="flex flex-col gap-1 rounded-lg bg-muted/50 p-2"
                  >
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-xs font-medium text-foreground leading-tight">
                        {line.product.name}
                      </span>
                      {selectedStore && (
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          ×{(selectedStore.categoryMarkups[line.product.category] ?? 1).toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label className="text-[10px] text-muted-foreground shrink-0">
                        数量
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={(e) =>
                          onUpdateQuoteLine(
                            line.product.name,
                            "quantity",
                            Math.max(1, Number(e.target.value)),
                          )
                        }
                        className="h-6 w-14 text-center text-xs"
                      />
                      <label className="text-[10px] text-muted-foreground shrink-0">
                        販売単価
                      </label>
                      <Input
                        type="number"
                        min={0}
                        value={line.sellingPrice}
                        onChange={(e) =>
                          onUpdateQuoteLine(
                            line.product.name,
                            "sellingPrice",
                            Number(e.target.value),
                          )
                        }
                        className="h-6 w-20 text-right text-xs"
                      />
                      <span className="text-[10px] text-muted-foreground">円</span>
                    </div>
                    <div className="flex justify-end">
                      <span className="text-xs font-medium tabular-nums">
                        小計: ¥{(line.sellingPrice * line.quantity).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {quoteLines.length > 0 && (
            <>
              <Separator />
              {/* 合計 */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">小計</span>
                  <span className="text-xs tabular-nums">¥{total.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">消費税（10%）</span>
                  <span className="text-xs tabular-nums">¥{tax.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-primary/8 px-2 py-1.5">
                  <span className="text-xs font-semibold text-foreground">合計（税込）</span>
                  <span className="text-sm font-bold tabular-nums text-primary">
                    ¥{(total + tax).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 発行元 */}
              {settings.companyName && (
                <>
                  <Separator />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-foreground">
                      {settings.companyName}
                    </span>
                    {settings.address && (
                      <span className="text-[10px] text-muted-foreground">
                        {settings.address}
                      </span>
                    )}
                    {settings.tel && (
                      <span className="text-[10px] text-muted-foreground">
                        TEL: {settings.tel}
                      </span>
                    )}
                    {settings.staffName && (
                      <span className="text-[10px] text-muted-foreground">
                        担当: {settings.staffName}
                      </span>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
