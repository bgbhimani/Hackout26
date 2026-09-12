"use client";

import { useEffect, useState } from "react";
import { Building2, Calendar, MapPin, Package, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { apiFetch, ApiError } from "@/lib/api";
import type { Generator, WasteRecordWithGenerator, WasteType } from "@/types";

const WASTE_TYPES: { value: WasteType; label: string }[] = [
  { value: "RICE_STRAW", label: "Rice Straw (Paddy Stubble)" },
  { value: "WHEAT_STRAW", label: "Wheat Straw" },
  { value: "COTTON_RESIDUE", label: "Cotton Stalks / Residue" },
  { value: "SUGARCANE_RESIDUE", label: "Sugarcane Bagasse / Residue" },
  { value: "FOOD_WASTE", label: "Food Processing Waste" },
  { value: "ORGANIC_WASTE", label: "General Organic Waste" },
  { value: "ANIMAL_MANURE", label: "Dairy / Animal Manure" },
];

interface WasteBatchFormState {
  generator_id: string;
  waste_type: WasteType;
  quantity_tonnes: string;
  moisture_percent: string;
  available_from: string;
  available_until: string;
}

const EMPTY_BATCH_FORM: WasteBatchFormState = {
  generator_id: "",
  waste_type: "RICE_STRAW",
  quantity_tonnes: "25",
  moisture_percent: "14",
  available_from: new Date().toISOString().split("T")[0] || "",
  available_until: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0] || "",
};

export function WasteBatchFormDialog({
  open,
  onOpenChange,
  generators,
  defaultGeneratorId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generators: Generator[];
  defaultGeneratorId?: string;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<WasteBatchFormState>(EMPTY_BATCH_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm({
        ...EMPTY_BATCH_FORM,
        generator_id: defaultGeneratorId || (generators.length > 0 && generators[0] ? generators[0].id : ""),
        available_from: new Date().toISOString().split("T")[0] || "",
        available_until: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0] || "",
      });
      setError(null);
    }
  }, [open, defaultGeneratorId, generators]);

  const selectedGenerator = generators.find((g) => g.id === form.generator_id);

  function set<K extends keyof WasteBatchFormState>(key: K, value: WasteBatchFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (!form.generator_id) {
      setError("Please select a registered Farm / Facility.");
      setSaving(false);
      return;
    }

    const qty = Number(form.quantity_tonnes);
    if (Number.isNaN(qty) || qty <= 0) {
      setError("Quantity must be greater than 0 tonnes.");
      setSaving(false);
      return;
    }

    const moisture = form.moisture_percent ? Number(form.moisture_percent) : null;
    if (moisture !== null && (Number.isNaN(moisture) || moisture < 0 || moisture > 100)) {
      setError("Moisture percentage must be between 0 and 100.");
      setSaving(false);
      return;
    }

    const payload = {
      generator_id: form.generator_id,
      waste_type: form.waste_type,
      quantity_tonnes: qty,
      moisture_percent: moisture,
      available_from: form.available_from,
      available_until: form.available_until || null,
    };

    try {
      await apiFetch("/api/waste", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to log waste batch.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-emerald-600" />
            Log New Waste Batch
          </DialogTitle>
          <DialogDescription>
            Record biomass waste generated at one of your registered farms or facilities.
          </DialogDescription>
        </DialogHeader>

        {generators.length === 0 ? (
          <div className="space-y-4 py-4">
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
              <p className="font-semibold">No Registered Farms Found</p>
              <p className="mt-1 text-xs">
                To prevent unverified waste logging, you must register a Farm or Facility profile before you can log batches.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Farm Selector */}
            <div className="space-y-1.5">
              <Label htmlFor="farm_select" className="font-medium">
                Select Verified Farm / Facility <span className="text-destructive">*</span>
              </Label>
              <SelectNative
                id="farm_select"
                value={form.generator_id}
                onChange={(e) => set("generator_id", e.target.value)}
                required
              >
                {generators.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.generator_type.replace("_", " ")})
                  </option>
                ))}
              </SelectNative>
            </div>

            {/* Locked Farm Location Display */}
            {selectedGenerator && (
              <div className="rounded-md border border-border bg-muted/40 p-3 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="font-medium text-foreground">Verified Location:</span> {selectedGenerator.address}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground pl-5">
                  <span>GPS: {selectedGenerator.latitude.toFixed(4)}° N, {selectedGenerator.longitude.toFixed(4)}° E</span>
                  <span className="text-emerald-600 flex items-center gap-0.5">
                    <ShieldCheck className="h-3 w-3" /> Auto-linked
                  </span>
                </div>
              </div>
            )}

            {/* Waste Type & Quantity */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="waste_type">Biomass Type</Label>
                <SelectNative
                  id="waste_type"
                  value={form.waste_type}
                  onChange={(e) => set("waste_type", e.target.value as WasteType)}
                >
                  {WASTE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </SelectNative>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="quantity">Quantity (Tonnes)</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  value={form.quantity_tonnes}
                  onChange={(e) => set("quantity_tonnes", e.target.value)}
                  placeholder="e.g. 25"
                />
              </div>
            </div>

            {/* Moisture & Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="moisture">Moisture Content (%)</Label>
                <Input
                  id="moisture"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={form.moisture_percent}
                  onChange={(e) => set("moisture_percent", e.target.value)}
                  placeholder="e.g. 14"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="available_from">Available From</Label>
                <Input
                  id="available_from"
                  type="date"
                  required
                  value={form.available_from}
                  onChange={(e) => set("available_from", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="available_until">Available Until (Optional)</Label>
              <Input
                id="available_until"
                type="date"
                value={form.available_until}
                onChange={(e) => set("available_until", e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {saving ? "Logging Batch..." : "Log Waste Batch"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
