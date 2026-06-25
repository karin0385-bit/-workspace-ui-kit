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
import { loadStores, saveStores, loadSettings, saveSettings, loadSelectedStoreId, saveSelectedStoreId } from "@/lib/data/storage";
import {
  buildPricedQuoteLines,
  calcSellingPrice,
  dedupeQuoteLines,
  productKey,
  resolveActiveStore,
} from "@/lib/computed/quote";
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
  const [manualUnitPrices, setManualUnitPrices] = useState<Record<string, number>>({});
  const [productImageUrls, setProductImageUrls] = useState<Record<string, string>>({});
  const [pane4Open, setPane4Open] = useState(false);

  const storesRef = useRef(stores);
  storesRef.current = stores;
  const selectedStoreIdRef = useRef(selectedStoreId);
  selectedStoreIdRef.current = selectedStoreId;
  const maxSelectRef = useRef(filter.maxSelect);
  maxSelectRef.current = filter.maxSelect;

  useEffect(() => {
    const loadedStores = loadStores();
    setStores(loadedStores);
    setSettings(loadSettings());

    const savedId = loadSelectedStoreId();
    const initialId =
      savedId && loadedStores.some((s) => s.id === savedId)
        ? savedId
        : loadedStores[0]?.id ?? null;
    if (initialId) {
      setSelectedStoreId(initialId);
      selectedStoreIdRef.current = initialId;
      saveSelectedStoreId(initialId);
    }
  }, []);

  useEffect(() => {
    return () => {
      Object.values(productImageUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [productImageUrls]);

  const activeStore = resolveActiveStore(stores, selectedStoreId);
  const activeStoreId = activeStore?.id ?? null;

  const pricedQuoteLines = useMemo(
    () => buildPricedQuoteLines(quoteLines, activeStore, manualUnitPrices),
    [quoteLines, activeStore, manualUnitPrices],
  );

  const handleSaveStores = useCallback((next: Store[]) => {
    saveStores(next);
    const normalized = loadStores();
    setStores(normalized);

    let activeId = selectedStoreIdRef.current;
    if (!activeId && normalized.length > 0) {
      activeId = normalized[0].id;
      setSelectedStoreId(activeId);
      selectedStoreIdRef.current = activeId;
      saveSelectedStoreId(activeId);
    }

    setManualUnitPrices({});
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
    setManualUnitPrices({});
  }, []);

  const handleLoadProductImages = useCallback((urls: Record<string, string>) => {
    setProductImageUrls((prev) => {
      Object.values(prev).forEach((url) => URL.revokeObjectURL(url));
      return urls;
    });
  }, []);

  /** フィルター変更。業態が変わったら選択もリセット。 */
  const handleFilterChange = useCallback((next: Filter) => {
    setFilter(next);
    if (next.businessTypeId !== filter.businessTypeId) {
      setSelectedProducts([]);
      setQuoteLines([]);
      setManualUnitPrices({});
    }
  }, [filter.businessTypeId]);

  /** フィルター適用後の商品一覧（派生計算）。 */
  const filteredProducts = useMemo(() => {
    const activeOnly = products.filter((p) => p.status === "active");

    let result = activeOnly;

    if (filter.categories.length > 0) {
      result = result.filter((p) => filter.categories.includes(p.category));
    }
    if (filter.minCostPrice !== null) {
      result = result.filter((p) => p.costPrice >= filter.minCostPrice!);
    }
    if (filter.maxCostPrice !== null) {
      result = result.filter((p) => p.costPrice <= filter.maxCostPrice!);
    }
    if (filter.minRetailPrice !== null) {
      result = result.filter((p) => p.retailPrice >= filter.minRetailPrice!);
    }
    if (filter.maxRetailPrice !== null) {
      result = result.filter((p) => p.retailPrice <= filter.maxRetailPrice!);
    }
    if (filter.origin.trim() !== "") {
      const kw = filter.origin.trim().toLowerCase();
      result = result.filter((p) =>
        `${p.origin} ${p.locality}`.toLowerCase().includes(kw),
      );
    }
    if (filter.keyword.trim() !== "") {
      const kw = filter.keyword.trim().toLowerCase();
      result = result.filter((p) =>
        p.name.toLowerCase().includes(kw) || p.comment.toLowerCase().includes(kw),
      );
    }
    if (filter.capacity.trim() !== "") {
      const kw = filter.capacity.trim().toLowerCase();
      result = result.filter((p) => p.capacity.toLowerCase().includes(kw));
    }

    const bt = businessTypes.find((b) => b.id === filter.businessTypeId);
    if (bt) {
      result = sortByPriority(result, bt);
    }

    return result;
  }, [products, filter, businessTypes]);

  /** 商品の選択状態をトグル（filter.maxSelect 件まで）。 */
  const toggleProduct = useCallback((product: Product) => {
    const key = productKey(product);
    const store = resolveActiveStore(storesRef.current, selectedStoreIdRef.current);

    setSelectedProducts((prev) => {
      const exists = prev.some((p) => productKey(p) === key);
      if (exists) {
        return prev.filter((p) => productKey(p) !== key);
      }
      if (prev.length >= maxSelectRef.current) return prev;
      return [...prev, product];
    });

    setManualUnitPrices((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

    setQuoteLines((ql) => {
      const exists = ql.some((l) => productKey(l.product) === key);
      if (exists) {
        return ql.filter((l) => productKey(l.product) !== key);
      }
      if (ql.length >= maxSelectRef.current) return ql;
      const next = [
        ...ql,
        {
          product,
          quantity: 1,
          sellingPrice: calcSellingPrice(product, store),
        },
      ];
      return dedupeQuoteLines(next);
    });
  }, []);

  /** 店舗変更時に手動単価をリセットし掛率を再適用する。 */
  const handleStoreChange = useCallback((storeId: string | null) => {
    const resolvedId = storeId ?? storesRef.current[0]?.id ?? null;
    setSelectedStoreId(resolvedId);
    selectedStoreIdRef.current = resolvedId;
    saveSelectedStoreId(resolvedId);
    setManualUnitPrices({});
  }, []);

  const updateQuoteLine = useCallback(
    (lineKey: string, field: "quantity" | "sellingPrice", value: number) => {
      if (field === "sellingPrice") {
        setManualUnitPrices((prev) => ({ ...prev, [lineKey]: value }));
        return;
      }

      setQuoteLines((ql) =>
        ql.map((l) =>
          productKey(l.product) === lineKey ? { ...l, quantity: value } : l,
        ),
      );
    },
    [],
  );

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
        onLoadProductImages={handleLoadProductImages}
        productCount={products.length}
        productImageCount={Object.keys(productImageUrls).length}
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
            productImageUrls={productImageUrls}
          />
          <ProposalPane
            selectedProducts={selectedProducts}
            quoteLines={pricedQuoteLines}
            businessTypeLabel={selectedBusinessType?.label ?? null}
            productImageUrls={productImageUrls}
            settings={settings}
          />
          <QuotePane
            quoteLines={pricedQuoteLines}
            activeStore={activeStore}
            stores={stores}
            selectedStoreId={activeStoreId}
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
