"use client";

import { Factory, ShieldCheck, Sprout } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { GeneratorDashboard } from "@/components/dashboard/generator-dashboard";
import { FacilityDashboard } from "@/components/dashboard/facility-dashboard";

export default function DashboardPage() {
  const { user } = useAuth();
  const { summary, analytics, generators, wasteRecords, facilities, routes, carbonRecords, loading, error } =
    useDashboardData();

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6 text-sm text-destructive">
            Couldn&apos;t load dashboard data: {error}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determine role-specific header details
  const role = user?.role || "ADMIN";

  const getRoleHeader = () => {
    switch (role) {
      case "WASTE_GENERATOR":
        return {
          title: "Waste Generator Dashboard",
          description: "Waste batch logging, AI residue yield forecasting, and smart facility matching.",
          badge: (
            <Badge className="bg-emerald-600 text-white font-medium text-xs gap-1">
              <Sprout className="h-3 w-3" />
              Waste Generator
            </Badge>
          ),
        };
      case "FACILITY_OPERATOR":
        return {
          title: "Facility Operations Dashboard",
          description: "Conversion plant capacity, feedstock intake, and route logistics dispatch.",
          badge: (
            <Badge className="bg-blue-600 text-white font-medium text-xs gap-1">
              <Factory className="h-3 w-3" />
              Facility Operator
            </Badge>
          ),
        };
      case "ADMIN":
      default:
        return {
          title: "System Admin Dashboard",
          description: "Platform-wide circular carbon metrics and network administration.",
          badge: (
            <Badge className="bg-primary text-primary-foreground font-medium text-xs gap-1">
              <ShieldCheck className="h-3 w-3" />
              System Admin
            </Badge>
          ),
        };
    }
  };

  const roleHeader = getRoleHeader();

  return (
    <div className="space-y-6">
      {/* Top Header strictly tailored to user's role */}
      <div className="flex flex-col gap-2 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{roleHeader.title}</h1>
            {roleHeader.badge}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {roleHeader.description}
          </p>
        </div>

        {user && (
          <div className="text-xs text-muted-foreground">
            Logged in as <strong className="text-foreground">{user.name}</strong> ({user.email})
          </div>
        )}
      </div>

      {/* Loading Skeletons */}
      {loading || !summary || !analytics ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[96px] rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[320px] rounded-xl" />
            ))}
          </div>
        </div>
      ) : (
        /* Render exclusively the user's role dashboard */
        <>
          {role === "ADMIN" && (
            <AdminDashboard
              summary={summary}
              analytics={analytics}
              wasteRecords={wasteRecords}
              facilities={facilities}
              routes={routes}
              carbonRecords={carbonRecords}
            />
          )}

          {role === "WASTE_GENERATOR" && (
            <GeneratorDashboard
              currentUser={user}
              generators={generators}
              summary={summary}
              analytics={analytics}
              wasteRecords={wasteRecords}
              facilities={facilities}
              routes={routes}
              carbonRecords={carbonRecords}
            />
          )}

          {role === "FACILITY_OPERATOR" && (
            <FacilityDashboard
              currentUser={user}
              summary={summary}
              analytics={analytics}
              wasteRecords={wasteRecords}
              facilities={facilities}
              routes={routes}
              carbonRecords={carbonRecords}
            />
          )}
        </>
      )}
    </div>
  );
}
