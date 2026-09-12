"use client";

import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import type { DashboardAnalytics, DashboardSummary } from "@/types";

interface State {
  summary: DashboardSummary | null;
  analytics: DashboardAnalytics | null;
  loading: boolean;
  error: string | null;
}

export function useDashboardData() {
  const [state, setState] = useState<State>({ summary: null, analytics: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [summary, analytics] = await Promise.all([
          apiFetch<DashboardSummary>("/api/dashboard/summary"),
          apiFetch<DashboardAnalytics>("/api/dashboard/analytics"),
        ]);
        if (!cancelled) setState({ summary, analytics, loading: false, error: null });
      } catch (err) {
        if (!cancelled) {
          setState({
            summary: null,
            analytics: null,
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
