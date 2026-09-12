import { Factory, Route as RouteIcon, Sprout, Weight } from "lucide-react";

import { KpiCard } from "@/components/dashboard/kpi-card";

export function MapSummaryCards({
  wasteSources,
  availableWasteTonnes,
  facilities,
  activeRoutes,
}: {
  wasteSources: number;
  availableWasteTonnes: number;
  facilities: number;
  activeRoutes: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard label="Waste Sources" value={wasteSources.toString()} icon={Sprout} tone="primary" />
      <KpiCard
        label="Available Waste"
        value={availableWasteTonnes.toLocaleString()}
        unit="tonnes"
        icon={Weight}
        tone="secondary"
      />
      <KpiCard label="Facilities" value={facilities.toString()} icon={Factory} tone="accent" />
      <KpiCard label="Active Routes" value={activeRoutes.toString()} icon={RouteIcon} tone="secondary" />
    </div>
  );
}
