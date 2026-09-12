import { CHART_COLORS } from "@/components/charts/chart-colors";

function Swatch({ color, shape = "circle" }: { color: string; shape?: "circle" | "line" }) {
  if (shape === "line") {
    return <span className="inline-block h-0.5 w-4 rounded-full" style={{ backgroundColor: color }} />;
  }
  return (
    <span
      className="inline-block h-3 w-3 rounded-full border border-white shadow-sm"
      style={{ backgroundColor: color }}
    />
  );
}

export function MapLegend({ showGenerator = true }: { showGenerator?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md border border-border bg-card px-4 py-2.5 text-xs text-muted-foreground">
      {showGenerator && (
        <div className="flex items-center gap-1.5">
          <Swatch color={CHART_COLORS.primary} />
          Waste Generator
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <Swatch color={CHART_COLORS.accent} />
        Biochar Facility
      </div>
      <div className="flex items-center gap-1.5">
        <Swatch color={CHART_COLORS.secondary} />
        Biogas Facility
      </div>
      <div className="flex items-center gap-1.5">
        <Swatch color="#8a6d3b" />
        Biomass Conversion Facility
      </div>
      <div className="flex items-center gap-1.5">
        <Swatch color="#1d4ed8" shape="line" />
        Optimized Route
      </div>
    </div>
  );
}
