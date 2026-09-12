"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";

import { Badge } from "@/components/ui/badge";
import { CHART_COLORS } from "@/components/charts/chart-colors";
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

// Centred roughly on the five-district demo area (Anand/Mehsana/Kheda/
// Ahmedabad/Gandhinagar), zoomed to show all of them at once.
const DEFAULT_CENTER: [number, number] = [22.95, 72.75];
const DEFAULT_ZOOM = 9;

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
  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {generators.map((g) => {
        const records = wasteByGenerator.get(g.id) ?? [];
        const available = records.filter((r) => r.status === "AVAILABLE");
        const totalAvailable = available.reduce((sum, r) => sum + r.quantity_tonnes, 0);

        return (
          <Marker key={g.id} position={[g.latitude, g.longitude]} icon={generatorIcon}>
            <Popup minWidth={220}>
              <div className="space-y-1.5 text-sm">
                <p className="font-semibold text-foreground">{g.name}</p>
                <p className="text-xs text-muted-foreground">{g.generator_type.replace("_", " ")}</p>
                <p className="text-xs text-muted-foreground">{g.address}</p>
                <div className="mt-2 space-y-1 border-t border-border pt-2">
                  <p className="text-xs font-medium text-foreground">
                    Available now: {totalAvailable.toLocaleString()} t
                  </p>
                  {records.slice(0, 4).map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-2 text-xs">
                      <span>{WASTE_TYPE_LABEL[r.waste_type] ?? r.waste_type}</span>
                      <span className="text-muted-foreground">{r.quantity_tonnes} t</span>
                      <Badge variant={STATUS_VARIANT[r.status] ?? "outline"} className="text-[10px]">
                        {r.status}
                      </Badge>
                    </div>
                  ))}
                  {records.length === 0 && <p className="text-xs text-muted-foreground">No waste records yet.</p>}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {showRoutes &&
        routes.map((route) => (
          <Polyline
            key={route.id}
            positions={route.path}
            pathOptions={{ color: CHART_COLORS.muted, weight: 3, opacity: 0.7, dashArray: "6 4" }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold text-foreground">Route to {route.facility_name}</p>
                <p className="text-xs text-muted-foreground">
                  {route.stops.length} stops · {route.total_distance_km} km · {route.total_waste_tonnes} t
                </p>
              </div>
            </Popup>
          </Polyline>
        ))}

      {facilities.map((f) => (
        <Marker
          key={f.id}
          position={[f.latitude, f.longitude]}
          icon={facilityIcons[f.facility_type] ?? generatorIcon}
        >
          <Popup minWidth={220}>
            <div className="space-y-1.5 text-sm">
              <p className="font-semibold text-foreground">{f.name}</p>
              <p className="text-xs text-muted-foreground">{f.facility_type.replace("_", " ")}</p>
              <p className="text-xs text-muted-foreground">{f.address}</p>
              <div className="mt-2 space-y-1 border-t border-border pt-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Capacity</span>
                  <span>{f.capacity_tonnes.toLocaleString()} t</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current load</span>
                  <span>{f.current_load_tonnes.toLocaleString()} t</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Utilization</span>
                  <span>{f.utilization_percent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={f.status === "ACTIVE" ? "default" : "outline"} className="text-[10px]">
                    {f.status}
                  </Badge>
                </div>
                <div className="pt-1">
                  <span className="text-muted-foreground">Accepts: </span>
                  {f.accepted_waste_types.map((w) => WASTE_TYPE_LABEL[w] ?? w).join(", ")}
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
