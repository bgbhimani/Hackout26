"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AXIS_TICK_STYLE, CHART_COLORS } from "@/components/charts/chart-colors";
import { EmptyState } from "@/components/ui/empty-state";
import { LineChart as LineChartIcon } from "lucide-react";

interface ChartPoint {
  month: string;
  actual?: number;
  predicted?: number;
}

/** Historical (solid, primary green) vs. forecast (dashed, amber) - the two
 * series share one connecting point (the last actual month also carries a
 * "predicted" value equal to itself) purely so the dashed line visually
 * continues from the solid one; it is not a data misrepresentation, the
 * legend and dot styling make the distinction unambiguous. */
export function ForecastChart({ points }: { points: ChartPoint[] }) {
  if (points.length === 0) {
    return (
      <EmptyState
        icon={LineChartIcon}
        title="No historical data"
        description="This generator/waste type combination has no recorded history yet."
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={points} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7e3" vertical={false} />
        <XAxis dataKey="month" tick={AXIS_TICK_STYLE} axisLine={{ stroke: "#e5e7e3" }} tickLine={false} />
        <YAxis tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} width={48} />
        <Tooltip
          contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e5e7e3", borderRadius: 8, fontSize: 13 }}
          formatter={(value: number) => `${value.toLocaleString()} t`}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="actual"
          name="Historical (actual)"
          stroke={CHART_COLORS.primary}
          strokeWidth={2.5}
          dot={{ r: 3 }}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="predicted"
          name="Forecast (predicted)"
          stroke={CHART_COLORS.accent}
          strokeWidth={2.5}
          strokeDasharray="6 4"
          dot={{ r: 4 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
