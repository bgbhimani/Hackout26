"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AXIS_TICK_STYLE, CATEGORY_PALETTE } from "@/components/charts/chart-colors";
import { EmptyState } from "@/components/ui/empty-state";
import { BarChart3 } from "lucide-react";

export function CategoryBarChart<T extends object>({
  data,
  xKey,
  yKey,
  valueLabel,
  valueSuffix = "",
  emptyTitle,
  emptyDescription,
  layout = "vertical",
}: {
  data: T[];
  xKey: keyof T & string;
  yKey: keyof T & string;
  valueLabel: string;
  valueSuffix?: string;
  emptyTitle: string;
  emptyDescription: string;
  /** "vertical" = category on the x-axis (bars stand up); "horizontal" = category on the y-axis (bars lie flat) */
  layout?: "vertical" | "horizontal";
}) {
  if (data.length === 0) {
    return <EmptyState icon={BarChart3} title={emptyTitle} description={emptyDescription} />;
  }

  const isHorizontal = layout === "horizontal";
  // Size the plot to the number of categories rather than always filling a
  // fixed 260px - a single bar in a 260px-tall band reads as "broken", not
  // "one category". Each row gets a fixed height and the chart grows with it.
  const height = isHorizontal ? Math.max(120, data.length * 44 + 40) : 260;
  // Recharts can briefly report a fractional/undefined value while a bar's
  // grow-in animation is still resolving its geometry, which LabelList (see
  // below) then tries to lay out as a real SVG width and warns
  // ("Received NaN for the `width` attribute"). Guarding the formatter costs
  // nothing and keeps that transient frame from ever rendering "NaN".
  const labelFormatter = (value: number) => (Number.isFinite(value) ? `${value.toLocaleString()}${valueSuffix}` : "");

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={isHorizontal ? "vertical" : "horizontal"}
        margin={{ top: 8, right: isHorizontal ? 48 : 16, bottom: 0, left: isHorizontal ? 8 : 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7e3" horizontal={!isHorizontal} vertical={isHorizontal} />
        {isHorizontal ? (
          <>
            <XAxis type="number" domain={[0, "auto"]} tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey={xKey}
              // Force the exact category values as ticks - with very few
              // rows, Recharts' auto tick generation for a near-empty
              // category axis can fall back to bogus numeric ticks instead
              // of the category labels.
              ticks={data.map((d) => d[xKey] as unknown as string)}
              interval={0}
              tick={AXIS_TICK_STYLE}
              axisLine={false}
              tickLine={false}
              width={160}
            />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} tick={AXIS_TICK_STYLE} axisLine={{ stroke: "#e5e7e3" }} tickLine={false} />
            <YAxis tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} width={48} />
          </>
        )}
        <Tooltip
          cursor={{ fill: "#f1f1ec" }}
          contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e5e7e3", borderRadius: 8, fontSize: 13 }}
          formatter={(value: number) => [`${value.toLocaleString()}${valueSuffix}`, valueLabel]}
        />
        <Bar
          dataKey={yKey}
          radius={isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
          barSize={isHorizontal ? 24 : undefined}
          maxBarSize={isHorizontal ? undefined : 56}
          // The grow-in animation's intermediate frames are what trigger
          // LabelList's "Received NaN for the `width` attribute" warning
          // (its label position is derived from the bar's still-animating
          // geometry) - a static bar has nothing to animate from anyway.
          isAnimationActive={false}
        >
          {data.map((_, index) => (
            <Cell key={index} fill={CATEGORY_PALETTE[index % CATEGORY_PALETTE.length]} />
          ))}
          <LabelList
            dataKey={yKey}
            position={isHorizontal ? "right" : "top"}
            formatter={labelFormatter}
            style={{ fontSize: 12, fill: "#6b756d" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
