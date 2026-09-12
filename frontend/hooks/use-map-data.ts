"use client";

import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import type { Facility, Generator, OptimizedRoute, WasteRecordWithGenerator } from "@/types";

interface State {
  generators: Generator[];
  facilities: Facility[];
  wasteRecords: WasteRecordWithGenerator[];
  routes: OptimizedRoute[];
  loading: boolean;
  error: string | null;
}

export function useMapData() {
  const [state, setState] = useState<State>({
    generators: [],
    facilities: [],
    wasteRecords: [],
    routes: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [generators, facilities, wasteRecords, routes] = await Promise.all([
          apiFetch<Generator[]>("/api/generators"),
          apiFetch<Facility[]>("/api/facilities"),
          apiFetch<WasteRecordWithGenerator[]>("/api/waste"),
          apiFetch<OptimizedRoute[]>("/api/routes"),
        ]);
        if (!cancelled) setState({ generators, facilities, wasteRecords, routes, loading: false, error: null });
      } catch (err) {
        if (!cancelled) {
          setState({
            generators: [],
            facilities: [],
            wasteRecords: [],
            routes: [],
            loading: false,
            error: err instanceof Error ? err.message : "Failed to load map data",
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
