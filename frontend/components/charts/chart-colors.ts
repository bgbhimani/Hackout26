/** Shared categorical palette for every chart - pulled from the same design
 * tokens as the rest of the UI (see app/globals.css) so charts never
 * introduce a color the rest of the product doesn't already use. */
export const CHART_COLORS = {
  primary: "#4f7d5a", // sage green
  accent: "#d99a4e", // warm amber
  secondary: "#6f9caf", // soft blue, slightly deepened from --secondary for line/bar contrast
  muted: "#a3a89e", // warm gray
  destructive: "#c1502e",
} as const;

/** Ordered palette for multi-category charts (e.g. "waste by type" with up
 * to 7 waste types) - cycles through the warm palette rather than
 * generating arbitrary hues. */
export const CATEGORY_PALETTE = [
  CHART_COLORS.primary,
  CHART_COLORS.accent,
  CHART_COLORS.secondary,
  "#7fa787", // lighter green
  "#e0b579", // lighter amber
  "#8fb3c2", // lighter blue
  CHART_COLORS.muted,
];

export const AXIS_TICK_STYLE = { fontSize: 12, fill: "#6b756d" };
