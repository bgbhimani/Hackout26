"use client";

import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Leaf,
  MapPin,
  Package,
  PlusCircle,
  Sparkles,
  Sprout,
  TrendingUp,
  Truck,
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
  Generator,
  OptimizedRoute,
  User,
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

interface GeneratorDashboardProps {
  currentUser?: User | null;
  generators?: Generator[];
  summary: DashboardSummary;
  analytics: DashboardAnalytics;
  wasteRecords: WasteRecordWithGenerator[];
  facilities: Facility[];
  routes: OptimizedRoute[];
  carbonRecords: CarbonRecord[];
}

export function GeneratorDashboard({
  currentUser,
  generators = [],
  summary,
  analytics,
  wasteRecords,
  facilities,
  routes,
  carbonRecords,
}: GeneratorDashboardProps) {
  // Find generator entity linked to current user
  const linkedGenerator = generators.find(
    (g) =>
      (currentUser?.email && g.email?.toLowerCase() === currentUser.email.toLowerCase()) ||
      (currentUser?.name && g.contact_name?.toLowerCase().includes(currentUser.name.toLowerCase()))
  );

  // Filter waste records for this specific generator if linked
  const userWasteRecords = linkedGenerator
    ? wasteRecords.filter((r) => r.generator_id === linkedGenerator.id)
    : currentUser?.email === "generator1@example.com"
    ? wasteRecords.filter((r) => r.generator_name?.toLowerCase().includes("dairy") || r.generator_name?.toLowerCase().includes("zakariyapura"))
    : currentUser?.email === "generator2@example.com"
    ? wasteRecords.filter((r) => r.generator_name?.toLowerCase().includes("charotar") || r.generator_name?.toLowerCase().includes("paddy"))
    : wasteRecords;

  // Compute generator specific metrics
  const availableRecords = userWasteRecords.filter((r) => r.status === "AVAILABLE");
  const pendingRecords = userWasteRecords.filter((r) => r.status === "PENDING");
  const divertedRecords = userWasteRecords.filter((r) => r.status === "COLLECTED" || r.status === "PROCESSED");

  const totalAvailableTonnes = availableRecords.reduce((acc, r) => acc + (r.quantity_tonnes || 0), 0);
  const totalDivertedTonnes = divertedRecords.reduce((acc, r) => acc + (r.quantity_tonnes || 0), 0);
  const totalTrackedTonnes = userWasteRecords.reduce((acc, r) => acc + (r.quantity_tonnes || 0), 0);

  // Calculate carbon offset specific to this generator's waste records
  const userWasteIds = new Set(userWasteRecords.map((r) => r.id));
  const userCarbonRecords = carbonRecords.filter((c) => userWasteIds.has(c.waste_record_id));
  const userCarbonImpact = userCarbonRecords.reduce((acc, c) => acc + (c.net_co2_impact_tonnes || 0), 0);

  // Group by waste type for this generator
  const typeMap: Record<string, number> = {};
  for (const r of userWasteRecords) {
    typeMap[r.waste_type] = (typeMap[r.waste_type] || 0) + r.quantity_tonnes;
  }
  const generatorWasteByType = Object.entries(typeMap).map(([type, qty]) => ({
    waste_type: type,
    label: WASTE_TYPE_LABEL[type] ?? type,
    quantity_tonnes: Number(qty.toFixed(1)),
  }));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return <Badge variant="default" className="bg-emerald-600 text-white font-normal text-xs">Available for Pickup</Badge>;
      case "PENDING":
        return <Badge variant="default" className="bg-amber-500 text-white font-normal text-xs">Pending Match</Badge>;
      case "COLLECTED":
        return <Badge variant="default" className="bg-blue-600 text-white font-normal text-xs">Collected & In-Transit</Badge>;
      case "PROCESSED":
        return <Badge variant="default" className="bg-purple-600 text-white font-normal text-xs">Converted to Carbon</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Role Banner */}
      <div className="flex flex-col gap-4 rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-50/60 via-background to-teal-50/40 p-5 dark:from-emerald-950/30 dark:to-teal-950/20 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white">
              <Sprout className="h-3.5 w-3.5" />
            </span>
            <Badge variant="default" className="bg-emerald-600 text-white font-medium text-xs">
              Waste Generator Portal
            </Badge>
            <span className="text-xs text-muted-foreground">• Farms, Food Processing & Municipalities</span>
          </div>
          <h2 className="text-lg font-bold text-foreground">Turn Agricultural & Organic Residue into Carbon Credits</h2>
          <p className="text-xs text-muted-foreground md:text-sm">
            Log your waste batches, forecast seasonal harvest yields with AI, and match with nearby biochar/biogas conversion plants.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/forecast">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              AI Harvest Forecast
            </Button>
          </Link>
          <Link href="/waste">
            <Button size="sm" className="gap-1.5 text-xs bg-emerald-600 text-white hover:bg-emerald-700">
              <PlusCircle className="h-3.5 w-3.5" />
              Log Waste Batch
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label="Available Feedstock"
          value={totalAvailableTonnes.toLocaleString()}
          unit="tonnes"
          icon={Package}
          tone="primary"
        />
        <KpiCard
          label="Diverted & Converted"
          value={totalDivertedTonnes.toLocaleString()}
          unit="tonnes"
          icon={Truck}
          tone="secondary"
        />
        <KpiCard
          label="My Waste Batches"
          value={userWasteRecords.length.toString()}
          unit="batches"
          icon={Sprout}
          tone="accent"
        />
        <KpiCard
          label="Conversion Facilities"
          value={facilities.length.toString()}
          unit="ready"
          icon={Sparkles}
          tone="secondary"
        />
        <KpiCard
          label="Carbon Offset Value"
          value={userCarbonImpact > 0 ? userCarbonImpact.toLocaleString() : (summary.estimated_co2_impact_tonnes).toLocaleString()}
          unit="t CO₂e"
          icon={Leaf}
          tone="primary"
        />
      </div>

      {/* Action Workflow Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link href="/forecast" className="group block">
          <Card className="h-full border border-border/80 transition-all duration-150 hover:border-emerald-500 hover:shadow-sm">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <Badge variant="outline" className="text-xs">Machine Learning</Badge>
              </div>
              <h3 className="font-semibold text-foreground group-hover:text-emerald-600">AI Residue Forecasting</h3>
              <p className="text-xs text-muted-foreground">
                Predict upcoming agricultural residue based on crop acreage, harvest seasons, and historical yield patterns.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/matching" className="group block">
          <Card className="h-full border border-border/80 transition-all duration-150 hover:border-emerald-500 hover:shadow-sm">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                  <Sparkles className="h-4 w-4" />
                </div>
                <Badge variant="outline" className="text-xs">Smart Match</Badge>
              </div>
              <h3 className="font-semibold text-foreground group-hover:text-emerald-600">Smart Facility Matching</h3>
              <p className="text-xs text-muted-foreground">
                Find optimal biochar and biogas plants within economic transport radius to sell your organic biomass.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/map" className="group block">
          <Card className="h-full border border-border/80 transition-all duration-150 hover:border-emerald-500 hover:shadow-sm">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  <MapPin className="h-4 w-4" />
                </div>
                <Badge variant="outline" className="text-xs">Spatial GIS</Badge>
              </div>
              <h3 className="font-semibold text-foreground group-hover:text-emerald-600">Network Logistics Map</h3>
              <p className="text-xs text-muted-foreground">
                Explore nearby conversion facilities, active pickup vehicles, and verify delivery locations in real time.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Generator Analytics Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My Biomass Feedstock Types</CardTitle>
            <CardDescription>Residue quantities across crop varieties & organic waste</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryBarChart
              data={generatorWasteByType.length > 0 ? generatorWasteByType : analytics.waste_by_type.map(d => ({ ...d, label: WASTE_TYPE_LABEL[d.waste_type] ?? d.waste_type }))}
              xKey="label"
              yKey="quantity_tonnes"
              valueLabel="Quantity"
              valueSuffix=" t"
              layout="horizontal"
              emptyTitle="No waste batches recorded"
              emptyDescription="Add waste batches to track crop residue totals."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Waste Diverted vs Landfill Avoidance</CardTitle>
            <CardDescription>Monthly volume routed into circular carbon conversion</CardDescription>
          </CardHeader>
          <CardContent>
            <MonthlyLineChart
              data={analytics.waste_diverted_over_time}
              dataKey="quantity_tonnes"
              valueLabel="Diverted"
              color={CHART_COLORS.primary}
              emptyTitle="No diversion history yet"
              emptyDescription="Batches collected by facilities will appear here."
            />
          </CardContent>
        </Card>
      </div>

      {/* Recent Waste Batches / Status Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>My Waste Batches & Dispatch Status</CardTitle>
            <CardDescription>Track listings, pickup status, and trigger conversion matches</CardDescription>
          </div>
          <Link href="/waste">
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              View All <ExternalLink className="h-3 w-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {userWasteRecords.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No waste records logged for your generator account yet. Click &quot;Log Waste Batch&quot; to add your first batch.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="pb-3 font-medium">Batch / Generator</th>
                    <th className="pb-3 font-medium">Waste Type</th>
                    <th className="pb-3 font-medium">Quantity</th>
                    <th className="pb-3 font-medium">Available Date</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {userWasteRecords.slice(0, 5).map((record) => (
                    <tr key={record.id} className="hover:bg-muted/40">
                      <td className="py-3 font-medium text-foreground">
                        {record.generator_name}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {WASTE_TYPE_LABEL[record.waste_type] ?? record.waste_type}
                      </td>
                      <td className="py-3 font-semibold text-foreground">
                        {record.quantity_tonnes} t
                      </td>
                      <td className="py-3 text-xs text-muted-foreground">
                        {record.available_from ? new Date(record.available_from).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-3">
                        {getStatusBadge(record.status)}
                      </td>
                      <td className="py-3 text-right">
                        <Link href={`/matching?generator=${record.generator_id}`}>
                          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs text-emerald-700 hover:text-emerald-800">
                            <Sparkles className="h-3 w-3" />
                            Match
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
