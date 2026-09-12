"use client";

import { Factory, Leaf, Package, Route as RouteIcon, Truck } from "lucide-react";

import { CategoryBarChart } from "@/components/charts/category-bar-chart";
import { MonthlyLineChart } from "@/components/charts/monthly-line-chart";
import { CHART_COLORS } from "@/components/charts/chart-colors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardData } from "@/hooks/use-dashboard-data";

const WASTE_TYPE_LABEL: Record<string, string> = {
  RICE_STRAW: "Rice Straw",
  WHEAT_STRAW: "Wheat Straw",
  COTTON_RESIDUE: "Cotton Residue",
  SUGARCANE_RESIDUE: "Sugarcane Residue",
  FOOD_WASTE: "Food Waste",
  ORGANIC_WASTE: "Organic Waste",
  ANIMAL_MANURE: "Animal Manure",
};

export default function DashboardPage() {
  const { summary, analytics, loading, error } = useDashboardData();

  if (error) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <Card>
          <CardContent className="p-6 text-sm text-destructive">Couldn&apos;t load dashboard data: {error}</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Live overview of waste availability, diversion, and carbon impact across the network.
        </p>
      </div>

      {/* KPI cards */}
      {loading || !summary ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[92px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard
            label="Total Waste Available"
            value={summary.total_waste_available_tonnes.toLocaleString()}
            unit="tonnes"
            icon={Package}
            tone="primary"
          />
          <KpiCard
            label="Waste Diverted"
            value={summary.waste_diverted_tonnes.toLocaleString()}
            unit="tonnes"
            icon={Truck}
            tone="secondary"
          />
          <KpiCard
            label="Active Facilities"
            value={summary.active_facilities.toString()}
            icon={Factory}
            tone="accent"
          />
          <KpiCard label="Active Routes" value={summary.active_routes.toString()} icon={RouteIcon} tone="secondary" />
          <KpiCard
            label="Estimated CO₂ Impact"
            value={summary.estimated_co2_impact_tonnes.toLocaleString()}
            unit="t CO₂e"
            icon={Leaf}
            tone="primary"
          />
        </div>
      )}

      {/* Charts */}
      {loading || !analytics ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[320px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Waste availability over time</CardTitle>
            </CardHeader>
            <CardContent>
              <MonthlyLineChart
                data={analytics.waste_availability_over_time}
                dataKey="quantity_tonnes"
                valueLabel="Available"
                color={CHART_COLORS.primary}
                emptyTitle="No availability data yet"
                emptyDescription="Waste records with AVAILABLE status will appear here month by month."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Waste diverted over time</CardTitle>
            </CardHeader>
            <CardContent>
              <MonthlyLineChart
                data={analytics.waste_diverted_over_time}
                dataKey="quantity_tonnes"
                valueLabel="Diverted"
                color={CHART_COLORS.secondary}
                emptyTitle="No diversion data yet"
                emptyDescription="Waste records marked COLLECTED or PROCESSED will appear here."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Waste by type</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryBarChart
                data={analytics.waste_by_type.map((d) => ({
                  ...d,
                  label: WASTE_TYPE_LABEL[d.waste_type] ?? d.waste_type,
                }))}
                xKey="label"
                yKey="quantity_tonnes"
                valueLabel="Quantity"
                valueSuffix=" t"
                layout="horizontal"
                emptyTitle="No waste records yet"
                emptyDescription="Once waste records exist, their totals by type will appear here."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Facility capacity utilization</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryBarChart
                data={analytics.facility_utilization}
                xKey="facility_name"
                yKey="utilization_percent"
                valueLabel="Utilization"
                valueSuffix="%"
                layout="horizontal"
                emptyTitle="No facilities yet"
                emptyDescription="Facility capacity and current load will appear here once facilities are registered."
              />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Carbon impact over time</CardTitle>
            </CardHeader>
            <CardContent>
              <MonthlyLineChart
                data={analytics.carbon_impact_over_time.map((d) => ({ ...d, quantity_tonnes: d.net_co2_impact_tonnes }))}
                dataKey="quantity_tonnes"
                valueLabel="Net CO₂e"
                color={CHART_COLORS.accent}
                emptyTitle="No carbon impact data yet"
                emptyDescription="Built in Phase 8 (Carbon) - this chart will populate once waste is matched, routed, and its carbon impact calculated."
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
