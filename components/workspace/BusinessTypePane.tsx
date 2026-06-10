"use client";

/**
 * Pane 1: 業態選択 + フィルター + CSV 読み込み。
 * shadcn Sidebar を使い collapsible="icon" で折りたたみ可能。
 */

import { useRef } from "react";
import { ImageIcon, Upload, X } from "lucide-react";

import { type BusinessType, type Filter, CATEGORY_ORDER } from "@/lib/schema";
import { parseCsv } from "@/lib/data/csv";
import { type Product } from "@/lib/schema";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pane1Toggle } from "@/components/workspace/Pane1Toggle";

type BusinessTypePaneProps = {
  workspaceName: string;
  businessTypes: BusinessType[];
  filter: Filter;
  onFilterChange: (filter: Filter) => void;
  onLoadProducts: (products: Product[]) => void;
  onLoadProductImages: (urls: Record<string, string>) => void;
  productCount: number;
  productImageCount: number;
};

export function BusinessTypePane({
  workspaceName,
  businessTypes,
  filter,
  onFilterChange,
  onLoadProducts,
  onLoadProductImages,
  productCount,
  productImageCount,
}: BusinessTypePaneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageFolderRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text !== "string") return;
      const result = parseCsv(text);
      if (result.ok) {
        onLoadProducts(result.products);
      } else {
        alert(`CSV 読み込みエラー:\n${result.error}`);
      }
    };
    reader.readAsText(file, "shift_jis");
    e.target.value = "";
  }

  function handleImageFolderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    const urls: Record<string, string> = {};
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      urls[file.name] = URL.createObjectURL(file);
    }

    onLoadProductImages(urls);
    e.target.value = "";
  }

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border [&_[data-slot=sidebar-container]]:bg-sidebar"
    >
      <SidebarHeader className="border-b border-sidebar-border p-0">
        <div className="flex h-12 items-center justify-between gap-2 px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[state=expanded]:px-5">
          <h2 className="truncate text-sm font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            {workspaceName}
          </h2>
          <Pane1Toggle />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-1 py-3 group-data-[collapsible=icon]:hidden">
        {/* CSV 読み込み */}
        <SidebarGroup className="px-1">
          <SidebarGroupLabel className="px-2 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/70">
            在庫データ
          </SidebarGroupLabel>
          <SidebarGroupContent className="flex flex-col gap-2 px-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-3.5" />
              CSV を読み込む
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => imageFolderRef.current?.click()}
            >
              <ImageIcon className="size-3.5" />
              画像フォルダを読み込む
            </Button>
            <input
              ref={(node) => {
                imageFolderRef.current = node;
                if (node) node.setAttribute("webkitdirectory", "");
              }}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageFolderChange}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
            {productCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {productCount} 件読み込み済み
                {productImageCount > 0 && ` / 画像 ${productImageCount} 件`}
              </p>
            )}
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              CSV「画像」列には .jpg 等のファイル名を入れ、続けて画像フォルダを読み込んでください。列が「images」だけでも、商品名が一致する画像を自動で探します。
            </p>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* 業態選択 */}
        <SidebarGroup className="px-1">
          <SidebarGroupLabel className="px-2 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/70">
            業態
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {businessTypes.map((bt) => {
                const active = filter.businessTypeId === bt.id;
                return (
                  <SidebarMenuItem key={bt.id}>
                    <SidebarMenuButton
                      isActive={active}
                      aria-current={active ? "page" : undefined}
                      onClick={() =>
                        onFilterChange({
                          ...filter,
                          businessTypeId: active ? null : bt.id,
                        })
                      }
                    >
                      <span className="truncate">{bt.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* カテゴリ絞り込み（複数選択可） */}
        <SidebarGroup className="px-1">
          <SidebarGroupLabel className="flex items-center justify-between px-2 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/70">
            カテゴリ
            {filter.categories.length > 0 && (
              <button
                onClick={() => onFilterChange({ ...filter, categories: [] })}
                className="text-[10px] font-normal text-muted-foreground hover:text-foreground normal-case"
              >
                クリア
              </button>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent className="flex flex-col gap-0.5 px-2 pt-1">
            {CATEGORY_ORDER.map((cat) => {
              const checked = filter.categories.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => {
                    const next = checked
                      ? filter.categories.filter((c) => c !== cat)
                      : [...filter.categories, cat];
                    onFilterChange({ ...filter, categories: next });
                  }}
                  className={[
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                    checked
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "flex size-4 shrink-0 items-center justify-center rounded border text-[10px]",
                      checked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-sidebar-foreground/30 bg-transparent",
                    ].join(" ")}
                  >
                    {checked && "✓"}
                  </span>
                  <span className="truncate">{cat}</span>
                </button>
              );
            })}
            {filter.categories.length === 0 && (
              <p className="px-1 text-[10px] text-muted-foreground">
                未選択 = すべて対象
              </p>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* 詳細フィルター */}
        <SidebarGroup className="px-1">
          <SidebarGroupLabel className="px-2 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/70">
            絞り込み
          </SidebarGroupLabel>
          <SidebarGroupContent className="flex flex-col gap-2 px-2 pt-1">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-sidebar-foreground/70">
                提案件数の上限
              </label>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={filter.maxSelect}
                  onChange={(e) =>
                    onFilterChange({
                      ...filter,
                      maxSelect: Math.min(20, Math.max(1, Number(e.target.value) || 1)),
                    })
                  }
                  className="h-7 w-16 text-center text-xs"
                />
                <span className="text-xs text-sidebar-foreground/70">件</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-sidebar-foreground/70">
                仕入価格の上限（円）
              </label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  placeholder="上限なし"
                  value={filter.maxCostPrice ?? ""}
                  onChange={(e) =>
                    onFilterChange({
                      ...filter,
                      maxCostPrice: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  className="h-7 text-xs"
                />
                {filter.maxCostPrice !== null && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onFilterChange({ ...filter, maxCostPrice: null })}
                    aria-label="上限をクリア"
                  >
                    <X className="size-3" />
                  </Button>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-sidebar-foreground/70">
                産地（部分一致）
              </label>
              <div className="flex items-center gap-1">
                <Input
                  type="text"
                  placeholder="例: 長野、フランス"
                  value={filter.origin}
                  onChange={(e) =>
                    onFilterChange({ ...filter, origin: e.target.value })
                  }
                  className="h-7 text-xs"
                />
                {filter.origin && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onFilterChange({ ...filter, origin: "" })}
                    aria-label="産地をクリア"
                  >
                    <X className="size-3" />
                  </Button>
                )}
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
