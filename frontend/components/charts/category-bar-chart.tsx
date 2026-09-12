"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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

  return (
    <ResponsiveContainer width="100%" height={Math.max(260, isHorizontal ? data.length * 40 : 260)}>
      <BarChart
        data={data}
        layout={isHorizontal ? "vertical" : "horizontal"}
        margin={{ top: 8, right: 16, bottom: 0, left: isHorizontal ? 8 : 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7e3" horizontal={!isHorizontal} vertical={isHorizontal} />
        {isHorizontal ? (
          <>
            <XAxis type="number" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey={xKey}
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
          contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e5e7e3", borderRadius: 8, fontSize: 13 }}
          formatter={(value: number) => [`${value.toLocaleString()}${valueSuffix}`, valueLabel]}
        />
        <Bar dataKey={yKey} radius={[4, 4, 4, 4]}>
          {data.map((_, index) => (
            <Cell key={index} fill={CATEGORY_PALETTE[index % CATEGORY_PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
