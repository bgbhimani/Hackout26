"use client";

import Link from "next/link";
import {
  Factory,
  Leaf,
  MapPin,
  Package,
  Route as RouteIcon,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Truck,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

import { CategoryBarChart } from "@/components/charts/category-bar-chart";
import { MonthlyLineChart } from "@/components/charts/monthly-line-chart";
import { CHART_COLORS } from "@/components/charts/chart-colors";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  CarbonRecord,
  DashboardAnalytics,
  DashboardSummary,
  Facility,
  OptimizedRoute,
  WasteRecordWithGenerator,
} from "@/types";

const WASTE_TYPE_LABEL: Record<string, string> = {
  RICE_STRAW: "Rice Straw",
  WHEAT_STRAW: "Wheat Straw",
  COTTON_RESIDUE: "Cotton Residue",
  SUGARCANE_RESIDUE: "Sugarcane Residue",
  FOOD_WASTE: "Food Waste",
  ORGANIC_WASTE: "Organic Waste",
  ANIMAL_MANURE: "Animal Manure",
};

interface AdminDashboardProps {
  summary: DashboardSummary;
  analytics: DashboardAnalytics;
  wasteRecords: WasteRecordWithGenerator[];
  facilities: Facility[];
  routes: OptimizedRoute[];
  carbonRecords: CarbonRecord[];
}

export function AdminDashboard({
  summary,
  analytics,
  wasteRecords,
  facilities,
  routes,
  carbonRecords,
}: AdminDashboardProps) {
  const activeFacilitiesCount = facilities.filter((f) => f.status === "ACTIVE").length;
  const avgUtilization =
    facilities.length > 0
      ? Math.round(
          facilities.reduce((acc, f) => acc + (f.utilization_percent || 0), 0) / facilities.length
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 rounded-xl border border-primary/20 bg-gradient-to-r from-primary-light/50 via-background to-secondary/30 p-5 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
            <Badge variant="default" className="bg-primary text-primary-foreground font-medium text-xs">
              System Admin
            </Badge>
            <span className="text-xs text-muted-foreground">• Full Network Oversight</span>
          </div>
          <h2 className="text-lg font-bold text-foreground">Circular Carbon Ecosystem Overview</h2>
          <p className="text-xs text-muted-foreground md:text-sm">
            Real-time platform metrics across {facilities.length} conversion facilities, {wasteRecords.length} registered waste batches, and active transport routes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/map">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              Live Map
            </Button>
          </Link>
          <Link href="/matching">
            <Button size="sm" className="gap-1.5 text-xs bg-primary text-primary-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Smart Matching
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
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
          value={`${activeFacilitiesCount} (${avgUtilization}% avg util)`}
          icon={Factory}
          tone="accent"
        />
        <KpiCard
          label="Active Routes"
          value={summary.active_routes.toString()}
          icon={RouteIcon}
          tone="secondary"
        />
        <KpiCard
          label="Estimated CO₂ Impact"
          value={summary.estimated_co2_impact_tonnes.toLocaleString()}
          unit="t CO₂e"
          icon={Leaf}
          tone="primary"
        />
      </div>

      {/* Quick Action Hub for Admin */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/waste" className="group block">
          <Card className="h-full border border-border/80 transition-all duration-150 hover:border-primary hover:shadow-sm">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary">Waste Directory</p>
                  <p className="text-xs text-muted-foreground">{wasteRecords.length} batches registered</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/facilities" className="group block">
          <Card className="h-full border border-border/80 transition-all duration-150 hover:border-primary hover:shadow-sm">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                  <Factory className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary">Facilities Manager</p>
                  <p className="text-xs text-muted-foreground">{facilities.length} conversion plants</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/routes" className="group block">
          <Card className="h-full border border-border/80 transition-all duration-150 hover:border-primary hover:shadow-sm">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                  <RouteIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary">Routing & Logistics</p>
                  <p className="text-xs text-muted-foreground">{routes.length} vehicle paths</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/carbon" className="group block">
          <Card className="h-full border border-border/80 transition-all duration-150 hover:border-primary hover:shadow-sm">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400">
                  <Leaf className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary">Carbon Accounting</p>
                  <p className="text-xs text-muted-foreground">{carbonRecords.length} certified audits</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Network Waste Availability</CardTitle>
            <CardDescription>Available agricultural & industrial feedstock over time</CardDescription>
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
            <CardTitle>Network Waste Diverted from Landfills</CardTitle>
            <CardDescription>Collected and processed tonnes channeled into carbon conversion</CardDescription>
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
            <CardTitle>Waste Feedstock Distribution</CardTitle>
            <CardDescription>Breakdown by residue and organic waste types across all generators</CardDescription>
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
            <CardTitle>Facility Capacity & Utilization</CardTitle>
            <CardDescription>Current load versus rated processing capacity across all registered plants</CardDescription>
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
            <CardTitle>Network Net Carbon Sequestration</CardTitle>
            <CardDescription>Net metric tons of CO₂ equivalent sequestered minus transport emissions</CardDescription>
          </CardHeader>
          <CardContent>
            <MonthlyLineChart
              data={analytics.carbon_impact_over_time.map((d) => ({
                ...d,
                quantity_tonnes: d.net_co2_impact_tonnes,
              }))}
              dataKey="quantity_tonnes"
              valueLabel="Net CO₂e"
              color={CHART_COLORS.accent}
              emptyTitle="No carbon impact data yet"
              emptyDescription="Populates once waste records are matched, routed, and carbon impact is verified."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
