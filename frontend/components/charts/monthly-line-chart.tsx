"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { EmptyState } from "@/components/ui/empty-state";
import { AXIS_TICK_STYLE, CHART_COLORS } from "@/components/charts/chart-colors";
import { LineChart as LineChartIcon } from "lucide-react";

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
  if (data.length === 0) {
    return <EmptyState icon={LineChartIcon} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7e3" vertical={false} />
        <XAxis dataKey="month" tick={AXIS_TICK_STYLE} axisLine={{ stroke: "#e5e7e3" }} tickLine={false} />
        <YAxis tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} width={48} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7e3",
            borderRadius: 8,
            fontSize: 13,
          }}
          formatter={(value: number) => [`${value.toLocaleString()} t`, valueLabel]}
        />
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
