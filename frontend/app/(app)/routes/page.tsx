"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Route as RouteIcon, TriangleAlert, Truck, Weight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RouteTimeline } from "@/components/routes/route-timeline";
import { apiFetch, ApiError } from "@/lib/api";
import type { Facility, OptimizedRoute, WasteRecordWithGenerator } from "@/types";

const RouteMap = dynamic(() => import("@/components/routes/route-map").then((m) => m.RouteMap), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

const WASTE_TYPE_LABEL: Record<string, string> = {
  RICE_STRAW: "Rice Straw",
  WHEAT_STRAW: "Wheat Straw",
  COTTON_RESIDUE: "Cotton Residue",
  SUGARCANE_RESIDUE: "Sugarcane Residue",
  FOOD_WASTE: "Food Waste",
  ORGANIC_WASTE: "Organic Waste",
  ANIMAL_MANURE: "Animal Manure",
};

export default function RoutesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [wasteRecords, setWasteRecords] = useState<WasteRecordWithGenerator[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [facilityId, setFacilityId] = useState("");
  const [selectedWasteIds, setSelectedWasteIds] = useState<Set<string>>(new Set());
  const [vehicleCapacity, setVehicleCapacity] = useState<string>("");
  const [route, setRoute] = useState<OptimizedRoute | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([apiFetch<Facility[]>("/api/facilities"), apiFetch<WasteRecordWithGenerator[]>("/api/waste")])
      .then(([f, w]) => {
        if (cancelled) return;
        setFacilities(f);
        setWasteRecords(w.filter((r) => r.status === "AVAILABLE"));
        if (f[0]) setFacilityId(f[0].id);
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Failed to load data"))
      .finally(() => !cancelled && setLoadingData(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedFacility = useMemo(() => facilities.find((f) => f.id === facilityId), [facilities, facilityId]);

  const compatibleWaste = useMemo(
    () =>
      selectedFacility
        ? wasteRecords.filter((r) => selectedFacility.accepted_waste_types.includes(r.waste_type))
        : [],
    [wasteRecords, selectedFacility]
  );

  // Default selection: everything compatible, and a vehicle capacity that
  // comfortably covers it - so the optimizer has a realistic "everything
  // fits" starting point, and the user can lower capacity to see stops drop.
  useEffect(() => {
    setSelectedWasteIds(new Set(compatibleWaste.map((r) => r.id)));
    const total = compatibleWaste.reduce((sum, r) => sum + r.quantity_tonnes, 0);
    setVehicleCapacity(total > 0 ? Math.ceil(total).toString() : "300");
    setRoute(null);
  }, [compatibleWaste]);

  function toggleWaste(id: string) {
    setSelectedWasteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleOptimize() {
    if (!facilityId || selectedWasteIds.size === 0) return;
    setOptimizing(true);
    setError(null);
    setRoute(null);
    try {
      const result = await apiFetch<OptimizedRoute>("/api/routes/optimize", {
        method: "POST",
        body: JSON.stringify({
          facility_id: facilityId,
          waste_record_ids: Array.from(selectedWasteIds),
          vehicle_capacity_tonnes: vehicleCapacity ? Number(vehicleCapacity) : undefined,
        }),
      });
      setRoute(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to optimize route");
    } finally {
      setOptimizing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Route Optimization</h1>
        <p className="text-sm text-muted-foreground">
          A real capacitated vehicle routing solve (Google OR-Tools) - not a straight line between points.
        </p>
      </div>

      {loadingData ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="facility">Destination facility</Label>
                <SelectNative id="facility" value={facilityId} onChange={(e) => setFacilityId(e.target.value)}>
                  {facilities.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.capacity_tonnes - f.current_load_tonnes}t spare)
                    </option>
                  ))}
                </SelectNative>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="capacity">Vehicle capacity (tonnes)</Label>
                <Input
                  id="capacity"
                  type="number"
                  min={1}
                  value={vehicleCapacity}
                  onChange={(e) => setVehicleCapacity(e.target.value)}
                />
              </div>
            </div>

            {compatibleWaste.length === 0 ? (
              <EmptyState
                icon={Truck}
                title="No compatible available waste"
                description="No AVAILABLE waste record matches this facility's accepted waste types."
              />
            ) : (
              <div className="space-y-1.5">
                <Label>Waste records to collect ({selectedWasteIds.size} selected)</Label>
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                  {compatibleWaste.map((r) => (
                    <label
                      key={r.id}
                      className="flex cursor-pointer items-center justify-between gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedWasteIds.has(r.id)}
                          onChange={() => toggleWaste(r.id)}
                          className="accent-primary"
                        />
                        {r.generator_name}
                        <span className="text-xs text-muted-foreground">
                          ({WASTE_TYPE_LABEL[r.waste_type] ?? r.waste_type})
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground">{r.quantity_tonnes} t</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={handleOptimize} disabled={optimizing || selectedWasteIds.size === 0}>
              <RouteIcon className="h-4 w-4" />
              {optimizing ? "Optimizing route..." : "Optimize Route"}
            </Button>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="p-5 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {optimizing && <Skeleton className="h-96 w-full" />}

      {!optimizing && route && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Total Distance" value={route.total_distance_km.toString()} unit="km" icon={RouteIcon} />
            <KpiCard label="Total Waste" value={route.total_waste_tonnes.toString()} unit="tonnes" icon={Weight} tone="secondary" />
            <KpiCard
              label="Estimated Cost"
              value={`₹${route.estimated_transport_cost.toLocaleString()}`}
              icon={Truck}
              tone="accent"
            />
            <KpiCard label="Number of Stops" value={route.stops.length.toString()} icon={RouteIcon} tone="secondary" />
          </div>

          {route.facility_capacity_warning && (
            <Card className="border-accent bg-accent-light/40">
              <CardContent className="flex items-start gap-2 p-4 text-sm text-foreground">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent-foreground" />
                {route.facility_capacity_warning}
              </CardContent>
            </Card>
          )}

          {route.dropped_stops.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {route.dropped_stops.length} stop{route.dropped_stops.length > 1 ? "s" : ""} could not be
                  included
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {route.dropped_stops.map((d) => (
                  <div key={d.generator_id} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{d.generator_name}</span>
                    <span className="text-xs text-muted-foreground">{d.reason}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Route Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <RouteTimeline route={route} />
              </CardContent>
            </Card>

            <Card className="min-h-[400px] overflow-hidden p-0">
              <div className="h-[400px] w-full">
                <RouteMap route={route} />
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
