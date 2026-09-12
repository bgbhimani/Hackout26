"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Skeleton } from "@/components/ui/skeleton";
import { ForecastChart } from "@/components/forecast/forecast-chart";
import { HowItWorks } from "@/components/forecast/how-it-works";
import { apiFetch, ApiError } from "@/lib/api";
import type { ForecastResult, Generator, WasteRecordWithGenerator, WasteType } from "@/types";

const WASTE_TYPE_LABEL: Record<string, string> = {
  RICE_STRAW: "Rice Straw",
  WHEAT_STRAW: "Wheat Straw",
  COTTON_RESIDUE: "Cotton Residue",
  SUGARCANE_RESIDUE: "Sugarcane Residue",
  FOOD_WASTE: "Food Waste",
  ORGANIC_WASTE: "Organic Waste",
  ANIMAL_MANURE: "Animal Manure",
};

function nextMonthDefault(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}

export default function ForecastPage() {
  const [generators, setGenerators] = useState<Generator[]>([]);
  const [wasteRecords, setWasteRecords] = useState<WasteRecordWithGenerator[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [generatorId, setGeneratorId] = useState("");
  const [wasteType, setWasteType] = useState<WasteType | "">("");
  const [forecastMonth, setForecastMonth] = useState(nextMonthDefault());
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [forecasting, setForecasting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([apiFetch<Generator[]>("/api/generators"), apiFetch<WasteRecordWithGenerator[]>("/api/waste")])
      .then(([g, w]) => {
        if (cancelled) return;
        setGenerators(g);
        setWasteRecords(w);
        if (g[0]) setGeneratorId(g[0].id);
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Failed to load data"))
      .finally(() => !cancelled && setLoadingData(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const availableWasteTypes = useMemo(() => {
    const types = new Set(wasteRecords.filter((r) => r.generator_id === generatorId).map((r) => r.waste_type));
    return Array.from(types);
  }, [wasteRecords, generatorId]);

  useEffect(() => {
    setWasteType(availableWasteTypes[0] ?? "");
    setResult(null);
  }, [availableWasteTypes]);

  const history = useMemo(
    () =>
      wasteRecords
        .filter((r) => r.generator_id === generatorId && r.waste_type === wasteType)
        .sort((a, b) => a.available_from.localeCompare(b.available_from)),
    [wasteRecords, generatorId, wasteType]
  );

  const chartPoints = useMemo(() => {
    const points: { month: string; actual?: number; predicted?: number }[] = history.map((r) => ({
      month: r.available_from.slice(0, 7),
      actual: r.quantity_tonnes,
    }));
    if (result && points.length > 0) {
      const last = points[points.length - 1];
      if (last) last.predicted = last.actual; // connects the dashed forecast segment to the actual line
      points.push({ month: forecastMonth, actual: undefined, predicted: result.predicted_quantity_tonnes });
    }
    return points;
  }, [history, result, forecastMonth]);

  const selectedGenerator = generators.find((g) => g.id === generatorId);

  async function handleForecast() {
    if (!generatorId || !wasteType) return;
    setForecasting(true);
    setError(null);
    setResult(null);
    try {
      const res = await apiFetch<ForecastResult>("/api/forecast", {
        method: "POST",
        body: JSON.stringify({ generator_id: generatorId, waste_type: wasteType, forecast_month: forecastMonth }),
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to generate forecast");
    } finally {
      setForecasting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">AI Waste Forecast</h1>
        <p className="text-sm text-muted-foreground">
          XGBoost trained on 6 years of calibrated historical data (
          <span className="font-medium text-foreground">Demo / Synthetic Data</span>, see data/ml-data-research.md) -
          time-based train/test split, not a random one.
        </p>
      </div>

      {loadingData ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <Card>
          <CardContent className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="generator">Generator</Label>
              <SelectNative id="generator" value={generatorId} onChange={(e) => setGeneratorId(e.target.value)}>
                {generators.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="waste-type">Waste type</Label>
              <SelectNative
                id="waste-type"
                value={wasteType}
                onChange={(e) => setWasteType(e.target.value as WasteType)}
                disabled={availableWasteTypes.length === 0}
              >
                {availableWasteTypes.length === 0 && <option value="">No history for this generator</option>}
                {availableWasteTypes.map((wt) => (
                  <option key={wt} value={wt}>
                    {WASTE_TYPE_LABEL[wt] ?? wt}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="month">Forecast month</Label>
              <Input
                id="month"
                type="month"
                value={forecastMonth}
                onChange={(e) => setForecastMonth(e.target.value)}
              />
            </div>
            <div className="sm:col-span-3">
              <Button onClick={handleForecast} disabled={forecasting || !generatorId || !wasteType}>
                <Sparkles className="h-4 w-4" />
                {forecasting ? "Forecasting..." : "Generate Forecast"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="p-5 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-light text-accent-foreground">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Predicted for {selectedGenerator?.name} · {forecastMonth}
                </p>
                <p className="text-2xl font-semibold text-foreground">
                  {result.predicted_quantity_tonnes.toLocaleString()}{" "}
                  <span className="text-base font-normal text-muted-foreground">tonnes</span>
                </p>
              </div>
            </div>
            <div className="flex gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Confidence</p>
                <p className="font-medium text-foreground">{Math.round(result.confidence * 100)}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Model</p>
                <Badge>{result.model}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Historical vs Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <ForecastChart points={chartPoints} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How the prediction works</CardTitle>
        </CardHeader>
        <CardContent>
          <HowItWorks />
        </CardContent>
      </Card>
    </div>
  );
}
