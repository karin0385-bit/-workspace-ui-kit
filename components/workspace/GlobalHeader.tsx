"use client";

import { Settings } from "lucide-react";

import { type Store, type Settings as SettingsType } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SettingsDialogContent } from "@/components/workspace/SettingsDialog";

type GlobalHeaderProps = {
  workspaceName: string;
  businessTypeLabel: string | null;
  selectedCount: number;
  stores: Store[];
  settings: SettingsType;
  onSaveStores: (stores: Store[]) => void;
  onSaveSettings: (settings: SettingsType) => void;
};

export function GlobalHeader({
  workspaceName,
  businessTypeLabel,
  selectedCount,
  stores,
  settings,
  onSaveStores,
  onSaveSettings,
}: GlobalHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-3">
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-muted-foreground">{workspaceName}</span>
          {businessTypeLabel && (
            <>
              <span className="text-muted-foreground/40">/</span>
              <span className="font-medium text-foreground">{businessTypeLabel}</span>
            </>
          )}
          {selectedCount > 0 && (
            <>
              <span className="text-muted-foreground/40">/</span>
              <span className="text-muted-foreground">{selectedCount} 件選択中</span>
            </>
          )}
        </div>
      </div>

      <Dialog>
        <Tooltip>
          <TooltipTrigger
            render={
              <DialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label="設定"
                  >
                    <Settings />
                  </Button>
                }
              />
            }
          />
          <TooltipContent side="bottom">設定</TooltipContent>
        </Tooltip>
        <SettingsDialogContent
          stores={stores}
          settings={settings}
          onSaveStores={onSaveStores}
          onSaveSettings={onSaveSettings}
        />
      </Dialog>
    </header>
  );
}
