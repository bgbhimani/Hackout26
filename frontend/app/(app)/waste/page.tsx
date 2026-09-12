"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { GeneratorFormDialog } from "@/components/waste/generator-form-dialog";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch, ApiError } from "@/lib/api";
import type { Generator, WasteRecordWithGenerator } from "@/types";

const GENERATOR_TYPE_LABEL: Record<string, string> = {
  FARM: "Farm",
  FOOD_INDUSTRY: "Food Industry",
  MUNICIPALITY: "Municipality",
  INDUSTRIAL: "Industrial",
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

function statusSummary(records: WasteRecordWithGenerator[]): { label: string; variant: "default" | "accent" | "secondary" | "outline" } {
  if (records.some((r) => r.status === "AVAILABLE")) return { label: "Available", variant: "default" };
  if (records.some((r) => r.status === "PENDING")) return { label: "Pending", variant: "accent" };
  if (records.length > 0) return { label: "Processed", variant: "secondary" };
  return { label: "No records", variant: "outline" };
}

export default function WastePage() {
  const { user } = useAuth();
  const [generators, setGenerators] = useState<Generator[]>([]);
  const [wasteRecords, setWasteRecords] = useState<WasteRecordWithGenerator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Generator | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canWrite = user?.role === "ADMIN" || user?.role === "WASTE_GENERATOR";
  const canDelete = user?.role === "ADMIN";

  async function load() {
    const [g, w] = await Promise.all([
      apiFetch<Generator[]>("/api/generators"),
      apiFetch<WasteRecordWithGenerator[]>("/api/waste"),
    ]);
    setGenerators(g);
    setWasteRecords(w);
  }

  useEffect(() => {
    let cancelled = false;
    load()
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Failed to load data"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const recordsByGenerator = useMemo(() => {
    const map = new Map<string, WasteRecordWithGenerator[]>();
    for (const r of wasteRecords) {
      const list = map.get(r.generator_id) ?? [];
      list.push(r);
      map.set(r.generator_id, list);
    }
    return map;
  }, [wasteRecords]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await apiFetch(`/api/generators/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete generator");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Waste Generators</h1>
          <p className="text-sm text-muted-foreground">Farms, food industries, and municipalities supplying waste.</p>
        </div>
        {canWrite && (
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Generator
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
      ) : generators.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <EmptyState icon={MapPin} title="No generators yet" description="Add your first waste generator to get started." />
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Generator</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Available Waste</th>
                  <th className="px-4 py-3 font-medium">Waste Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {generators.map((g) => {
                  const records = recordsByGenerator.get(g.id) ?? [];
                  const availableTonnes = records
                    .filter((r) => r.status === "AVAILABLE")
                    .reduce((sum, r) => sum + r.quantity_tonnes, 0);
                  const wasteTypes = Array.from(new Set(records.map((r) => r.waste_type)));
                  const status = statusSummary(records);
                  const firstAvailable = records.find((r) => r.status === "AVAILABLE");

                  return (
                    <tr key={g.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{g.name}</p>
                        {g.contact_name && <p className="text-xs text-muted-foreground">{g.contact_name}</p>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{GENERATOR_TYPE_LABEL[g.generator_type]}</td>
                      <td className="px-4 py-3 text-muted-foreground">{g.address}</td>
                      <td className="px-4 py-3 text-foreground">
                        {availableTonnes > 0 ? `${availableTonnes.toLocaleString()} t` : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {wasteTypes.length > 0
                          ? wasteTypes.map((w) => WASTE_TYPE_LABEL[w] ?? w).join(", ")
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {firstAvailable && (
                            <Button asChild variant="ghost" size="sm" title="Find best facility for this waste">
                              <Link href={`/matching?wasteId=${firstAvailable.id}`}>
                                <Sparkles className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          )}
                          {canWrite && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Edit"
                              onClick={() => {
                                setEditing(g);
                                setDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Delete"
                              disabled={deletingId === g.id}
                              onClick={() => handleDelete(g.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <GeneratorFormDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSaved={load} />
    </div>
  );
}
