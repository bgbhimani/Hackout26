"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EMPTY_FILTERS, MapFilters, type MapFilterState } from "@/components/map/map-filters";
import { MapLegend } from "@/components/map/map-legend";
import { MapSummaryCards } from "@/components/map/map-summary-cards";
import { useMapData } from "@/hooks/use-map-data";
import type { WasteRecordWithGenerator } from "@/types";

// Leaflet touches `window` at import time, so the map itself must never be
// part of the server-rendered bundle - ssr:false is required here, not optional.
const NetworkMap = dynamic(() => import("@/components/map/network-map").then((m) => m.NetworkMap), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

export default function MapPage() {
  const { generators, facilities, wasteRecords, routes, loading, error } = useMapData();
  const [filters, setFilters] = useState<MapFilterState>(EMPTY_FILTERS);

  const wasteByGenerator = useMemo(() => {
    const map = new Map<string, WasteRecordWithGenerator[]>();
    for (const record of wasteRecords) {
      const list = map.get(record.generator_id) ?? [];
      list.push(record);
      map.set(record.generator_id, list);
    }
    return map;
  }, [wasteRecords]);

  const filteredWasteRecords = useMemo(
    () =>
      wasteRecords.filter(
        (r) =>
          (filters.wasteTypes.length === 0 || filters.wasteTypes.includes(r.waste_type)) &&
          (filters.statuses.length === 0 || filters.statuses.includes(r.status))
      ),
    [wasteRecords, filters]
  );

  const matchingGeneratorIds = useMemo(
    () => new Set(filteredWasteRecords.map((r) => r.generator_id)),
    [filteredWasteRecords]
  );

  const filteredGenerators = useMemo(
    () =>
      generators.filter((g) => {
        if (filters.generatorTypes.length > 0 && !filters.generatorTypes.includes(g.generator_type)) return false;
        // Only apply the waste-record-derived filter if a waste/status filter is active -
        // otherwise every generator (even ones with no matching record this month) stays visible.
        if ((filters.wasteTypes.length > 0 || filters.statuses.length > 0) && !matchingGeneratorIds.has(g.id)) {
          return false;
        }
        return true;
      }),
    [generators, filters, matchingGeneratorIds]
  );

  const filteredFacilities = useMemo(
    () =>
      facilities.filter((f) => {
        if (filters.facilityTypes.length > 0 && !filters.facilityTypes.includes(f.facility_type)) return false;
        if (filters.wasteTypes.length > 0 && !f.accepted_waste_types.some((w) => filters.wasteTypes.includes(w))) {
          return false;
        }
        return true;
      }),
    [facilities, filters]
  );

  const availableWasteTonnes = useMemo(
    () =>
      filteredWasteRecords
        .filter((r) => filteredGenerators.some((g) => g.id === r.generator_id) && r.status === "AVAILABLE")
        .reduce((sum, r) => sum + r.quantity_tonnes, 0),
    [filteredWasteRecords, filteredGenerators]
  );

  if (error) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Network Map</h1>
        <Card>
          <CardContent className="p-6 text-sm text-destructive">Couldn&apos;t load map data: {error}</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Network Map</h1>
        <p className="text-sm text-muted-foreground">
          Waste generators, conversion facilities, and their locations across Gujarat.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[92px]" />
          ))}
        </div>
      ) : (
        <MapSummaryCards
          wasteSources={filteredGenerators.length}
          availableWasteTonnes={Math.round(availableWasteTonnes)}
          facilities={filteredFacilities.length}
          activeRoutes={routes.length}
        />
      )}

      <MapFilters value={filters} onChange={setFilters} />
      <MapLegend />

      <Card className="min-h-[520px] flex-1 overflow-hidden p-0">
        {loading ? (
          <Skeleton className="h-[520px] w-full" />
        ) : (
          <div className="h-[520px] w-full">
            <NetworkMap
              generators={filteredGenerators}
              facilities={filteredFacilities}
              wasteByGenerator={wasteByGenerator}
              routes={routes}
              showRoutes={filters.showRoutes}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
