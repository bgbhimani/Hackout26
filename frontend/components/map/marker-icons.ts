import L from "leaflet";

import { CHART_COLORS } from "@/components/charts/chart-colors";

/**
 * Leaflet's default marker icon references image files by a relative path
 * that most bundlers (including Next.js) break, producing the well-known
 * "broken image" pin. Rather than fight that asset pipeline, every marker
 * here is a small inline SVG divIcon - it also lets us match the app's
 * warm color palette instead of Leaflet's default blue pin.
 */
function circleIcon(color: string, size = 26): L.DivIcon {
  return L.divIcon({
    className: "", // suppress Leaflet's default styling
    html: `
      <div style="
        width:${size}px;height:${size}px;border-radius:9999px;
        background:${color};border:2px solid #ffffff;
        box-shadow:0 1px 3px rgba(38,51,42,0.35);
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

export const generatorIcon = circleIcon(CHART_COLORS.primary);

export const facilityIcons: Record<string, L.DivIcon> = {
  BIOCHAR: circleIcon(CHART_COLORS.accent, 30),
  BIOGAS: circleIcon(CHART_COLORS.secondary, 30),
  BIOMASS_CONVERSION: circleIcon("#8a6d3b", 30), // distinct warm brown, third facility type
};
