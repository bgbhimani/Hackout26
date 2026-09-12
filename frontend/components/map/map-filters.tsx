"use client";

import { cn } from "@/lib/utils";
import type { FacilityType, GeneratorType, WasteStatus, WasteType } from "@/types";

const WASTE_TYPES: WasteType[] = [
  "RICE_STRAW",
  "WHEAT_STRAW",
  "COTTON_RESIDUE",
  "SUGARCANE_RESIDUE",
  "FOOD_WASTE",
  "ORGANIC_WASTE",
  "ANIMAL_MANURE",
];
const GENERATOR_TYPES: GeneratorType[] = ["FARM", "FOOD_INDUSTRY", "MUNICIPALITY", "INDUSTRIAL"];
const FACILITY_TYPES: FacilityType[] = ["BIOCHAR", "BIOGAS", "BIOMASS_CONVERSION"];
// Covers both the spec's "Availability" and "Status" filters - AVAILABLE is
// the availability signal, the rest give finer-grained status control.
const WASTE_STATUSES: WasteStatus[] = ["AVAILABLE", "PENDING", "COLLECTED", "PROCESSED"];

const LABEL: Record<string, string> = {
  RICE_STRAW: "Rice Straw",
  WHEAT_STRAW: "Wheat Straw",
  COTTON_RESIDUE: "Cotton Residue",
  SUGARCANE_RESIDUE: "Sugarcane Residue",
  FOOD_WASTE: "Food Waste",
  ORGANIC_WASTE: "Organic Waste",
  ANIMAL_MANURE: "Animal Manure",
  FARM: "Farm",
  FOOD_INDUSTRY: "Food Industry",
  MUNICIPALITY: "Municipality",
  INDUSTRIAL: "Industrial",
  BIOCHAR: "Biochar",
  BIOGAS: "Biogas",
  BIOMASS_CONVERSION: "Biomass Conversion",
  AVAILABLE: "Available",
  PENDING: "Pending",
  COLLECTED: "Collected",
  PROCESSED: "Processed",
};

export interface MapFilterState {
  wasteTypes: WasteType[];
  generatorTypes: GeneratorType[];
  facilityTypes: FacilityType[];
  statuses: WasteStatus[];
  showRoutes: boolean;
}

export const EMPTY_FILTERS: MapFilterState = {
  wasteTypes: [],
  generatorTypes: [],
  facilityTypes: [],
  statuses: [],
  showRoutes: true,
};

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function FilterGroup<T extends string>({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: T[];
  selected: T[];
  onChange: (next: T[]) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(toggle(selected, opt))}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition-colors",
                active
                  ? "border-primary bg-primary-light text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              )}
            >
              {LABEL[opt] ?? opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function MapFilters({
  value,
  onChange,
  hideGeneratorType = false,
  hideFacilityType = false,
  routeCount,
  routeVisibility = "none-exist",
}: {
  value: MapFilterState;
  onChange: (next: MapFilterState) => void;
  /** No generator markers render for a Waste Generator's map (see
   * map/page.tsx), so neither "Generator Type" nor "Availability / Status"
   * (which only ever affects which generators show, and the now-hidden
   * "Available Waste" KPI) has anything left to filter for that role. */
  hideGeneratorType?: boolean;
  /** Only a Facility Operator's own facility (or facilities) render on
   * their map (see map/page.tsx) - filtering by Facility Type among just
   * your own has nothing left to narrow down. */
  hideFacilityType?: boolean;
  /** How many optimized routes are actually visible right now (after the
   * Waste/Facility Type filters above - routes are filtered exactly like
   * everything else, no exceptions). */
  routeCount?: number;
  /** Distinguishes "zero routes exist at all" from "routes exist, but your
   * current filter hides them" - shown next to "Show optimized routes" so
   * an empty map with the box checked always reads as intentional, never as
   * "this is broken," whichever of the two it actually is. */
  routeVisibility?: "none-exist" | "hidden-by-filter" | "visible";
}) {
  return (
    <div className="space-y-4 rounded-md border border-border bg-card p-4">
      <div
        className={cn(
          "grid grid-cols-1 gap-4 sm:grid-cols-2",
          !hideGeneratorType && !hideFacilityType && "lg:grid-cols-4"
        )}
      >
        <FilterGroup
          label="Waste Type"
          options={WASTE_TYPES}
          selected={value.wasteTypes}
          onChange={(wasteTypes) => onChange({ ...value, wasteTypes })}
        />
        {!hideGeneratorType && (
          <FilterGroup
            label="Generator Type"
            options={GENERATOR_TYPES}
            selected={value.generatorTypes}
            onChange={(generatorTypes) => onChange({ ...value, generatorTypes })}
          />
        )}
        {!hideFacilityType && (
          <FilterGroup
            label="Facility Type"
            options={FACILITY_TYPES}
            selected={value.facilityTypes}
            onChange={(facilityTypes) => onChange({ ...value, facilityTypes })}
          />
        )}
        {!hideGeneratorType && (
          <FilterGroup
            label="Availability / Status"
            options={WASTE_STATUSES}
            selected={value.statuses}
            onChange={(statuses) => onChange({ ...value, statuses })}
          />
        )}
      </div>
      <label className="flex w-fit cursor-pointer items-center gap-2 border-t border-border pt-3 text-sm text-foreground">
        <input
          type="checkbox"
          checked={value.showRoutes}
          onChange={(e) => onChange({ ...value, showRoutes: e.target.checked })}
          className="accent-primary"
        />
        Show optimized routes
        {routeCount !== undefined && (
          <span className="text-xs text-muted-foreground">
            {routeVisibility === "hidden-by-filter"
              ? "(hidden by your current filter)"
              : routeVisibility === "none-exist"
              ? "(none planned yet)"
              : `(${routeCount})`}
          </span>
        )}
      </label>
    </div>
  );
}
