"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  Factory,
  Flame,
  Gauge,
  Leaf,
  MapPin,
  PlusCircle,
  Route as RouteIcon,
  Sparkles,
  TrendingUp,
  Truck,
  Zap,
} from "lucide-react";

import { CategoryBarChart } from "@/components/charts/category-bar-chart";
import { MonthlyLineChart } from "@/components/charts/monthly-line-chart";
import { CHART_COLORS } from "@/components/charts/chart-colors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import type {
  CarbonRecord,
  DashboardAnalytics,
  DashboardSummary,
  Facility,
  OptimizedRoute,
  WasteRecordWithGenerator,
} from "@/types";

const FACILITY_TYPE_LABEL: Record<string, string> = {
  BIOCHAR: "Biochar Production",
  BIOGAS: "Biogas Anaerobic Digestion",
  BIOMASS_CONVERSION: "Biomass Gasification & Power",
};

interface FacilityDashboardProps {
  summary: DashboardSummary;
  analytics: DashboardAnalytics;
  wasteRecords: WasteRecordWithGenerator[];
  facilities: Facility[];
  routes: OptimizedRoute[];
  carbonRecords: CarbonRecord[];
}

export function FacilityDashboard({
  summary,
  analytics,
  wasteRecords,
  facilities,
  routes,
  carbonRecords,
}: FacilityDashboardProps) {
  const totalCapacity = facilities.reduce((acc, f) => acc + (f.capacity_tonnes || 0), 0);
  const totalLoad = facilities.reduce((acc, f) => acc + (f.current_load_tonnes || 0), 0);
  const remainingIntake = Math.max(0, totalCapacity - totalLoad);
  const activeRoutesCount = routes.filter((r) => r.status === "PLANNED" || r.status === "IN_PROGRESS").length;
  const overallUtilization = totalCapacity > 0 ? Math.round((totalLoad / totalCapacity) * 100) : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="default" className="bg-emerald-600 text-white font-normal text-xs">Operational</Badge>;
      case "MAINTENANCE":
        return <Badge variant="default" className="bg-amber-500 text-white font-normal text-xs">Maintenance</Badge>;
      case "INACTIVE":
        return <Badge variant="outline" className="text-muted-foreground text-xs">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Operator Banner */}
      <div className="flex flex-col gap-4 rounded-xl border border-blue-500/20 bg-gradient-to-r from-blue-50/60 via-background to-cyan-50/40 p-5 dark:from-blue-950/30 dark:to-cyan-950/20 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
              <Factory className="h-3.5 w-3.5" />
            </span>
            <Badge variant="default" className="bg-blue-600 text-white font-medium text-xs">
              Facility Operator Operations Hub
            </Badge>
            <span className="text-xs text-muted-foreground">• Biochar, Biogas & Conversion Plants</span>
          </div>
          <h2 className="text-lg font-bold text-foreground">Manage Processing Capacity, Intake & Carbon Sequestration</h2>
          <p className="text-xs text-muted-foreground md:text-sm">
            Monitor feedstock inventory, optimize collection routes from surrounding farms, and certify net sequestered CO₂e.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/routes">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <RouteIcon className="h-3.5 w-3.5 text-blue-600" />
              Dispatch Routes
            </Button>
          </Link>
          <Link href="/facilities">
            <Button size="sm" className="gap-1.5 text-xs bg-blue-600 text-white hover:bg-blue-700">
              <PlusCircle className="h-3.5 w-3.5" />
              Manage Plants
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label="Total Plant Capacity"
          value={totalCapacity.toLocaleString()}
          unit="tonnes"
          icon={Factory}
          tone="primary"
        />
        <KpiCard
          label="Current Feedstock Load"
          value={totalLoad.toLocaleString()}
          unit={`tonnes (${overallUtilization}%)`}
          icon={Gauge}
          tone="accent"
        />
        <KpiCard
          label="Remaining Intake Space"
          value={remainingIntake.toLocaleString()}
          unit="tonnes open"
          icon={Zap}
          tone="secondary"
        />
        <KpiCard
          label="Active Inbound Routes"
          value={(activeRoutesCount || summary.active_routes).toString()}
          unit="dispatches"
          icon={Truck}
          tone="secondary"
        />
        <KpiCard
          label="Net CO₂ Sequestered"
          value={summary.estimated_co2_impact_tonnes.toLocaleString()}
          unit="t CO₂e"
          icon={Leaf}
          tone="primary"
        />
      </div>

      {/* Operations Quick Action Hub */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link href="/routes" className="group block">
          <Card className="h-full border border-border/80 transition-all duration-150 hover:border-blue-500 hover:shadow-sm">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  <RouteIcon className="h-4 w-4" />
                </div>
                <Badge variant="outline" className="text-xs">OR-Tools Solver</Badge>
              </div>
              <h3 className="font-semibold text-foreground group-hover:text-blue-600">Route & Logistics Optimization</h3>
              <p className="text-xs text-muted-foreground">
                Generate multi-stop vehicle pickup routes constrained by truck payload and plant feedstock capacity.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/carbon" className="group block">
          <Card className="h-full border border-border/80 transition-all duration-150 hover:border-blue-500 hover:shadow-sm">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                  <Leaf className="h-4 w-4" />
                </div>
                <Badge variant="outline" className="text-xs">ISO / IPCC Model</Badge>
              </div>
              <h3 className="font-semibold text-foreground group-hover:text-blue-600">Carbon Sequestration Accounting</h3>
              <p className="text-xs text-muted-foreground">
                Calculate verifiable carbon credits for Biochar (pyrolysis) and Biogas based on feedstocks converted.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/map" className="group block">
          <Card className="h-full border border-border/80 transition-all duration-150 hover:border-blue-500 hover:shadow-sm">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  <MapPin className="h-4 w-4" />
                </div>
                <Badge variant="outline" className="text-xs">Catchment Map</Badge>
              </div>
              <h3 className="font-semibold text-foreground group-hover:text-blue-600">Biomass Sourcing Catchment</h3>
              <p className="text-xs text-muted-foreground">
                Visualize nearby farms and food processors with compatible organic waste ready for plant intake.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Facility Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Conversion Plants Utilization</CardTitle>
            <CardDescription>Operating capacity load per facility location</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryBarChart
              data={analytics.facility_utilization}
              xKey="facility_name"
              yKey="utilization_percent"
              valueLabel="Utilization"
              valueSuffix="%"
              layout="horizontal"
              emptyTitle="No facilities registered"
              emptyDescription="Register processing plants to see capacity utilization."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Net CO₂ Sequestration Trajectory</CardTitle>
            <CardDescription>Monthly verified carbon offset generated across facilities</CardDescription>
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
              emptyTitle="No carbon conversion data yet"
              emptyDescription="Conversions calculated in the Carbon module will appear here."
            />
          </CardContent>
        </Card>
      </div>

      {/* Managed Facilities Table & Progress */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Conversion Facilities & Real-time Intake Load</CardTitle>
            <CardDescription>Current feedstock inventory vs. rated maximum capacity</CardDescription>
          </div>
          <Link href="/facilities">
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              Manage All <ArrowUpRight className="h-3 w-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {facilities.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No facilities registered yet. Click &quot;Manage Plants&quot; to register your first conversion facility.
            </div>
          ) : (
            <div className="space-y-4">
              {facilities.map((fac) => {
                const util = fac.utilization_percent ?? Math.round((fac.current_load_tonnes / fac.capacity_tonnes) * 100);
                const isHigh = util > 85;
                const isMedium = util > 50;

                return (
                  <div
                    key={fac.id}
                    className="flex flex-col gap-3 rounded-lg border border-border p-4 transition-all hover:bg-muted/20 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="space-y-1.5 md:w-1/3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{fac.name}</span>
                        {getStatusBadge(fac.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {FACILITY_TYPE_LABEL[fac.facility_type] ?? fac.facility_type} • {fac.address}
                      </p>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {fac.accepted_waste_types?.slice(0, 3).map((wt) => (
                          <Badge key={wt} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {wt.replace(/_/g, " ")}
                          </Badge>
                        ))}
                        {(fac.accepted_waste_types?.length || 0) > 3 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{fac.accepted_waste_types.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5 md:w-1/3">
                      <div className="flex justify-between text-xs font-medium">
                        <span>Load: {fac.current_load_tonnes} / {fac.capacity_tonnes} t</span>
                        <span className={isHigh ? "text-rose-600 font-bold" : isMedium ? "text-amber-600" : "text-emerald-600"}>
                          {util}% Utilized
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isHigh ? "bg-rose-500" : isMedium ? "bg-amber-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, util))}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {Math.max(0, fac.capacity_tonnes - fac.current_load_tonnes)} t remaining intake headroom
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-2 md:w-1/4">
                      <Link href={`/routes`}>
                        <Button size="sm" variant="outline" className="h-8 gap-1 text-xs">
                          <RouteIcon className="h-3 w-3" />
                          Plan Route
                        </Button>
                      </Link>
                      <Link href={`/carbon`}>
                        <Button size="sm" className="h-8 gap-1 text-xs bg-blue-600 text-white hover:bg-blue-700">
                          <Leaf className="h-3 w-3" />
                          Carbon
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
