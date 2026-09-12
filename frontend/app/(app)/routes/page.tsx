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
import type { Facility, OptimizedRoute, PendingMatchOut } from "@/types";

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
  const [loadingFacilities, setLoadingFacilities] = useState(true);
  const [facilityId, setFacilityId] = useState("");

  // Waste a route can actually be built from: matches this facility's
  // operator has ACCEPTED (see matching/pending), not yet routed. This is a
  // UI convenience mirroring what POST /api/routes/optimize independently
  // re-validates server-side - it can't be bypassed by editing this list.
  const [acceptedMatches, setAcceptedMatches] = useState<PendingMatchOut[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [selectedWasteIds, setSelectedWasteIds] = useState<Set<string>>(new Set());
  const [vehicleCapacity, setVehicleCapacity] = useState<string>("");
  const [route, setRoute] = useState<OptimizedRoute | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<Facility[]>("/api/facilities")
      .then((f) => {
        if (cancelled) return;
        setFacilities(f);
        if (f[0]) setFacilityId(f[0].id);
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Failed to load facilities"))
      .finally(() => !cancelled && setLoadingFacilities(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!facilityId) return;
    let cancelled = false;
    setLoadingMatches(true);
    setError(null);
    apiFetch<PendingMatchOut[]>(`/api/matching/accepted?facility_id=${facilityId}`)
      .then((matches) => {
        if (cancelled) return;
        setAcceptedMatches(matches);
        setSelectedWasteIds(new Set(matches.map((m) => m.waste_record_id)));
        const total = matches.reduce((sum, m) => sum + m.quantity_tonnes, 0);
        setVehicleCapacity(total > 0 ? Math.ceil(total).toString() : "300");
        setRoute(null);
      })
      .catch((err) => {
        if (cancelled) return;
        // A FACILITY_OPERATOR viewing a facility they don't own gets a real
        // 403 here - show it as "nothing to route" rather than a scary error,
        // since picking someone else's facility from the dropdown is a valid
        // (if unproductive) thing to do, not a bug.
        if (err instanceof ApiError && err.status === 403) {
          setAcceptedMatches([]);
          setSelectedWasteIds(new Set());
        } else {
          setError(err instanceof Error ? err.message : "Failed to load accepted matches");
        }
      })
      .finally(() => !cancelled && setLoadingMatches(false));
    return () => {
      cancelled = true;
    };
  }, [facilityId]);

  const selectedFacility = useMemo(() => facilities.find((f) => f.id === facilityId), [facilities, facilityId]);

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
      // Routed waste records move to COLLECTED server-side - drop them from
      // the pickable list rather than refetching.
      setAcceptedMatches((prev) => prev.filter((m) => !selectedWasteIds.has(m.waste_record_id)));
      setSelectedWasteIds(new Set());
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
          A real capacitated vehicle routing solve (Google OR-Tools) - built only from waste this facility has
          already accepted, not a straight line between points.
        </p>
      </div>

      {loadingFacilities ? (
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

            {loadingMatches ? (
              <Skeleton className="h-24 w-full" />
            ) : acceptedMatches.length === 0 ? (
              <EmptyState
                icon={Truck}
                title="No accepted waste to collect"
                description={
                  selectedFacility
                    ? `No generator's match has been accepted for ${selectedFacility.name} yet - accept a request on the Pending Requests page first.`
                    : "Select a facility you operate to see waste it has accepted."
                }
              />
            ) : (
              <div className="space-y-1.5">
                <Label>Accepted waste to collect ({selectedWasteIds.size} selected)</Label>
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                  {acceptedMatches.map((m) => (
                    <label
                      key={m.waste_record_id}
                      className="flex cursor-pointer items-center justify-between gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedWasteIds.has(m.waste_record_id)}
                          onChange={() => toggleWaste(m.waste_record_id)}
                          className="accent-primary"
                        />
                        {m.generator_name}
                        <span className="text-xs text-muted-foreground">
                          ({WASTE_TYPE_LABEL[m.waste_type] ?? m.waste_type})
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground">{m.quantity_tonnes} t</span>
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
