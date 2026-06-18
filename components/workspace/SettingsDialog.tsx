"use client";

import { useState } from "react";
import { Plus, Trash2, Download, Upload } from "lucide-react";

import {
  type Store,
  type Settings,
  type CategoryMarkups,
  type CategoryPricingModes,
  type CategoryPricingMode,
  storeSchema,
  CATEGORY_ORDER,
  DEFAULT_CATEGORY_MARKUPS,
  DEFAULT_CATEGORY_PRICING_MODES,
} from "@/lib/schema";
import {
  normalizeCategoryMarkups,
  normalizeCategoryPricingModes,
  exportSettingsAsJson,
  importSettingsFromJson,
} from "@/lib/data/storage";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type SettingsDialogContentProps = {
  stores: Store[];
  settings: Settings;
  onSaveStores: (stores: Store[]) => void;
  onSaveSettings: (settings: Settings) => void;
};

/** カテゴリ行の計算モードトグルボタン（÷仕入 ↔ ×小売）。 */
function ModeToggle({
  mode,
  onToggle,
}: {
  mode: CategoryPricingMode;
  onToggle: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onToggle}
      title={
        mode === "cost_divide"
          ? "仕入÷掛率（クリックで小売×係数に切替）"
          : "小売×係数（クリックで仕入÷掛率に切替）"
      }
      className="h-7 w-14 shrink-0 px-1 text-[10px] font-medium tabular-nums"
    >
      {mode === "cost_divide" ? "÷仕入" : "×小売"}
    </Button>
  );
}

export function SettingsDialogContent({
  stores,
  settings,
  onSaveStores,
  onSaveSettings,
}: SettingsDialogContentProps) {
  const [newStoreName, setNewStoreName] = useState("");
  const [newMarkups, setNewMarkups] = useState<CategoryMarkups>({ ...DEFAULT_CATEGORY_MARKUPS });
  const [newPricingModes, setNewPricingModes] = useState<CategoryPricingModes>({
    ...DEFAULT_CATEGORY_PRICING_MODES,
  });

  function handleAddStore() {
    const name = newStoreName.trim();
    const result = storeSchema.safeParse({
      id: `s-${Date.now()}`,
      name,
      categoryMarkups: newMarkups,
      categoryPricingModes: newPricingModes,
    });
    if (!result.success) return;
    onSaveStores([...stores, result.data]);
    setNewStoreName("");
    setNewMarkups({ ...DEFAULT_CATEGORY_MARKUPS });
    setNewPricingModes({ ...DEFAULT_CATEGORY_PRICING_MODES });
  }

  function handleDeleteStore(id: string) {
    onSaveStores(stores.filter((s) => s.id !== id));
  }

  function handleUpdateStoreMarkup(
    storeId: string,
    category: (typeof CATEGORY_ORDER)[number],
    value: number,
  ) {
    const next = stores.map((store) => {
      if (store.id !== storeId) return store;
      const parsed = storeSchema.safeParse({
        ...store,
        categoryMarkups: normalizeCategoryMarkups({
          ...store.categoryMarkups,
          [category]: value,
        }),
      });
      return parsed.success ? parsed.data : store;
    });
    onSaveStores(next);
  }

  function handleToggleStorePricingMode(
    storeId: string,
    category: (typeof CATEGORY_ORDER)[number],
  ) {
    const next = stores.map((store) => {
      if (store.id !== storeId) return store;
      const currentModes = normalizeCategoryPricingModes(store.categoryPricingModes);
      const current = currentModes[category];
      const toggled: CategoryPricingMode =
        current === "cost_divide" ? "retail_multiply" : "cost_divide";
      return {
        ...store,
        categoryPricingModes: { ...currentModes, [category]: toggled },
      };
    });
    onSaveStores(next);
  }

  function updateSettings(patch: Partial<Settings>) {
    onSaveSettings({ ...settings, ...patch });
  }

  function handleExport() {
    exportSettingsAsJson(stores, settings);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text !== "string") return;
      const result = importSettingsFromJson(text);
      if (!result) {
        alert("ファイルの読み込みに失敗しました。正しい設定ファイルを選んでください。");
        return;
      }
      onSaveStores(result.stores);
      onSaveSettings(result.settings);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>設定</DialogTitle>
        <DialogDescription>会社情報と店舗マスターを管理します</DialogDescription>
      </DialogHeader>

      <ScrollArea className="max-h-[70vh]">
      <FieldGroup className="px-0.5">
        {/* 会社情報 */}
        <Field>
          <FieldLabel htmlFor="settings-company">会社名</FieldLabel>
          <Input
            id="settings-company"
            value={settings.companyName}
            onChange={(e) => updateSettings({ companyName: e.target.value })}
            placeholder="株式会社〇〇酒類"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="settings-address">住所</FieldLabel>
          <Input
            id="settings-address"
            value={settings.address}
            onChange={(e) => updateSettings({ address: e.target.value })}
            placeholder="〇〇県〇〇市..."
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="settings-tel">電話番号</FieldLabel>
            <Input
              id="settings-tel"
              value={settings.tel}
            onChange={(e) => updateSettings({ tel: e.target.value })}
              placeholder="03-0000-0000"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="settings-staff">担当者名</FieldLabel>
            <Input
              id="settings-staff"
              value={settings.staffName}
            onChange={(e) => updateSettings({ staffName: e.target.value })}
              placeholder="山田 太郎"
            />
          </Field>
        </div>

        <Separator />

        {/* 店舗マスター */}
        <Field>
          <FieldLabel>店舗マスター</FieldLabel>
          <p className="text-xs text-muted-foreground">
            数値ボタンで計算方式を切り替えられます：<br />
            <span className="font-medium">÷仕入</span> = 仕入価格÷掛率　
            <span className="font-medium">×小売</span> = 小売価格×係数
          </p>
          <ScrollArea className="max-h-52">
            <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
              {stores.map((store) => {
                const modes = normalizeCategoryPricingModes(store.categoryPricingModes);
                return (
                  <div key={store.id} className="px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{store.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleDeleteStore(store.id)}
                        aria-label={`${store.name} を削除`}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                      {CATEGORY_ORDER.map((cat) => (
                        <div key={cat} className="flex items-center gap-1">
                          <label className="w-20 shrink-0 truncate text-xs text-muted-foreground">
                            {cat}
                          </label>
                          <Input
                            type="number"
                            min={0.01}
                            max={1}
                            step={0.01}
                            value={store.categoryMarkups[cat]}
                            onChange={(e) =>
                              handleUpdateStoreMarkup(
                                store.id,
                                cat,
                                parseFloat(e.target.value) || 0.8,
                              )
                            }
                            className="h-7 w-14 text-center text-xs"
                          />
                          <ModeToggle
                            mode={modes[cat]}
                            onToggle={() => handleToggleStorePricingMode(store.id, cat)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {stores.length === 0 && (
                <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                  店舗がありません
                </div>
              )}
            </div>
          </ScrollArea>

          {/* 店舗追加フォーム */}
          <div className="flex flex-col gap-2 pt-1">
            <Input
              placeholder="店舗名"
              value={newStoreName}
              onChange={(e) => setNewStoreName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddStore();
              }}
            />
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {CATEGORY_ORDER.map((cat) => (
                <div key={cat} className="flex items-center gap-1">
                  <label className="w-20 shrink-0 text-xs text-muted-foreground truncate">
                    {cat}
                  </label>
                  <Input
                    type="number"
                    min={0.01}
                    max={1}
                    step={0.01}
                    value={newMarkups[cat]}
                    onChange={(e) =>
                      setNewMarkups((m) => ({
                        ...m,
                        [cat]: parseFloat(e.target.value) || 0.8,
                      }))
                    }
                    className="h-7 w-14 text-center text-xs"
                  />
                  <ModeToggle
                    mode={newPricingModes[cat]}
                    onToggle={() =>
                      setNewPricingModes((prev) => ({
                        ...prev,
                        [cat]:
                          prev[cat] === "cost_divide" ? "retail_multiply" : "cost_divide",
                      }))
                    }
                  />
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddStore}
              disabled={!newStoreName.trim()}
              className="self-end"
            >
              <Plus data-icon="inline-start" />
              店舗を追加
            </Button>
          </div>
        </Field>
      </FieldGroup>
      </ScrollArea>

      <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleExport}>
            <Download data-icon="inline-start" />
            設定を保存
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => document.getElementById("settings-import-input")?.click()}
          >
            <Upload data-icon="inline-start" />
            設定を読込
          </Button>
          <input
            id="settings-import-input"
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
        </div>
        <DialogClose render={<Button variant="outline">閉じる</Button>} />
      </DialogFooter>
    </DialogContent>
  );
}
