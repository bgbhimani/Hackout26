import { Factory, Route as RouteIcon, Sprout, Weight } from "lucide-react";

import { cn } from "@/lib/utils";
import { KpiCard } from "@/components/dashboard/kpi-card";

export function MapSummaryCards({
  wasteSources,
  availableWasteTonnes,
  facilities,
  activeRoutes,
  hideWasteSources = false,
}: {
  wasteSources: number;
  availableWasteTonnes: number;
  facilities: number;
  activeRoutes: number;
  /** A Waste Generator's map hides every other generator (see map/page.tsx),
   * so "Waste Sources" and "Available Waste" would only ever read as 0/0 for
   * that role - misleading, not just uninteresting. Drop to a 2-up grid of
   * the two cards that still mean something instead. */
  hideWasteSources?: boolean;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", !hideWasteSources && "lg:grid-cols-4")}>
      {!hideWasteSources && (
        <>
          <KpiCard label="Waste Sources" value={wasteSources.toString()} icon={Sprout} tone="primary" />
          <KpiCard
            label="Available Waste"
            value={availableWasteTonnes.toLocaleString()}
            unit="tonnes"
            icon={Weight}
            tone="secondary"
          />
        </>
      )}
      <KpiCard label="Facilities" value={facilities.toString()} icon={Factory} tone="accent" />
      <KpiCard label="Active Routes" value={activeRoutes.toString()} icon={RouteIcon} tone="secondary" />
    </div>
  );
}
