"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";

import { CHART_COLORS } from "@/components/charts/chart-colors";
import { generatorIcon } from "@/components/map/marker-icons";
import type { OptimizedRoute } from "@/types";

const facilityDepotIcon = (() => {
  // A slightly larger marker distinguishes the depot/end-point from the
  // pickup stops sharing the same facility-type color used on the network map.
  return L.divIcon({
    className: "",
    html: `<div style="width:34px;height:34px;border-radius:9999px;background:${CHART_COLORS.accent};border:3px solid #ffffff;box-shadow:0 1px 4px rgba(38,51,42,0.4);"></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
  });
})();

export function RouteMap({ route }: { route: OptimizedRoute }) {
  const center: [number, number] = route.path[0] ?? [22.95, 72.75];

  return (
    <MapContainer center={center} zoom={9} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Polyline positions={route.path} pathOptions={{ color: CHART_COLORS.primary, weight: 3, opacity: 0.8 }} />

      {route.stops.map((s) => (
        <Marker key={s.generator_id} position={[s.latitude, s.longitude]} icon={generatorIcon}>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">
                Stop {s.stop_order}: {s.generator_name}
              </p>
              <p className="text-xs text-muted-foreground">{s.quantity_tonnes} t</p>
            </div>
          </Popup>
        </Marker>
      ))}

      <Marker position={route.path[0] ?? center} icon={facilityDepotIcon}>
        <Popup>
          <div className="text-sm">
            <p className="font-semibold">{route.facility_name}</p>
            <p className="text-xs text-muted-foreground">Depot / drop-off point</p>
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
}
