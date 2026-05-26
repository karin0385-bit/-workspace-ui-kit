"use client";

/**
 * Workspace: 酒類販売提案ツールの 4 ペイン親コンポーネント。
 *
 * レイアウト:
 * Pane 1 (Sidebar)  : 業態選択 + フィルター
 * Pane 2            : おすすめ商品リスト（最大5件選択）
 * Pane 3            : 提案書プレビュー（読む場所）
 * Pane 4            : 見積書作成（編集の本拠地）
 */

import { useState, useCallback, useMemo, useEffect, useRef } from "react";

import {
  type BusinessType,
  type Product,
  type Store,
  type Settings,
  type Filter,
  type QuoteLine,
  DEFAULT_FILTER,
  DEFAULT_SETTINGS,
} from "@/lib/schema";
import { loadStores, saveStores, loadSettings, saveSettings } from "@/lib/data/storage";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { GlobalHeader } from "@/components/workspace/GlobalHeader";
import { BusinessTypePane } from "@/components/workspace/BusinessTypePane";
import { ProductListPane } from "@/components/workspace/ProductListPane";
import { ProposalPane } from "@/components/workspace/ProposalPane";
import { QuotePane } from "@/components/workspace/QuotePane";

type WorkspaceProps = {
  businessTypes: BusinessType[];
  workspaceName: string;
};

/** 業態の優先順位に基づき商品をスコアリングして並び替える。 */
function sortByPriority(products: Product[], businessType: BusinessType): Product[] {
  return [...products].sort((a, b) => {
    const ai = businessType.categoryPriority.indexOf(a.category);
    const bi = businessType.categoryPriority.indexOf(b.category);
    const aScore = ai === -1 ? 999 : ai;
    const bScore = bi === -1 ? 999 : bi;
    if (aScore !== bScore) return aScore - bScore;
    return a.costPrice - b.costPrice;
  });
}

export function Workspace({ businessTypes, workspaceName }: WorkspaceProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState<Filter>(DEFAULT_FILTER);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [quoteLines, setQuoteLines] = useState<QuoteLine[]>([]);
  const [pane4Open, setPane4Open] = useState(false);

  useEffect(() => {
    setStores(loadStores());
    setSettings(loadSettings());
  }, []);

  const handleSaveStores = useCallback((next: Store[]) => {
    setStores(next);
    saveStores(next);
  }, []);

  const handleSaveSettings = useCallback((next: Settings) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  /** CSV 読み込み後に呼ばれる。選択状態・見積をリセットする。 */
  const handleLoadProducts = useCallback((loaded: Product[]) => {
    setProducts(loaded);
    setSelectedProducts([]);
    setQuoteLines([]);
  }, []);

  /** フィルター変更。業態が変わったら選択もリセット。 */
  const handleFilterChange = useCallback((next: Filter) => {
    setFilter(next);
    if (next.businessTypeId !== filter.businessTypeId) {
      setSelectedProducts([]);
      setQuoteLines([]);
    }
  }, [filter.businessTypeId]);

  /** 現在の maxSelect を最新値で参照するため ref で保持する。 */
  const maxSelectRef = useRef(filter.maxSelect);
  maxSelectRef.current = filter.maxSelect;

  /** フィルター適用後の商品一覧（派生計算）。 */
  const filteredProducts = useMemo(() => {
    const activeOnly = products.filter((p) => p.status === "active");

    let result = activeOnly;

    if (filter.categories.length > 0) {
      result = result.filter((p) => filter.categories.includes(p.category));
    }
    if (filter.maxCostPrice !== null) {
      result = result.filter((p) => p.costPrice <= filter.maxCostPrice!);
    }
    if (filter.origin.trim() !== "") {
      const kw = filter.origin.trim().toLowerCase();
      result = result.filter((p) => p.origin.toLowerCase().includes(kw));
    }

    const bt = businessTypes.find((b) => b.id === filter.businessTypeId);
    if (bt) {
      result = sortByPriority(result, bt);
    }

    return result;
  }, [products, filter, businessTypes]);

  /** 商品カテゴリの掛け率を取得するヘルパー。 */
  const getMarkup = useCallback((product: Product): number => {
    const store = stores.find((s) => s.id === selectedStoreId);
    return store?.categoryMarkups[product.category] ?? 1.0;
  }, [stores, selectedStoreId]);

  /** 商品の選択状態をトグル（filter.maxSelect 件まで）。 */
  const toggleProduct = useCallback((product: Product) => {
    setSelectedProducts((prev) => {
      const exists = prev.some((p) => p.name === product.name);
      if (exists) {
        const next = prev.filter((p) => p.name !== product.name);
        setQuoteLines((ql) => ql.filter((l) => l.product.name !== product.name));
        return next;
      }
      // ref 経由で常に最新の maxSelect を参照する
      if (prev.length >= maxSelectRef.current) return prev;
      const markup = getMarkup(product);
      setQuoteLines((ql) => [
        ...ql,
        { product, quantity: 1, sellingPrice: Math.ceil(product.costPrice * markup) },
      ]);
      return [...prev, product];
    });
  }, [getMarkup]);

  /** 店舗変更時にカテゴリ別掛け率で販売価格を再計算する。 */
  const handleStoreChange = useCallback((storeId: string | null) => {
    setSelectedStoreId(storeId);
    const store = stores.find((s) => s.id === storeId);
    setQuoteLines((ql) =>
      ql.map((l) => {
        const markup = store?.categoryMarkups[l.product.category] ?? 1.0;
        return { ...l, sellingPrice: Math.ceil(l.product.costPrice * markup) };
      }),
    );
  }, [stores]);

  const updateQuoteLine = useCallback(
    (productName: string, field: "quantity" | "sellingPrice", value: number) => {
      setQuoteLines((ql) =>
        ql.map((l) =>
          l.product.name === productName ? { ...l, [field]: value } : l,
        ),
      );
    },
    [],
  );

  const selectedStore = stores.find((s) => s.id === selectedStoreId) ?? null;
  const selectedBusinessType =
    businessTypes.find((b) => b.id === filter.businessTypeId) ?? null;

  return (
    <SidebarProvider
      defaultOpen
      className="h-screen w-full overflow-hidden bg-background text-foreground"
    >
      <BusinessTypePane
        workspaceName={workspaceName}
        businessTypes={businessTypes}
        filter={filter}
        onFilterChange={handleFilterChange}
        onLoadProducts={handleLoadProducts}
        productCount={products.length}
      />
      <SidebarInset className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-background">
        <GlobalHeader
          workspaceName={workspaceName}
          businessTypeLabel={selectedBusinessType?.label ?? null}
          selectedCount={selectedProducts.length}
          stores={stores}
          settings={settings}
          onSaveStores={handleSaveStores}
          onSaveSettings={handleSaveSettings}
        />
        <div className="flex min-h-0 flex-1">
          <ProductListPane
            products={filteredProducts}
            selectedProducts={selectedProducts}
            maxSelect={filter.maxSelect}
            onToggleProduct={toggleProduct}
          />
          <ProposalPane
            selectedProducts={selectedProducts}
            businessTypeLabel={selectedBusinessType?.label ?? null}
          />
          <QuotePane
            selectedProducts={selectedProducts}
            quoteLines={quoteLines}
            stores={stores}
            selectedStoreId={selectedStoreId}
            settings={settings}
            onStoreChange={handleStoreChange}
            onUpdateQuoteLine={updateQuoteLine}
            pane4Open={pane4Open}
            onTogglePane4={() => setPane4Open((v) => !v)}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
