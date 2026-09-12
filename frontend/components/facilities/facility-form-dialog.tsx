"use client";

import { useEffect, useState } from "react";

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
import type { Facility, FacilityStatus, FacilityType, WasteType } from "@/types";

const FACILITY_TYPES: FacilityType[] = ["BIOCHAR", "BIOGAS", "BIOMASS_CONVERSION"];
const FACILITY_STATUSES: FacilityStatus[] = ["ACTIVE", "INACTIVE", "MAINTENANCE"];
const WASTE_TYPES: WasteType[] = [
  "RICE_STRAW",
  "WHEAT_STRAW",
  "COTTON_RESIDUE",
  "SUGARCANE_RESIDUE",
  "FOOD_WASTE",
  "ORGANIC_WASTE",
  "ANIMAL_MANURE",
];
const WASTE_TYPE_LABEL: Record<string, string> = {
  RICE_STRAW: "Rice Straw",
  WHEAT_STRAW: "Wheat Straw",
  COTTON_RESIDUE: "Cotton Residue",
  SUGARCANE_RESIDUE: "Sugarcane Residue",
  FOOD_WASTE: "Food Waste",
  ORGANIC_WASTE: "Organic Waste",
  ANIMAL_MANURE: "Animal Manure",
};

// Mirrors backend/app/constants/enums.py::FACILITY_WASTE_COMPATIBILITY -
// the server validates this too, but checking here means the user sees an
// invalid combination immediately instead of after a round trip.
const COMPATIBILITY: Record<FacilityType, WasteType[]> = {
  BIOCHAR: ["RICE_STRAW", "WHEAT_STRAW", "COTTON_RESIDUE", "SUGARCANE_RESIDUE"],
  BIOGAS: ["ANIMAL_MANURE", "FOOD_WASTE", "ORGANIC_WASTE"],
  BIOMASS_CONVERSION: ["RICE_STRAW", "WHEAT_STRAW", "COTTON_RESIDUE", "SUGARCANE_RESIDUE", "ORGANIC_WASTE"],
};

interface FormState {
  name: string;
  facility_type: FacilityType;
  capacity_tonnes: string;
  current_load_tonnes: string;
  accepted_waste_types: WasteType[];
  address: string;
  latitude: string;
  longitude: string;
  status: FacilityStatus;
}

const EMPTY_FORM: FormState = {
  name: "",
  facility_type: "BIOCHAR",
  capacity_tonnes: "",
  current_load_tonnes: "0",
  accepted_waste_types: [],
  address: "",
  latitude: "",
  longitude: "",
  status: "ACTIVE",
};

function facilityToForm(f: Facility): FormState {
  return {
    name: f.name,
    facility_type: f.facility_type,
    capacity_tonnes: f.capacity_tonnes.toString(),
    current_load_tonnes: f.current_load_tonnes.toString(),
    accepted_waste_types: f.accepted_waste_types,
    address: f.address,
    latitude: f.latitude.toString(),
    longitude: f.longitude.toString(),
    status: f.status,
  };
}

export function FacilityFormDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Facility | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(editing ? facilityToForm(editing) : EMPTY_FORM);
      setError(null);
    }
  }, [open, editing]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleWasteType(wt: WasteType) {
    setForm((f) => ({
      ...f,
      accepted_waste_types: f.accepted_waste_types.includes(wt)
        ? f.accepted_waste_types.filter((w) => w !== wt)
        : [...f.accepted_waste_types, wt],
    }));
  }

  const allowedForType = COMPATIBILITY[form.facility_type];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const lat = Number(form.latitude);
    const lng = Number(form.longitude);
    const capacity = Number(form.capacity_tonnes);
    if (Number.isNaN(lat) || lat < -90 || lat > 90 || Number.isNaN(lng) || lng < -180 || lng > 180) {
      setError("Latitude must be -90..90 and longitude -180..180.");
      setSaving(false);
      return;
    }
    if (form.accepted_waste_types.length === 0) {
      setError("Select at least one accepted waste type.");
      setSaving(false);
      return;
    }

    try {
      if (editing) {
        await apiFetch(`/api/facilities/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: form.name,
            capacity_tonnes: capacity,
            current_load_tonnes: Number(form.current_load_tonnes),
            accepted_waste_types: form.accepted_waste_types,
            address: form.address,
            latitude: lat,
            longitude: lng,
            status: form.status,
          }),
        });
      } else {
        await apiFetch("/api/facilities", {
          method: "POST",
          body: JSON.stringify({
            name: form.name,
            facility_type: form.facility_type,
            capacity_tonnes: capacity,
            current_load_tonnes: Number(form.current_load_tonnes),
            accepted_waste_types: form.accepted_waste_types,
            address: form.address,
            latitude: lat,
            longitude: lng,
          }),
        });
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save facility");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Facility" : "Add Facility"}</DialogTitle>
          <DialogDescription>
            {editing ? "Update this facility's details." : "Register a new conversion facility."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" required value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="facility_type">Facility Type</Label>
              <SelectNative
                id="facility_type"
                value={form.facility_type}
                disabled={!!editing}
                onChange={(e) => set("facility_type", e.target.value as FacilityType)}
              >
                {FACILITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace("_", " ")}
                  </option>
                ))}
              </SelectNative>
              {editing && <p className="text-xs text-muted-foreground">Facility type can&apos;t be changed after creation.</p>}
            </div>
            {editing && (
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <SelectNative id="status" value={form.status} onChange={(e) => set("status", e.target.value as FacilityStatus)}>
                  {FACILITY_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </SelectNative>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="capacity">Capacity (tonnes)</Label>
              <Input
                id="capacity"
                type="number"
                min={1}
                step="any"
                required
                value={form.capacity_tonnes}
                onChange={(e) => set("capacity_tonnes", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="load">Current Load (tonnes)</Label>
              <Input
                id="load"
                type="number"
                min={0}
                step="any"
                value={form.current_load_tonnes}
                onChange={(e) => set("current_load_tonnes", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Accepted Waste Types</Label>
            <div className="flex flex-wrap gap-2 rounded-md border border-border p-2">
              {WASTE_TYPES.map((wt) => {
                const allowed = allowedForType.includes(wt);
                return (
                  <label
                    key={wt}
                    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                      allowed ? "cursor-pointer border-border" : "cursor-not-allowed border-border/50 opacity-40"
                    } ${form.accepted_waste_types.includes(wt) ? "bg-primary-light text-primary border-primary" : ""}`}
                  >
                    <input
                      type="checkbox"
                      disabled={!allowed}
                      checked={form.accepted_waste_types.includes(wt)}
                      onChange={() => toggleWasteType(wt)}
                      className="accent-primary"
                    />
                    {WASTE_TYPE_LABEL[wt]}
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Only waste types compatible with {form.facility_type.replace("_", " ")} facilities are selectable.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Input id="address" required value={form.address} onChange={(e) => set("address", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                required
                value={form.latitude}
                onChange={(e) => set("latitude", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                required
                value={form.longitude}
                onChange={(e) => set("longitude", e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : editing ? "Save Changes" : "Add Facility"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
