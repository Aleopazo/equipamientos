"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

interface CarInfo {
  id: string;
  name: string;
  code: string;
  order?: number | null;
}

interface CarSwitcherProps {
  cars: CarInfo[];
  activeCarId?: string;
  isSummary?: boolean;
}

export function CarSwitcher({ cars, activeCarId, isSummary = false }: CarSwitcherProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function navigate(nextParams: URLSearchParams) {
    startTransition(() => {
      const query = nextParams.toString();
      router.push(query.length > 0 ? `/?${query}` : "/");
    });
  }

  function handleCarSelect(carId: string) {
    const params = new URLSearchParams(searchParams?.toString());
    params.delete("view");
    params.set("car", carId);
    params.delete("equipment");
    navigate(params);
  }

  function handleSummarySelect() {
    const params = new URLSearchParams(searchParams?.toString());
    params.set("view", "summary");
    params.delete("car");
    params.delete("equipment");
    navigate(params);
  }

  return (
    <div className="mb-6 flex flex-wrap gap-2 rounded-3xl border border-neutral-200 bg-white/70 p-3 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/60">
      {cars.map((car) => {
        const isActive = !isSummary && car.id === activeCarId;
        return (
          <button
            key={car.id}
            type="button"
            onClick={() => handleCarSelect(car.id)}
            disabled={isPending}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-neutral-500 disabled:opacity-70",
              isActive
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700",
            )}
            aria-pressed={isActive}
          >
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-sm" aria-hidden />
            {car.name}
          </button>
        );
      })}
      <button
        type="button"
        onClick={handleSummarySelect}
        disabled={isPending}
        className={cn(
          "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-neutral-500 disabled:opacity-70",
          isSummary
            ? "bg-slate-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700",
        )}
        aria-pressed={isSummary}
      >
        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500 shadow-sm" aria-hidden />
        Resumen general
      </button>
    </div>
  );
}

