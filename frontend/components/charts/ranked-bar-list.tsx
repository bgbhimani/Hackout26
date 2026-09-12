"use client";

import { BarChart3 } from "lucide-react";

import { CATEGORY_PALETTE } from "@/components/charts/chart-colors";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

/**
 * A categorical breakdown rendered as plain HTML progress bars instead of an
 * axis-based chart. Deliberately not Recharts: an axis chart with only one
 * or two categories has nothing to draw an axis against and reads as
 * broken (see the Carbon page's "by waste type"/"by facility" cards, which
 * hit a Recharts edge case where a near-empty category axis falls back to
 * bogus auto-generated numeric ticks). A ranked list has no axis to get
 * wrong - it scales cleanly from one row to a dozen.
 */
export function RankedBarList({
  data,
  valueSuffix = "",
  emptyTitle,
  emptyDescription,
}: {
  data: { label: string; value: number }[];
  valueSuffix?: string;
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (data.length === 0) {
    return <EmptyState icon={BarChart3} title={emptyTitle} description={emptyDescription} />;
  }

  const sorted = [...data].sort((a, b) => b.value - a.value);
  const max = Math.max(...sorted.map((d) => d.value), 0.0001);

  return (
    <ul className="flex flex-col gap-4">
      {sorted.map((item, index) => {
        const percent = Math.max((item.value / max) * 100, 2);
        const color = CATEGORY_PALETTE[index % CATEGORY_PALETTE.length];
        return (
          <li key={item.label} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium text-foreground">{item.label}</span>
              <span className={cn("shrink-0 tabular-nums text-muted-foreground")}>
                {item.value.toLocaleString()}
                {valueSuffix}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-[width]"
                style={{ width: `${percent}%`, backgroundColor: color }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
