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
import type { Generator, GeneratorType } from "@/types";

const GENERATOR_TYPES: GeneratorType[] = ["FARM", "FOOD_INDUSTRY", "MUNICIPALITY", "INDUSTRIAL"];

interface FormState {
  name: string;
  generator_type: GeneratorType;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
  latitude: string;
  longitude: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  generator_type: "FARM",
  contact_name: "",
  phone: "",
  email: "",
  address: "",
  latitude: "",
  longitude: "",
};

function generatorToForm(g: Generator): FormState {
  return {
    name: g.name,
    generator_type: g.generator_type,
    contact_name: g.contact_name ?? "",
    phone: g.phone ?? "",
    email: g.email ?? "",
    address: g.address,
    latitude: g.latitude.toString(),
    longitude: g.longitude.toString(),
  };
}

export function GeneratorFormDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = "add" mode; a Generator = "edit" mode */
  editing: Generator | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(editing ? generatorToForm(editing) : EMPTY_FORM);
      setError(null);
    }
  }, [open, editing]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const lat = Number(form.latitude);
    const lng = Number(form.longitude);
    if (Number.isNaN(lat) || lat < -90 || lat > 90 || Number.isNaN(lng) || lng < -180 || lng > 180) {
      setError("Latitude must be -90..90 and longitude -180..180.");
      setSaving(false);
      return;
    }

    const payload = {
      name: form.name,
      generator_type: form.generator_type,
      contact_name: form.contact_name || null,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address,
      latitude: lat,
      longitude: lng,
    };

    try {
      if (editing) {
        await apiFetch(`/api/generators/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await apiFetch("/api/generators", { method: "POST", body: JSON.stringify(payload) });
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save generator");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Generator" : "Add Generator"}</DialogTitle>
          <DialogDescription>
            {editing ? "Update this waste generator's details." : "Register a new waste generator."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" required value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="generator_type">Generator Type</Label>
              <SelectNative
                id="generator_type"
                value={form.generator_type}
                onChange={(e) => set("generator_type", e.target.value as GeneratorType)}
              >
                {GENERATOR_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace("_", " ")}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact_name">Contact Name</Label>
              <Input id="contact_name" value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
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
              {saving ? "Saving..." : editing ? "Save Changes" : "Add Generator"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
