"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  History,
  MapPin,
  Package,
  Pencil,
  Plus,
  ShieldCheck,
  Sparkles,
  Sprout,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { GeneratorFormDialog } from "@/components/waste/generator-form-dialog";
import { WasteBatchFormDialog } from "@/components/waste/waste-batch-form-dialog";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch, ApiError } from "@/lib/api";
import type { Generator, WasteRecordWithGenerator, WasteStatus, WasteType } from "@/types";

const GENERATOR_TYPE_LABEL: Record<string, string> = {
  FARM: "Farm / Agricultural Field",
  FOOD_INDUSTRY: "Food Industry",
  MUNICIPALITY: "Municipality",
  INDUSTRIAL: "Industrial / Mill",
};

const WASTE_TYPE_LABEL: Record<string, string> = {
  RICE_STRAW: "Rice Straw (Paddy)",
  WHEAT_STRAW: "Wheat Straw",
  COTTON_RESIDUE: "Cotton Residue",
  SUGARCANE_RESIDUE: "Sugarcane Residue",
  FOOD_WASTE: "Food Waste",
  ORGANIC_WASTE: "Organic Waste",
  ANIMAL_MANURE: "Animal Manure",
};

const STATUS_VARIANT: Record<WasteStatus, "default" | "accent" | "secondary" | "outline"> = {
  AVAILABLE: "default",
  PENDING: "accent",
  COLLECTED: "secondary",
  PROCESSED: "outline",
};

export default function WastePage() {
  const { user } = useAuth();
  const [generators, setGenerators] = useState<Generator[]>([]);
  const [wasteRecords, setWasteRecords] = useState<WasteRecordWithGenerator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [farmDialogOpen, setFarmDialogOpen] = useState(false);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [editingGenerator, setEditingGenerator] = useState<Generator | null>(null);
  const [selectedFarmForBatch, setSelectedFarmForBatch] = useState<string | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Active view tab
  const [activeTab, setActiveTab] = useState<"batches" | "farms">("batches");

  const canWrite = user?.role === "ADMIN" || user?.role === "WASTE_GENERATOR";
  const canDelete = user?.role === "ADMIN" || user?.role === "WASTE_GENERATOR";

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

  // Overall statistics
  const totalAvailableTonnes = useMemo(
    () =>
      wasteRecords
        .filter((r) => r.status === "AVAILABLE")
        .reduce((sum, r) => sum + r.quantity_tonnes, 0),
    [wasteRecords]
  );

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Are you sure you want to remove the farm "${name}"? This will also remove any uncollected waste batches linked to this location.`)) {
      return;
    }
    setDeletingId(id);
    try {
      await apiFetch(`/api/generators/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete farm");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header & CTAs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Waste Batches & Farm Management</h1>
          <p className="text-sm text-muted-foreground">
            Register your verified farms, log biomass batches locked to your locations, and review pickup readiness.
          </p>
        </div>

        {canWrite && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEditingGenerator(null);
                setFarmDialogOpen(true);
              }}
              className="gap-1.5"
            >
              <Building2 className="h-4 w-4" />
              Register / Edit Farm
            </Button>
            <Button
              onClick={() => {
                setSelectedFarmForBatch(generators[0]?.id);
                setBatchDialogOpen(true);
              }}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="h-4 w-4" />
              Log Waste Batch
            </Button>
          </div>
        )}
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Verified Farms / Sites</p>
              <p className="text-2xl font-bold text-foreground mt-1">{generators.length}</p>
            </div>
            <div className="rounded-full bg-primary/10 p-2.5 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">All batches are locked to these verified coordinates.</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Available Biomass</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{totalAvailableTonnes.toLocaleString()} MT</p>
            </div>
            <div className="rounded-full bg-emerald-500/10 p-2.5 text-emerald-600">
              <Sprout className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">Ready for automated facility matchmaking.</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Logged Batches</p>
              <p className="text-2xl font-bold text-foreground mt-1">{wasteRecords.length}</p>
            </div>
            <div className="rounded-full bg-blue-500/10 p-2.5 text-blue-600">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">Active, pending & collected batches.</p>
        </Card>
      </div>

      {/* View Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("batches")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "batches"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Waste Batches ({wasteRecords.length})
        </button>
        <button
          onClick={() => setActiveTab("farms")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "farms"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          My Farms & Sites ({generators.length})
        </button>
      </div>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-5 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {loading ? (
        <Skeleton className="h-96 w-full" />
      ) : activeTab === "batches" ? (
        /* Waste Batches Table */
        wasteRecords.length === 0 ? (
          <Card>
            <CardContent className="p-8">
              <EmptyState
                icon={Package}
                title="No Waste Batches Logged"
                description="Log your first crop residue batch locked to your registered farm location."
              >
                {canWrite && (
                  <Button
                    onClick={() => setBatchDialogOpen(true)}
                    className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Log Waste Batch
                  </Button>
                )}
              </EmptyState>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Batch ID & Crop</th>
                    <th className="px-4 py-3 font-medium">Origin Farm / Site</th>
                    <th className="px-4 py-3 font-medium">Quantity</th>
                    <th className="px-4 py-3 font-medium">Moisture</th>
                    <th className="px-4 py-3 font-medium">Availability Window</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {wasteRecords.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">
                          {WASTE_TYPE_LABEL[r.waste_type] ?? r.waste_type}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          #{r.id.slice(0, 8)}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          {r.generator_name}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 text-emerald-600" />
                          GPS: {r.latitude?.toFixed(2)}°, {r.longitude?.toFixed(2)}°
                        </div>
                      </td>

                      <td className="px-4 py-3 font-semibold text-foreground">
                        {r.quantity_tonnes} MT
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        {r.moisture_percent !== null ? `${r.moisture_percent}%` : "—"}
                      </td>

                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <div>From: {r.available_from}</div>
                        {r.available_until && <div>Until: {r.available_until}</div>}
                      </td>

                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANT[r.status] ?? "outline"}>{r.status}</Badge>
                      </td>

                      <td className="px-4 py-3 text-right">
                        {r.status === "AVAILABLE" ? (
                          <Button asChild variant="outline" size="sm" className="gap-1 text-xs">
                            <Link href={`/matching?wasteId=${r.id}`}>
                              <Sparkles className="h-3 w-3 text-emerald-600" />
                              Match Plant
                            </Link>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">In Workflow</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      ) : (
        /* Farms & Sites List */
        generators.length === 0 ? (
          <Card>
            <CardContent className="p-8">
              <EmptyState
                icon={Building2}
                title="No Farms Registered"
                description="Register your first farm profile with verified coordinates so you can log batches."
              >
                {canWrite && (
                  <Button onClick={() => setFarmDialogOpen(true)} className="mt-4">
                    <Plus className="h-4 w-4 mr-1.5" />
                    Register Farm
                  </Button>
                )}
              </EmptyState>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {generators.map((g) => {
              const records = recordsByGenerator.get(g.id) ?? [];
              const availableTonnes = records
                .filter((r) => r.status === "AVAILABLE")
                .reduce((sum, r) => sum + r.quantity_tonnes, 0);

              return (
                <Card key={g.id} className="flex flex-col justify-between overflow-hidden">
                  <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base font-semibold">{g.name}</CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          {GENERATOR_TYPE_LABEL[g.generator_type] ?? g.generator_type}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-background">
                        {records.length} Batches
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-3 flex-1 text-xs">
                    <div className="space-y-1.5 text-muted-foreground">
                      <div className="flex items-start gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="text-foreground">{g.address}</span>
                      </div>
                      <div className="pl-5 text-[11px]">
                        GPS: {g.latitude.toFixed(4)}° N, {g.longitude.toFixed(4)}° E
                      </div>
                    </div>

                    {g.contact_name && (
                      <div className="rounded-md bg-muted/40 p-2 text-[11px] text-muted-foreground">
                        <span className="font-medium text-foreground">Contact:</span> {g.contact_name}
                        {g.phone && ` • ${g.phone}`}
                      </div>
                    )}

                    <div className="border-t border-border/50 pt-2 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Current Available:</span>
                      <span className="font-semibold text-emerald-600">
                        {availableTonnes > 0 ? `${availableTonnes.toLocaleString()} MT` : "0 MT"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-1">
                      <History className="h-3 w-3" />
                      <span>Updated {new Date(g.updated_at || g.created_at).toLocaleDateString()}</span>
                    </div>
                  </CardContent>

                  <div className="border-t border-border bg-muted/10 p-3 flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedFarmForBatch(g.id);
                        setBatchDialogOpen(true);
                      }}
                      className="gap-1 text-xs flex-1"
                    >
                      <Plus className="h-3.5 w-3.5 text-emerald-600" />
                      Add Batch
                    </Button>

                    {canWrite && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingGenerator(g);
                          setFarmDialogOpen(true);
                        }}
                        title="Edit Farm Profile"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}

                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deletingId === g.id}
                        onClick={() => handleDelete(g.id, g.name)}
                        title="Remove Farm & Site"
                        className="hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )
      )}

      {/* Register / Edit Farm Dialog */}
      <GeneratorFormDialog
        open={farmDialogOpen}
        onOpenChange={setFarmDialogOpen}
        editing={editingGenerator}
        onSaved={load}
      />

      {/* Log Waste Batch Dialog */}
      <WasteBatchFormDialog
        open={batchDialogOpen}
        onOpenChange={setBatchDialogOpen}
        generators={generators}
        defaultGeneratorId={selectedFarmForBatch}
        onSaved={load}
      />
    </div>
  );
}
