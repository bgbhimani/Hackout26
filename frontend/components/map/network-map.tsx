"use client";

import { useEffect, useMemo } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { History, MapPin, Package, ShieldCheck, Sparkles, Sprout } from "lucide-react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { facilityIcons, generatorIcon } from "@/components/map/marker-icons";
import type { Facility, Generator, OptimizedRoute, WasteRecordWithGenerator } from "@/types";

const WASTE_TYPE_LABEL: Record<string, string> = {
  RICE_STRAW: "Rice Straw",
  WHEAT_STRAW: "Wheat Straw",
  COTTON_RESIDUE: "Cotton Residue",
  SUGARCANE_RESIDUE: "Sugarcane Residue",
  FOOD_WASTE: "Food Waste",
  ORGANIC_WASTE: "Organic Waste",
  ANIMAL_MANURE: "Animal Manure",
};

const STATUS_VARIANT: Record<string, "default" | "accent" | "secondary" | "outline"> = {
  AVAILABLE: "default",
  PENDING: "accent",
  COLLECTED: "secondary",
  PROCESSED: "outline",
};

// Centred roughly on the demo area - only used as a fallback before
// FitBounds below adjusts to whatever data is actually being shown, and
// when there's no data at all to fit to.
const DEFAULT_CENTER: [number, number] = [22.95, 72.75];
const DEFAULT_ZOOM = 9;

/** Zooms/pans the map to frame exactly what's currently being shown, instead
 * of always sitting at a fixed province-wide view. Without this, a single
 * ~14km route (a very normal result once there's only one or two generators
 * matched to a facility) renders as a ~50px sliver on a map framing the
 * whole of Gujarat - visually indistinguishable from "nothing happened",
 * even though the data and the polyline are both completely correct. Refits
 * whenever the set of visible points changes (e.g. a filter is applied). */
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    const [first, ...rest] = points;
    if (first === undefined) return;
    if (rest.length === 0) {
      map.setView(first, 13);
      return;
    }
    const bounds = L.latLngBounds(points.map(([lat, lng]) => L.latLng(lat, lng)));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 13 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, JSON.stringify(points)]);

  return null;
}

export function NetworkMap({
  generators,
  facilities,
  wasteByGenerator,
  routes = [],
  showRoutes = true,
}: {
  generators: Generator[];
  facilities: Facility[];
  wasteByGenerator: Map<string, WasteRecordWithGenerator[]>;
  routes?: OptimizedRoute[];
  showRoutes?: boolean;
}) {
  // What to frame the view around. Generators + facilities together always
  // span roughly the whole of Gujarat (that's the whole network), so folding
  // a route's points into that same bounds would still make it a ~50px
  // sliver on a province-wide view - no better than not fitting at all. When
  // there's at least one route to show, frame around the route(s)
  // specifically instead - that's the thing actually worth zooming to; the
  // rest of the network is still there to explore by zooming/panning out.
  // Only fall back to framing the full generator/facility roster when there
  // are no routes to show at all.
  const routePoints = useMemo(
    () => (showRoutes ? routes.flatMap((route) => route.path as [number, number][]) : []),
    [routes, showRoutes]
  );
  const networkPoints = useMemo(
    (): [number, number][] => [
      ...generators.map((g): [number, number] => [g.latitude, g.longitude]),
      ...facilities.map((f): [number, number] => [f.latitude, f.longitude]),
    ],
    [generators, facilities]
  );
  const boundsPoints = routePoints.length > 0 ? routePoints : networkPoints;

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <FitBounds points={boundsPoints} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Generator / Verified Farm Pins with Detailed Edit Audit & Batch Tracking.
          (Previously wrapped in react-leaflet-cluster's MarkerClusterGroup to
          spread out overlapping markers in dense areas - removed after it
          was found to keep stale markers from a prior render in its own
          internal spatial index, surviving even a full page reload with
          fresh data. Correctness beats the clustering convenience.) */}
      {generators.map((g) => {
        const records = wasteByGenerator.get(g.id) ?? [];
        const available = records.filter((r) => r.status === "AVAILABLE");
        const totalAvailable = available.reduce((sum, r) => sum + r.quantity_tonnes, 0);

        return (
          <Marker key={g.id} position={[g.latitude, g.longitude]} icon={generatorIcon}>
            <Popup minWidth={260}>
              <div className="space-y-2 text-sm">
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <p className="font-bold text-foreground leading-snug">{g.name}</p>
                    <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      {g.generator_type.replace("_", " ")}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-muted/30">
                    <ShieldCheck className="h-2.5 w-2.5 mr-0.5 text-emerald-600" /> Verified
                  </Badge>
                </div>

                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p className="flex items-start gap-1">
                    <MapPin className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                    <span>{g.address}</span>
                  </p>
                  {g.contact_name && <p className="pl-4">Contact: {g.contact_name}</p>}
                </div>

                {/* Edit History & Audit Info */}
                <div className="flex items-center gap-1 rounded bg-muted/50 px-2 py-1 text-[10px] text-muted-foreground">
                  <History className="h-3 w-3 text-primary" />
                  <span>
                    Location verified • Updated {new Date(g.updated_at || g.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Active Batches Section */}
                <div className="space-y-1.5 border-t border-border pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground flex items-center gap-1">
                      <Package className="h-3 w-3 text-emerald-600" />
                      Available Biomass:
                    </span>
                    <span className="font-bold text-emerald-600">
                      {totalAvailable.toLocaleString()} MT
                    </span>
                  </div>

                  {records.length > 0 ? (
                    <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                      {records.slice(0, 4).map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between gap-2 text-[11px] rounded bg-muted/30 px-1.5 py-0.5"
                        >
                          <span className="truncate">{WASTE_TYPE_LABEL[r.waste_type] ?? r.waste_type}</span>
                          <span className="font-semibold text-foreground whitespace-nowrap">{r.quantity_tonnes} t</span>
                          <Badge variant={STATUS_VARIANT[r.status] ?? "outline"} className="text-[9px] px-1 py-0">
                            {r.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic">No active batches logged currently.</p>
                  )}
                </div>

                {available.length > 0 && available[0] && (
                  <div className="pt-1">
                    <Button asChild size="sm" className="w-full h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                      <Link href={`/matching?wasteId=${available[0].id}`}>
                        <Sparkles className="h-3 w-3 mr-1" />
                        Find Matched Plants
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Facility Pins */}
      {facilities.map((f) => (
        <Marker
          key={f.id}
          position={[f.latitude, f.longitude]}
          icon={facilityIcons[f.facility_type] ?? facilityIcons.BIOMASS_CONVERSION}
        >
          <Popup minWidth={220}>
            <div className="space-y-1.5 text-sm">
              <p className="font-semibold text-foreground">{f.name}</p>
              <p className="text-xs text-muted-foreground">{f.facility_type.replace("_", " ")}</p>
              <p className="text-xs text-muted-foreground">{f.address}</p>
              <div className="mt-2 space-y-1 border-t border-border pt-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Capacity:</span>
                  <span className="font-medium">{f.capacity_tonnes.toLocaleString()} t/day</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current load:</span>
                  <span className="font-medium">{f.current_load_tonnes.toLocaleString()} t</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Utilization:</span>
                  <span className="font-medium">{f.utilization_percent}%</span>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Routes - a bold white "halo" underneath a solid, saturated line on
          top. The previous style (muted gray, dashed, 70% opacity) all but
          disappeared against OpenStreetMap's own gray/tan road rendering -
          this needs to read clearly even crossing a dense highway interchange. */}
      {showRoutes &&
        routes.map((route) => (
          <Polyline
            key={`${route.id}-halo`}
            positions={route.path}
            pathOptions={{ color: "#ffffff", weight: 7, opacity: 0.9 }}
          />
        ))}
      {showRoutes &&
        routes.map((route) => (
          <Polyline
            key={route.id}
            positions={route.path}
            pathOptions={{ color: "#1d4ed8", weight: 4, opacity: 1 }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold text-foreground">Route to {route.facility_name}</p>
                <p className="text-xs text-muted-foreground">
                  {route.total_distance_km.toFixed(1)} km · {route.stops.length} stops
                </p>
                <p className="text-xs text-muted-foreground">Total: {route.total_waste_tonnes} t waste</p>
              </div>
            </Popup>
          </Polyline>
        ))}
    </MapContainer>
  );
}
