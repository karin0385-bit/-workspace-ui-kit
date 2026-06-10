"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import {
  type Store,
  type Settings,
  type CategoryMarkups,
  storeSchema,
  CATEGORY_ORDER,
  DEFAULT_CATEGORY_MARKUPS,
} from "@/lib/schema";
import { normalizeCategoryMarkups } from "@/lib/data/storage";
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

export function SettingsDialogContent({
  stores,
  settings,
  onSaveStores,
  onSaveSettings,
}: SettingsDialogContentProps) {
  const [localSettings, setLocalSettings] = useState<Settings>(settings);
  const [newStoreName, setNewStoreName] = useState("");
  const [newMarkups, setNewMarkups] = useState<CategoryMarkups>({ ...DEFAULT_CATEGORY_MARKUPS });

  function handleAddStore() {
    const name = newStoreName.trim();
    const result = storeSchema.safeParse({
      id: `s-${Date.now()}`,
      name,
      categoryMarkups: newMarkups,
    });
    if (!result.success) return;
    onSaveStores([...stores, result.data]);
    setNewStoreName("");
    setNewMarkups({ ...DEFAULT_CATEGORY_MARKUPS });
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

  function handleSaveSettings() {
    onSaveSettings(localSettings);
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
            value={localSettings.companyName}
            onChange={(e) =>
              setLocalSettings((s) => ({ ...s, companyName: e.target.value }))
            }
            placeholder="株式会社〇〇酒類"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="settings-address">住所</FieldLabel>
          <Input
            id="settings-address"
            value={localSettings.address}
            onChange={(e) =>
              setLocalSettings((s) => ({ ...s, address: e.target.value }))
            }
            placeholder="〇〇県〇〇市..."
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="settings-tel">電話番号</FieldLabel>
            <Input
              id="settings-tel"
              value={localSettings.tel}
              onChange={(e) =>
                setLocalSettings((s) => ({ ...s, tel: e.target.value }))
              }
              placeholder="03-0000-0000"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="settings-staff">担当者名</FieldLabel>
            <Input
              id="settings-staff"
              value={localSettings.staffName}
              onChange={(e) =>
                setLocalSettings((s) => ({ ...s, staffName: e.target.value }))
              }
              placeholder="山田 太郎"
            />
          </Field>
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSaveSettings}
          >
            会社情報を保存
          </Button>
        </div>

        <Separator />

        {/* 店舗マスター */}
        <Field>
          <FieldLabel>店舗マスター</FieldLabel>
          <p className="text-xs text-muted-foreground">
            販売単価 = 仕入価格 ÷ 掛け率（例: 仕入 800 円・0.8 → 1,000 円）
          </p>
          <ScrollArea className="max-h-52">
            <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
              {stores.map((store) => (
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
                      <div key={cat} className="flex items-center gap-1.5">
                        <label className="w-24 shrink-0 truncate text-xs text-muted-foreground">
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
                          className="h-7 w-16 text-center text-xs"
                        />
                        <span className="text-xs text-muted-foreground">÷</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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
                <div key={cat} className="flex items-center gap-1.5">
                  <label className="w-24 shrink-0 text-xs text-muted-foreground truncate">
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
                    className="h-7 w-16 text-center text-xs"
                  />
                  <span className="text-xs text-muted-foreground">÷</span>
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

      <DialogFooter>
        <DialogClose render={<Button variant="outline">閉じる</Button>} />
      </DialogFooter>
    </DialogContent>
  );
}
