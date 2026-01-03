"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

interface EquipmentDetailTab {
  id: string;
  label: string;
  description?: string;
  content: React.ReactNode;
}

interface EquipmentDetailTabsProps {
  tabs: EquipmentDetailTab[];
  defaultTabId?: string;
}

export function EquipmentDetailTabs({ tabs, defaultTabId }: EquipmentDetailTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTabId ?? tabs[0]?.id);

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;

        return (
          <article
            key={tab.id}
            className={cn(
              "overflow-hidden rounded-2xl border transition-all",
              isActive
                ? "border-neutral-200 bg-white/90 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/80"
                : "border-neutral-200/60 bg-white/60 dark:border-neutral-800 dark:bg-neutral-900/40",
            )}
          >
            <button
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition",
                isActive
                  ? "text-neutral-900 dark:text-neutral-100"
                  : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200",
              )}
            >
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide">{tab.label}</p>
                {tab.description ? (
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {tab.description}
                  </p>
                ) : null}
              </div>
              <span
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold transition",
                  isActive
                    ? "border-neutral-400 text-neutral-700 dark:border-neutral-600 dark:text-neutral-200"
                    : "border-neutral-300 text-neutral-400 dark:border-neutral-700 dark:text-neutral-500",
                )}
              >
                {isActive ? "−" : "+"}
              </span>
            </button>
            {isActive ? (
              <div className="border-t border-neutral-100 px-5 py-4 text-sm dark:border-neutral-800">
                {tab.content}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

