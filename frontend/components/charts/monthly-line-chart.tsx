"use client";

import { useId } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { EmptyState } from "@/components/ui/empty-state";
import { AXIS_TICK_STYLE, CHART_COLORS } from "@/components/charts/chart-colors";
import { LineChart as LineChartIcon } from "lucide-react";

/** "2026-09" -> "Sep 2026" */
function formatMonth(month: string) {
  const [year, m] = month.split("-");
  if (!year || !m) return month;
  const date = new Date(Number(year), Number(m) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function MonthlyLineChart<T extends { month: string }>({
  data,
  dataKey,
  valueLabel,
  color = CHART_COLORS.primary,
  emptyTitle,
  emptyDescription,
}: {
  data: T[];
  dataKey: keyof T & string;
  valueLabel: string;
  color?: string;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const gradientId = `area-fill-${useId().replace(/:/g, "")}`;

  if (data.length === 0) {
    return <EmptyState icon={LineChartIcon} title={emptyTitle} description={emptyDescription} />;
  }

  // A single month has no line to draw - a lone dot floating in an empty
  // plot reads as broken, not "one data point". Surface it as a callout
  // instead of stretching a chart across a trend that doesn't exist yet.
  if (data.length === 1) {
    const only = data[0]!;
    const value = only[dataKey] as number;
    return (
      <div className="flex h-[260px] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/40 text-center">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        <p className="text-2xl font-semibold text-foreground">
          {value.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">t</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {valueLabel} in {formatMonth(only.month)} - a trend line appears once a second month has data.
        </p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.32} />
            <stop offset="95%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7e3" vertical={false} />
        <XAxis
          dataKey="month"
          tickFormatter={formatMonth}
          tick={AXIS_TICK_STYLE}
          axisLine={{ stroke: "#e5e7e3" }}
          tickLine={false}
        />
        <YAxis tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} width={48} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7e3",
            borderRadius: 8,
            fontSize: 13,
          }}
          labelFormatter={(label: string) => formatMonth(label)}
          formatter={(value: number) => [`${value.toLocaleString()} t`, valueLabel]}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#${gradientId})`}
          dot={{ r: 3.5, strokeWidth: 2, stroke: color, fill: "#ffffff" }}
          activeDot={{ r: 5.5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
