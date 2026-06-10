"use client";

/**
 * Pane 4: 見積書作成（編集の本拠地）。
 * 店舗を選択すると掛け率が自動適用され、販売価格を手動上書き可能。
 */

import { useState, useMemo } from "react";
import { Printer, Receipt, Download } from "lucide-react";

import { type Store, type Settings, type QuoteLine, CATEGORY_ORDER } from "@/lib/schema";
import { getCategoryMarkup, productKey } from "@/lib/computed/quote";
import { printDocument } from "@/lib/print";
import { downloadQuoteCsv } from "@/lib/data/quote-csv";
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
  quoteLines: QuoteLine[];
  activeStore: Store | null;
  stores: Store[];
  selectedStoreId: string | null;
  settings: Settings;
  onStoreChange: (storeId: string | null) => void;
  onUpdateQuoteLine: (
    lineKey: string,
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
  quoteLines,
  activeStore,
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

  const selectedStore = activeStore;

  const total = useMemo(
    () => quoteLines.reduce((sum, l) => sum + l.sellingPrice * l.quantity, 0),
    [quoteLines],
  );

  const tax = Math.ceil(total * 0.1);

  function handleDownloadCsv() {
    downloadQuoteCsv({
      quoteNumber,
      date: today,
      validUntil,
      store: selectedStore,
      settings,
      lines: quoteLines,
    });
  }

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
    <div className="flex min-h-0 w-80 shrink-0 flex-col overflow-hidden border-l border-border bg-background">
      {/* ヘッダー（印刷時は非表示） */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3 print:hidden">
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
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={handleDownloadCsv}
            >
              <Download className="size-3" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => printDocument("quote")}
            >
              <Printer className="size-3" />
              印刷
            </Button>
          </div>
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1 print:overflow-visible print:h-auto">
        <div
          data-print-area="quote"
          className="flex flex-col gap-4 bg-background p-4 print:p-0"
        >
          <div className="mb-2 flex-col gap-1 data-print-only">
            <h1 className="text-lg font-bold text-foreground">見積書</h1>
          </div>

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
                data-screen-only
              />
              <span className="text-xs tabular-nums data-print-only">{validUntil}</span>
            </div>
          </div>

          <Separator />

          {/* 店舗選択 */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground">宛先店舗</span>
            {stores.length === 0 ? (
              <p className="text-xs text-muted-foreground" data-screen-only>
                設定から店舗を追加してください
              </p>
            ) : (
              <>
                <div data-screen-only>
                  <Select
                    value={selectedStoreId ?? undefined}
                    onValueChange={(v) => onStoreChange(v ?? null)}
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
                </div>
                {selectedStore && (
                  <span className="text-sm font-medium data-print-only">
                    {selectedStore.name}
                  </span>
                )}
              </>
            )}
            {selectedStore && (
              <div className="flex flex-col gap-0.5" data-screen-only>
                {CATEGORY_ORDER.map((cat) => {
                  const m = getCategoryMarkup(selectedStore, cat);
                  return (
                    <span key={cat} className="text-xs text-muted-foreground">
                      {cat}: ÷{(m ?? 0.8).toFixed(2)}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <Separator />

          {/* 明細（画面用） */}
          <div className="flex flex-col gap-2" data-screen-only>
            <span className="text-xs font-medium text-foreground">明細</span>
            {quoteLines.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                商品リストから商品を選択してください
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {quoteLines.map((line, index) => {
                  const lineKey = productKey(line.product);
                  return (
                  <div
                    key={`${lineKey}-${index}`}
                    className="flex flex-col gap-1 rounded-lg bg-muted/50 p-2"
                  >
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-xs font-medium text-foreground leading-tight">
                        {line.product.name}
                      </span>
                      {selectedStore && (
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          ÷{(getCategoryMarkup(selectedStore, line.product.category) ?? 0.8).toFixed(2)}
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
                            lineKey,
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
                            lineKey,
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
                  );
                })}
              </div>
            )}
          </div>

          {/* 明細（印刷用テーブル） */}
          {quoteLines.length > 0 && (
            <table className="w-full border-collapse text-xs" data-print-only>
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 text-left font-medium">商品名</th>
                  <th className="w-12 py-2 text-right font-medium">数量</th>
                  <th className="w-20 py-2 text-right font-medium">単価</th>
                  <th className="w-24 py-2 text-right font-medium">小計</th>
                </tr>
              </thead>
              <tbody>
                {quoteLines.map((line, index) => (
                  <tr key={`print-${line.product.name}-${index}`} className="border-b border-border/50">
                    <td className="py-2 pr-2">{line.product.name}</td>
                    <td className="py-2 text-right tabular-nums">{line.quantity}</td>
                    <td className="py-2 text-right tabular-nums">
                      ¥{line.sellingPrice.toLocaleString()}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      ¥{(line.sellingPrice * line.quantity).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

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
