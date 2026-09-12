"use client";

import { useEffect, useState } from "react";
import { Factory, Pencil, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { FacilityFormDialog } from "@/components/facilities/facility-form-dialog";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch, ApiError } from "@/lib/api";
import type { Facility } from "@/types";

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

function utilizationColor(pct: number): string {
  if (pct >= 90) return "bg-destructive";
  if (pct >= 70) return "bg-accent";
  return "bg-primary";
}

export default function FacilitiesPage() {
  const { user } = useAuth();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Facility | null>(null);

  const canWrite = user?.role === "ADMIN" || user?.role === "FACILITY_OPERATOR";

  async function load() {
    setFacilities(await apiFetch<Facility[]>("/api/facilities"));
  }

  useEffect(() => {
    let cancelled = false;
    load()
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Failed to load facilities"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Facilities</h1>
          <p className="text-sm text-muted-foreground">Biochar, biogas, and biomass conversion facilities.</p>
        </div>
        {canWrite && (
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Facility
          </Button>
        )}
      </div>

      {error && (
        <Card>
          <CardContent className="p-5 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {loading ? (
        <Skeleton className="h-96 w-full" />
      ) : facilities.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <EmptyState icon={Factory} title="No facilities yet" description="Add your first conversion facility." />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {facilities.map((f) => (
            <Card key={f.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">{f.name}</p>
                    <p className="text-xs text-muted-foreground">{FACILITY_TYPE_LABEL[f.facility_type]}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={f.status === "ACTIVE" ? "default" : "outline"}>{f.status}</Badge>
                    {canWrite && (
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Edit"
                        onClick={() => {
                          setEditing(f);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">{f.address}</p>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {f.current_load_tonnes} / {f.capacity_tonnes} t
                    </span>
                    <span>{f.utilization_percent}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${utilizationColor(f.utilization_percent)}`}
                      style={{ width: `${Math.min(100, f.utilization_percent)}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 border-t border-border pt-2">
                  {f.accepted_waste_types.map((w) => (
                    <Badge key={w} variant="secondary" className="text-[10px]">
                      {WASTE_TYPE_LABEL[w] ?? w}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <FacilityFormDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSaved={load} />
    </div>
  );
}
