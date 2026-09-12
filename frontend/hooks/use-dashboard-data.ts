"use client";

import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import type {
  CarbonRecord,
  DashboardAnalytics,
  DashboardSummary,
  Facility,
  Generator,
  OptimizedRoute,
  WasteRecordWithGenerator,
} from "@/types";

interface State {
  summary: DashboardSummary | null;
  analytics: DashboardAnalytics | null;
  generators: Generator[];
  wasteRecords: WasteRecordWithGenerator[];
  facilities: Facility[];
  routes: OptimizedRoute[];
  carbonRecords: CarbonRecord[];
  loading: boolean;
  error: string | null;
}

export function useDashboardData() {
  const [state, setState] = useState<State>({
    summary: null,
    analytics: null,
    generators: [],
    wasteRecords: [],
    facilities: [],
    routes: [],
    carbonRecords: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [summary, analytics, generators, wasteRecords, facilities, routes, carbonRecords] = await Promise.all([
          apiFetch<DashboardSummary>("/api/dashboard/summary"),
          apiFetch<DashboardAnalytics>("/api/dashboard/analytics"),
          apiFetch<Generator[]>("/api/generators").catch(() => []),
          apiFetch<WasteRecordWithGenerator[]>("/api/waste").catch(() => []),
          apiFetch<Facility[]>("/api/facilities").catch(() => []),
          apiFetch<OptimizedRoute[]>("/api/routes").catch(() => []),
          apiFetch<CarbonRecord[]>("/api/carbon").catch(() => []),
        ]);

        if (!cancelled) {
          setState({
            summary,
            analytics,
            generators: Array.isArray(generators) ? generators : [],
            wasteRecords: Array.isArray(wasteRecords) ? wasteRecords : [],
            facilities: Array.isArray(facilities) ? facilities : [],
            routes: Array.isArray(routes) ? routes : [],
            carbonRecords: Array.isArray(carbonRecords) ? carbonRecords : [],
            loading: false,
            error: null,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            summary: null,
            analytics: null,
            generators: [],
            wasteRecords: [],
            facilities: [],
            routes: [],
            carbonRecords: [],
            loading: false,
            error: err instanceof Error ? err.message : "Failed to load dashboard data",
          });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

