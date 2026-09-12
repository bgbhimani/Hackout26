"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Factory, Leaf, Package, Truck, Weight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RankedBarList } from "@/components/charts/ranked-bar-list";
import { MonthlyLineChart } from "@/components/charts/monthly-line-chart";
import { CHART_COLORS } from "@/components/charts/chart-colors";
import { CalculationBreakdown } from "@/components/carbon/calculation-breakdown";
import { apiFetch, ApiError } from "@/lib/api";
import type { CarbonRecord, Facility, WasteRecordWithGenerator } from "@/types";

const WASTE_TYPE_LABEL: Record<string, string> = {
  RICE_STRAW: "Rice Straw",
  WHEAT_STRAW: "Wheat Straw",
  COTTON_RESIDUE: "Cotton Residue",
  SUGARCANE_RESIDUE: "Sugarcane Residue",
  FOOD_WASTE: "Food Waste",
  ORGANIC_WASTE: "Organic Waste",
  ANIMAL_MANURE: "Animal Manure",
};

export default function CarbonPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <CarbonPageContent />
    </Suspense>
  );
}

function CarbonPageContent() {
  const searchParams = useSearchParams();
  const deepLinkedWasteId = searchParams.get("wasteId");
  const deepLinkedFacilityId = searchParams.get("facilityId");
  const hasAutoCalculated = useRef(false);

  const [wasteRecords, setWasteRecords] = useState<WasteRecordWithGenerator[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [records, setRecords] = useState<CarbonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [wasteId, setWasteId] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestResult, setLatestResult] = useState<CarbonRecord | null>(null);

  async function loadAll() {
    const [w, f, c] = await Promise.all([
      apiFetch<WasteRecordWithGenerator[]>("/api/waste"),
      apiFetch<Facility[]>("/api/facilities"),
      apiFetch<CarbonRecord[]>("/api/carbon"),
    ]);
    setWasteRecords(w.filter((r) => r.status === "AVAILABLE" || r.status === "COLLECTED"));
    setFacilities(f);
    setRecords(c);
    // Arriving from Route Optimization (Route → Carbon integration, Phase 9)
    // pre-selects the exact waste record that was routed.
    const preselected = deepLinkedWasteId && w.some((r) => r.id === deepLinkedWasteId);
    if (preselected) setWasteId(deepLinkedWasteId!);
    else if (w[0]) setWasteId(w[0].id);
  }

  useEffect(() => {
    let cancelled = false;
    loadAll()
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Failed to load data"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedWaste = wasteRecords.find((r) => r.id === wasteId);
  const compatibleFacilities = useMemo(
    () => (selectedWaste ? facilities.filter((f) => f.accepted_waste_types.includes(selectedWaste.waste_type)) : []),
    [facilities, selectedWaste]
  );

  useEffect(() => {
    const deepLinkedIsCompatible =
      deepLinkedFacilityId && compatibleFacilities.some((f) => f.id === deepLinkedFacilityId);
    setFacilityId(deepLinkedIsCompatible ? deepLinkedFacilityId! : (compatibleFacilities[0]?.id ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compatibleFacilities]);

  async function handleCalculate() {
    if (!wasteId || !facilityId) return;
    setCalculating(true);
    setError(null);
    try {
      const result = await apiFetch<CarbonRecord>("/api/carbon/calculate", {
        method: "POST",
        body: JSON.stringify({ waste_record_id: wasteId, facility_id: facilityId }),
      });
      setLatestResult(result);
      await loadAll();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to calculate carbon impact");
    } finally {
      setCalculating(false);
    }
  }

  // Arriving via a full deep link (both waste record and facility already
  // chosen upstream, e.g. from a route's timeline) calculates immediately -
  // completing the Match → Route → Carbon chain in one click, not three.
  useEffect(() => {
    if (
      !hasAutoCalculated.current &&
      deepLinkedWasteId &&
      deepLinkedFacilityId &&
      wasteId === deepLinkedWasteId &&
      facilityId === deepLinkedFacilityId
    ) {
      hasAutoCalculated.current = true;
      handleCalculate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wasteId, facilityId, deepLinkedWasteId, deepLinkedFacilityId]);

  const totals = useMemo(
    () => ({
      wasteDiverted: records.reduce((s, r) => s + r.waste_quantity_tonnes, 0),
      conversionOutput: records.reduce((s, r) => s + r.conversion_output_tonnes, 0),
      sequestered: records.reduce((s, r) => s + r.estimated_sequestered_co2_tonnes, 0),
      transport: records.reduce((s, r) => s + r.transport_emissions_tonnes, 0),
      net: records.reduce((s, r) => s + r.net_co2_impact_tonnes, 0),
    }),
    [records]
  );

  const byMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of records) {
      const month = r.created_at.slice(0, 7);
      map.set(month, (map.get(month) ?? 0) + r.net_co2_impact_tonnes);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, quantity_tonnes]) => ({ month, quantity_tonnes: Math.round(quantity_tonnes * 100) / 100 }));
  }, [records]);

  const byWasteType = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of records) map.set(r.waste_type, (map.get(r.waste_type) ?? 0) + r.net_co2_impact_tonnes);
    return Array.from(map.entries()).map(([waste_type, net]) => ({
      label: WASTE_TYPE_LABEL[waste_type] ?? waste_type,
      value: Math.round(net * 100) / 100,
    }));
  }, [records]);

  const byFacility = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of records) map.set(r.facility_name, (map.get(r.facility_name) ?? 0) + r.net_co2_impact_tonnes);
    return Array.from(map.entries()).map(([facility_name, net]) => ({
      label: facility_name,
      value: Math.round(net * 100) / 100,
    }));
  }, [records]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Carbon Impact</h1>
        <p className="text-sm text-muted-foreground">
          Every figure below is an <span className="font-medium text-foreground">estimate</span>, calculated
          transparently from cited assumptions - never a certified or verified carbon offset.
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Calculate carbon impact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="waste">Waste record</Label>
                <SelectNative id="waste" value={wasteId} onChange={(e) => setWasteId(e.target.value)}>
                  {wasteRecords.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.generator_name} - {WASTE_TYPE_LABEL[r.waste_type] ?? r.waste_type} ({r.quantity_tonnes} t)
                    </option>
                  ))}
                </SelectNative>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="facility">Facility</Label>
                <SelectNative id="facility" value={facilityId} onChange={(e) => setFacilityId(e.target.value)}>
                  {compatibleFacilities.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.facility_type})
                    </option>
                  ))}
                </SelectNative>
              </div>
            </div>
            <Button onClick={handleCalculate} disabled={calculating || !wasteId || !facilityId}>
              <Leaf className="h-4 w-4" />
              {calculating ? "Calculating..." : "Calculate Carbon Impact"}
            </Button>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="p-5 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {latestResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Calculation breakdown (most recent)</CardTitle>
          </CardHeader>
          <CardContent>
            <CalculationBreakdown record={latestResult} />
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[92px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard label="Waste Diverted" value={totals.wasteDiverted.toLocaleString()} unit="t" icon={Package} />
          <KpiCard
            label="Conversion Output"
            value={totals.conversionOutput.toLocaleString()}
            unit="t"
            icon={Weight}
            tone="secondary"
          />
          <KpiCard
            label="Estimated CO₂ Impact"
            value={totals.sequestered.toLocaleString()}
            unit="t CO₂e"
            icon={Leaf}
            tone="accent"
          />
          <KpiCard
            label="Transport Emissions"
            value={totals.transport.toLocaleString()}
            unit="t CO₂e"
            icon={Truck}
            tone="secondary"
          />
          <KpiCard label="Net Estimated Impact" value={totals.net.toLocaleString()} unit="t CO₂e" icon={Factory} />
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Carbon impact over time</CardTitle>
            </CardHeader>
            <CardContent>
              <MonthlyLineChart
                data={byMonth}
                dataKey="quantity_tonnes"
                valueLabel="Net CO₂e"
                color={CHART_COLORS.primary}
                emptyTitle="No carbon records yet"
                emptyDescription="Calculate a carbon impact above to see it charted here."
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Carbon impact by waste type</CardTitle>
            </CardHeader>
            <CardContent>
              <RankedBarList
                data={byWasteType}
                valueSuffix=" t"
                emptyTitle="No carbon records yet"
                emptyDescription="Calculate a carbon impact above to see it charted here."
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Carbon impact by facility</CardTitle>
            </CardHeader>
            <CardContent>
              <RankedBarList
                data={byFacility}
                valueSuffix=" t"
                emptyTitle="No carbon records yet"
                emptyDescription="Calculate a carbon impact above to see it charted here."
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
