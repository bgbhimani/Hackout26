"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Skeleton } from "@/components/ui/skeleton";
import { RecommendationCard } from "@/components/matching/recommendation-card";
import { apiFetch, ApiError } from "@/lib/api";
import type { FacilityRecommendation, WasteRecordWithGenerator } from "@/types";

const WASTE_TYPE_LABEL: Record<string, string> = {
  RICE_STRAW: "Rice Straw",
  WHEAT_STRAW: "Wheat Straw",
  COTTON_RESIDUE: "Cotton Residue",
  SUGARCANE_RESIDUE: "Sugarcane Residue",
  FOOD_WASTE: "Food Waste",
  ORGANIC_WASTE: "Organic Waste",
  ANIMAL_MANURE: "Animal Manure",
};

export default function MatchingPage() {
  const [wasteRecords, setWasteRecords] = useState<WasteRecordWithGenerator[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [selectedId, setSelectedId] = useState<string>("");
  const [recommendations, setRecommendations] = useState<FacilityRecommendation[] | null>(null);
  const [matching, setMatching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<WasteRecordWithGenerator[]>("/api/waste")
      .then((records) => {
        if (cancelled) return;
        const available = records.filter((r) => r.status === "AVAILABLE");
        setWasteRecords(available);
        const first = available[0];
        if (first) setSelectedId(first.id);
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Failed to load waste records"))
      .finally(() => !cancelled && setLoadingRecords(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedRecord = useMemo(() => wasteRecords.find((r) => r.id === selectedId), [wasteRecords, selectedId]);

  async function handleFindFacility() {
    if (!selectedId) return;
    setMatching(true);
    setError(null);
    setRecommendations(null);
    try {
      const results = await apiFetch<FacilityRecommendation[]>("/api/matching/recommend", {
        method: "POST",
        body: JSON.stringify({ waste_record_id: selectedId }),
      });
      setRecommendations(results);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to compute recommendations");
    } finally {
      setMatching(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Smart Matching</h1>
        <p className="text-sm text-muted-foreground">
          A transparent, weighted scoring engine - not a black box. Every recommendation shows exactly why it
          ranked where it did.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          {loadingRecords ? (
            <Skeleton className="h-10 w-full max-w-md" />
          ) : wasteRecords.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No available waste records"
              description="Once a waste record has AVAILABLE status, it will appear here for matching."
            />
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="waste-record">Select a waste record</Label>
                <SelectNative id="waste-record" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                  {wasteRecords.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.generator_name} — {WASTE_TYPE_LABEL[r.waste_type] ?? r.waste_type} ({r.quantity_tonnes} t)
                    </option>
                  ))}
                </SelectNative>
              </div>
              <Button onClick={handleFindFacility} disabled={matching || !selectedId}>
                <Sparkles className="h-4 w-4" />
                {matching ? "Finding best facility..." : "Find Best Facility"}
              </Button>
            </div>
          )}

          {selectedRecord && (
            <p className="text-xs text-muted-foreground">
              {selectedRecord.quantity_tonnes} tonnes of {WASTE_TYPE_LABEL[selectedRecord.waste_type]} from{" "}
              {selectedRecord.generator_name}, available {selectedRecord.available_from}
              {selectedRecord.available_until ? ` – ${selectedRecord.available_until}` : ""}.
            </p>
          )}
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardContent className="p-5 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {matching && (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-[260px]" />
          ))}
        </div>
      )}

      {!matching && recommendations && recommendations.length === 0 && (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={Sparkles}
              title="No compatible facilities found"
              description="No ACTIVE facility currently accepts this waste type. Register a facility that accepts it, or check accepted_waste_types on existing facilities."
            />
          </CardContent>
        </Card>
      )}

      {!matching && recommendations && recommendations.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-foreground">
            {recommendations.length} matching {recommendations.length === 1 ? "facility" : "facilities"}, sorted
            by score
          </p>
          {recommendations.map((rec, i) => (
            <RecommendationCard key={rec.facility_id} rec={rec} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
