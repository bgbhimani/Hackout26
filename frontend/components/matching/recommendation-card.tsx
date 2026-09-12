import Link from "next/link";
import { ArrowRight, CheckCircle2, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { FacilityRecommendation } from "@/types";

const FACILITY_TYPE_LABEL: Record<string, string> = {
  BIOCHAR: "Biochar",
  BIOGAS: "Biogas",
  BIOMASS_CONVERSION: "Biomass Conversion",
};

const WASTE_TYPE_LABEL: Record<string, string> = {
  RICE_STRAW: "Rice Straw",
  WHEAT_STRAW: "Wheat Straw",
  COTTON_RESIDUE: "Cotton Residue",
  SUGARCANE_RESIDUE: "Sugarcane Residue",
  FOOD_WASTE: "Food Waste",
  ORGANIC_WASTE: "Organic Waste",
  ANIMAL_MANURE: "Animal Manure",
};

function scoreTone(score: number): { badge: "default" | "accent" | "destructive"; bar: string } {
  if (score >= 75) return { badge: "default", bar: "bg-primary" };
  if (score >= 50) return { badge: "accent", bar: "bg-accent" };
  return { badge: "destructive", bar: "bg-destructive" };
}

function BreakdownBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}

export function RecommendationCard({
  rec,
  rank,
  wasteRecordId,
}: {
  rec: FacilityRecommendation;
  rank: number;
  /** When provided, renders a "Continue to Route Optimization" link that
   * carries this match forward - the Match → Route → Carbon integration
   * (Phase 9) instead of making the user re-select everything on the next page. */
  wasteRecordId?: string;
}) {
  const tone = scoreTone(rec.match_score);

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                {rank}
              </span>
              <p className="font-semibold text-foreground">{rec.facility_name}</p>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {FACILITY_TYPE_LABEL[rec.facility_type] ?? rec.facility_type}
            </p>
          </div>
          <Badge variant={tone.badge} className="shrink-0 text-sm">
            {rec.match_score}% match
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Distance</p>
            <p className="font-medium text-foreground">{rec.distance_km} km</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Available Capacity</p>
            <p className="font-medium text-foreground">{rec.available_capacity_tonnes} t</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Est. Transport Cost</p>
            <p className="font-medium text-foreground">₹{rec.estimated_transport_cost.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Accepts</p>
            <p className="font-medium text-foreground">
              {rec.accepted_waste_types.map((w) => WASTE_TYPE_LABEL[w] ?? w).join(", ")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 sm:grid-cols-4">
          <BreakdownBar label="Compatibility" value={rec.score_breakdown.compatibility} />
          <BreakdownBar label="Distance" value={rec.score_breakdown.distance} />
          <BreakdownBar label="Capacity" value={rec.score_breakdown.capacity} />
          <BreakdownBar label="Utilization" value={rec.score_breakdown.utilization} />
        </div>

        <div className="space-y-1 border-t border-border pt-3">
          {rec.reasons.map((reason) => {
            const isWarning = reason.toLowerCase().startsWith("limited") || reason.toLowerCase().startsWith("long");
            const Icon = isWarning ? TriangleAlert : CheckCircle2;
            return (
              <div key={reason} className="flex items-center gap-2 text-sm">
                <Icon className={isWarning ? "h-4 w-4 text-accent" : "h-4 w-4 text-primary"} />
                <span className="text-foreground">{reason}</span>
              </div>
            );
          })}
        </div>

        {wasteRecordId && (
          <div className="border-t border-border pt-3">
            <Button asChild variant="outline" size="sm">
              <Link href={`/routes?facilityId=${rec.facility_id}&wasteId=${wasteRecordId}`}>
                Continue to Route Optimization
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
