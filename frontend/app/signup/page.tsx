"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Factory,
  Leaf,
  MapPin,
  Phone,
  Sprout,
  User as UserIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api";
import type { FacilityType, GeneratorType, WasteType } from "@/types";

type SignupRole = "WASTE_GENERATOR" | "FACILITY_OPERATOR";

const GENERATOR_TYPES: { value: GeneratorType; label: string; desc: string }[] = [
  { value: "FARM", label: "Agricultural Farm / Cooperative", desc: "Crop residue (straw, stalks, bagasse)" },
  { value: "FOOD_INDUSTRY", label: "Food & Dairy Processing Unit", desc: "Organic byproduct, spent grain, dairy waste" },
  { value: "MUNICIPALITY", label: "Municipal Urban Body / APMC", desc: "Segregated wet waste, market organic waste" },
  { value: "INDUSTRIAL", label: "Industrial Agro-Enterprise", desc: "High-volume biomass & manufacturing residue" },
];

const FACILITY_TYPES: { value: FacilityType; label: string; desc: string }[] = [
  { value: "BIOCHAR", label: "Biochar Pyrolysis Unit", desc: "Converts dry crop residue into stable carbon sink" },
  { value: "BIOGAS", label: "Biogas / CBG Anaerobic Plant", desc: "Digests manure & wet organic waste into green gas" },
  { value: "BIOMASS_CONVERSION", label: "Biomass Gasification & Power", desc: "Converts diverse woody & agro residues to energy" },
];

const COMPATIBILITY: Record<FacilityType, WasteType[]> = {
  BIOCHAR: ["RICE_STRAW", "WHEAT_STRAW", "COTTON_RESIDUE", "SUGARCANE_RESIDUE"],
  BIOGAS: ["ANIMAL_MANURE", "FOOD_WASTE", "ORGANIC_WASTE"],
  BIOMASS_CONVERSION: ["RICE_STRAW", "WHEAT_STRAW", "COTTON_RESIDUE", "SUGARCANE_RESIDUE", "ORGANIC_WASTE"],
};

const WASTE_TYPE_LABEL: Record<WasteType, string> = {
  RICE_STRAW: "Rice Straw (Agro)",
  WHEAT_STRAW: "Wheat Straw (Agro)",
  COTTON_RESIDUE: "Cotton Residue (Agro)",
  SUGARCANE_RESIDUE: "Sugarcane Residue / Bagasse",
  FOOD_WASTE: "Food & Market Waste",
  ORGANIC_WASTE: "General Organic Waste",
  ANIMAL_MANURE: "Dairy & Animal Manure",
};

const LOCATION_PRESETS = [
  { name: "Charotar Belt (Kheda)", lat: 22.75, lng: 72.68 },
  { name: "Amul Belt (Anand)", lat: 22.56, lng: 72.95 },
  { name: "Mehsana Dairy Hub", lat: 23.6, lng: 72.4 },
  { name: "Ahmedabad Industrial", lat: 23.02, lng: 72.57 },
];

export default function SignupPage() {
  const { registerGenerator, registerFacility } = useAuth();

  // Multi-step wizard state
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<SignupRole>("WASTE_GENERATOR");

  // Step 1 fields (Account credentials)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2 fields - Generator specific
  const [generatorName, setGeneratorName] = useState("");
  const [generatorType, setGeneratorType] = useState<GeneratorType>("FARM");
  const [phone, setPhone] = useState("");
  const [generatorAddress, setGeneratorAddress] = useState("");
  const [generatorLat, setGeneratorLat] = useState("22.56");
  const [generatorLng, setGeneratorLng] = useState("72.95");

  // Step 2 fields - Facility specific
  const [facilityName, setFacilityName] = useState("");
  const [facilityType, setFacilityType] = useState<FacilityType>("BIOCHAR");
  const [capacityTonnes, setCapacityTonnes] = useState("500");
  const [currentLoadTonnes, setCurrentLoadTonnes] = useState("0");
  const [acceptedWasteTypes, setAcceptedWasteTypes] = useState<WasteType[]>([
    "RICE_STRAW",
    "WHEAT_STRAW",
    "COTTON_RESIDUE",
  ]);
  const [facilityAddress, setFacilityAddress] = useState("");
  const [facilityLat, setFacilityLat] = useState("22.75");
  const [facilityLng, setFacilityLng] = useState("72.68");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Toggle waste type compatibility for facility
  const handleFacilityTypeChange = (newType: FacilityType) => {
    setFacilityType(newType);
    const allowed = COMPATIBILITY[newType] || [];
    setAcceptedWasteTypes(allowed);
  };

  const toggleWasteType = (wt: WasteType) => {
    if (acceptedWasteTypes.includes(wt)) {
      if (acceptedWasteTypes.length === 1) return; // keep at least 1
      setAcceptedWasteTypes(acceptedWasteTypes.filter((t) => t !== wt));
    } else {
      setAcceptedWasteTypes([...acceptedWasteTypes, wt]);
    }
  };

  // Get current browser location
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(4);
        const lng = pos.coords.longitude.toFixed(4);
        if (selectedRole === "WASTE_GENERATOR") {
          setGeneratorLat(lat);
          setGeneratorLng(lng);
        } else {
          setFacilityLat(lat);
          setFacilityLng(lng);
        }
      },
      () => {
        setError("Unable to retrieve your location. Please enter coordinates manually.");
      }
    );
  };

  const applyPreset = (lat: number, lng: number) => {
    if (selectedRole === "WASTE_GENERATOR") {
      setGeneratorLat(lat.toString());
      setGeneratorLng(lng.toString());
    } else {
      setFacilityLat(lat.toString());
      setFacilityLng(lng.toString());
    }
  };

  // Step 1 Validation & Proceed
  const handleProceedToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    // Autofill default farm/plant name if empty
    if (selectedRole === "WASTE_GENERATOR" && !generatorName) {
      setGeneratorName(`${name.trim()}'s Farm`);
    } else if (selectedRole === "FACILITY_OPERATOR" && !facilityName) {
      setFacilityName(`${name.trim()}'s Conversion Plant`);
    }

    setCurrentStep(2);
  };

  // Final Step 2 Submission
  async function handleSubmitStep2(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (selectedRole === "WASTE_GENERATOR") {
        if (!generatorName.trim()) throw new Error("Please enter your Farm / Entity name.");
        if (!generatorAddress.trim()) throw new Error("Please enter your physical address.");

        const lat = parseFloat(generatorLat);
        const lng = parseFloat(generatorLng);
        if (isNaN(lat) || lat < -90 || lat > 90) throw new Error("Latitude must be between -90 and 90.");
        if (isNaN(lng) || lng < -180 || lng > 180) throw new Error("Longitude must be between -180 and 180.");

        await registerGenerator({
          name: name.trim(),
          email: email.trim(),
          password,
          generator_name: generatorName.trim(),
          generator_type: generatorType,
          phone: phone.trim() || undefined,
          address: generatorAddress.trim(),
          latitude: lat,
          longitude: lng,
        });
      } else {
        if (!facilityName.trim()) throw new Error("Please enter your Facility / Plant name.");
        if (!facilityAddress.trim()) throw new Error("Please enter the facility physical address.");

        const lat = parseFloat(facilityLat);
        const lng = parseFloat(facilityLng);
        const cap = parseFloat(capacityTonnes);
        const load = parseFloat(currentLoadTonnes) || 0;

        if (isNaN(lat) || lat < -90 || lat > 90) throw new Error("Latitude must be between -90 and 90.");
        if (isNaN(lng) || lng < -180 || lng > 180) throw new Error("Longitude must be between -180 and 180.");
        if (isNaN(cap) || cap <= 0) throw new Error("Capacity must be greater than 0 tonnes.");
        if (load > cap) throw new Error("Current initial load cannot exceed total capacity.");
        if (acceptedWasteTypes.length === 0) throw new Error("Please select at least one accepted feedstock.");

        await registerFacility({
          name: name.trim(),
          email: email.trim(),
          password,
          facility_name: facilityName.trim(),
          facility_type: facilityType,
          capacity_tonnes: cap,
          current_load_tonnes: load,
          accepted_waste_types: acceptedWasteTypes,
          address: facilityAddress.trim(),
          latitude: lat,
          longitude: lng,
        });
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Registration failed. Please check your details."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const allowedWasteForFacility = COMPATIBILITY[facilityType] || [];
  const isGenerator = selectedRole === "WASTE_GENERATOR";
  const roleAccent = isGenerator ? "text-primary" : "text-accent-foreground";

  return (
    <div className="h-screen overflow-hidden bg-background p-3 sm:p-4 lg:p-5">
      <div className="flex h-full flex-col lg:flex-row lg:gap-4">
      {/* ── Left: signup wizard ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-4 sm:px-8 lg:px-12 xl:px-14">
      <div className="w-full space-y-3">
        {/* Brand header */}
        <div className="space-y-1">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Leaf className="h-4.5 w-4.5" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Waste-to-Carbon Value Chain Tracker
            </span>
          </Link>
          <h1 className="mt-1.5 text-xl font-bold tracking-tight text-foreground sm:text-2xl">Create Your Account</h1>
          <p className="text-sm text-muted-foreground">Two-step onboarding to join the circular carbon ecosystem</p>
        </div>

        {/* Step indicator */}
        <div className="rounded-xl border border-border bg-card p-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => currentStep === 2 && setCurrentStep(1)}
              className={cn(
                "flex items-center gap-2.5 text-left transition-opacity",
                currentStep === 1 ? "opacity-100" : "opacity-60 hover:opacity-100"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  currentStep === 2 ? "bg-primary text-primary-foreground" : "bg-primary text-primary-foreground"
                )}
              >
                {currentStep === 2 ? <Check className="h-4 w-4" /> : "1"}
              </div>
              <div>
                <p className="text-xs font-semibold leading-none text-foreground">Step 1</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Role &amp; Account</p>
              </div>
            </button>

            <div className="mx-4 h-[2px] flex-1 bg-border">
              <div
                className={cn("h-full bg-primary transition-all duration-300", currentStep === 2 ? "w-full" : "w-0")}
              />
            </div>

            <div
              className={cn(
                "flex items-center gap-2.5 transition-opacity",
                currentStep === 2 ? "opacity-100" : "opacity-50"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  currentStep === 2 ? "bg-primary text-primary-foreground" : "border border-border bg-muted text-muted-foreground"
                )}
              >
                2
              </div>
              <div>
                <p className="text-xs font-semibold leading-none text-foreground">Step 2</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {isGenerator ? "Farm Profile" : "Plant Specs"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ================= STEP 1: ROLE & ACCOUNT CREDENTIALS ================= */}
        {currentStep === 1 && (
          <Card className="border-border shadow-sm">
            <CardHeader className="p-3.5 pb-1.5">
              <CardTitle className="text-base">Choose Role &amp; Enter Account Details</CardTitle>
            </CardHeader>

            <CardContent className="p-3.5 pt-1.5">
              <form onSubmit={handleProceedToStep2} className="space-y-3">
                {/* Role selection */}
                <div className="space-y-2">
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRole("WASTE_GENERATOR")}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-3 text-left transition-all",
                        isGenerator
                          ? "border-primary bg-primary-light ring-1 ring-primary"
                          : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/50"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                          isGenerator ? "bg-primary text-primary-foreground" : "bg-primary-light text-primary"
                        )}
                      >
                        <Sprout className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-foreground">Waste Generator</span>
                          {isGenerator && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">Farms, APMCs, Dairy &amp; Agro-Food</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedRole("FACILITY_OPERATOR")}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-3 text-left transition-all",
                        !isGenerator
                          ? "border-accent bg-accent-light ring-1 ring-accent"
                          : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/50"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                          !isGenerator ? "bg-accent text-accent-foreground" : "bg-accent-light text-accent-foreground"
                        )}
                      >
                        <Factory className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-foreground">Facility Operator</span>
                          {!isGenerator && <CheckCircle2 className="h-4 w-4 shrink-0 text-accent-foreground" />}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">Biochar, Biogas &amp; Conversion Plants</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Account credentials */}
                <div className="space-y-2.5 rounded-lg border border-border bg-muted/30 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <UserIcon className="h-3.5 w-3.5" />
                    Your Contact &amp; Login Credentials
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="step1-name">
                        Your Full Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="step1-name"
                        required
                        placeholder="e.g. Ramesh Patel"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="step1-email">
                        Email Address <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="step1-email"
                        type="email"
                        required
                        placeholder="e.g. ramesh@farmcoop.in"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="step1-password">
                      Password <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="step1-password"
                      type="password"
                      required
                      minLength={6}
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                {error && (
                  <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}

                <Button type="submit" size="lg" className="w-full gap-2">
                  Continue to Step 2: {isGenerator ? "Farm Details" : "Plant Specs"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ================= STEP 2: DETAILED ORGANIZATION & LOCATION ================= */}
        {currentStep === 2 && (
          <Card className="border-border shadow-sm">
            <CardHeader className="p-4 pb-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{isGenerator ? "Farm & Waste Profile" : "Plant Capacity & Technology"}</CardTitle>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "gap-1.5 border-transparent px-2.5 py-1 text-xs",
                    isGenerator ? "bg-primary-light text-primary" : "bg-accent-light text-accent-foreground"
                  )}
                >
                  {isGenerator ? <Sprout className="h-3.5 w-3.5" /> : <Factory className="h-3.5 w-3.5" />}
                  {name} ({email})
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-2">
              <form onSubmit={handleSubmitStep2} className="space-y-4">
                {isGenerator ? (
                  /* ================= GENERATOR STEP 2 ================= */
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="step2-gen-name">
                          Farm / Entity Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="step2-gen-name"
                          required
                          placeholder="e.g. Charotar Agro Cooperative"
                          value={generatorName}
                          onChange={(e) => setGeneratorName(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="step2-gen-type">
                          Generator Category <span className="text-destructive">*</span>
                        </Label>
                        <SelectNative
                          id="step2-gen-type"
                          value={generatorType}
                          onChange={(e) => setGeneratorType(e.target.value as GeneratorType)}
                        >
                          {GENERATOR_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </SelectNative>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="step2-gen-phone">Contact Phone Number</Label>
                      <div className="relative">
                        <Input
                          id="step2-gen-phone"
                          type="tel"
                          placeholder="e.g. +91 98250 12345"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="pr-9"
                        />
                        <Phone className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="step2-gen-address">
                        Physical Farm / Facility Address <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="step2-gen-address"
                        required
                        placeholder="e.g. Survey No. 42, Anand-Kheda State Highway, Gujarat"
                        value={generatorAddress}
                        onChange={(e) => setGeneratorAddress(e.target.value)}
                      />
                    </div>

                    {/* Coordinates */}
                    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Label>
                          Geographic Coordinates (Lat / Lng) <span className="text-destructive">*</span>
                        </Label>
                        <button
                          type="button"
                          onClick={handleUseMyLocation}
                          className={cn("flex items-center gap-1 text-xs font-medium hover:underline", roleAccent)}
                        >
                          <MapPin className="h-3 w-3" />
                          Use GPS Location
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          required
                          type="number"
                          step="any"
                          placeholder="Latitude (e.g. 22.56)"
                          value={generatorLat}
                          onChange={(e) => setGeneratorLat(e.target.value)}
                        />
                        <Input
                          required
                          type="number"
                          step="any"
                          placeholder="Longitude (e.g. 72.95)"
                          value={generatorLng}
                          onChange={(e) => setGeneratorLng(e.target.value)}
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-muted-foreground">
                        <span>Quick presets:</span>
                        {LOCATION_PRESETS.map((p) => (
                          <button
                            key={p.name}
                            type="button"
                            onClick={() => applyPreset(p.lat, p.lng)}
                            className="rounded-md bg-card px-2 py-1 text-[11px] text-foreground shadow-sm hover:bg-muted"
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ================= FACILITY STEP 2 ================= */
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="step2-fac-name">
                          Plant / Facility Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="step2-fac-name"
                          required
                          placeholder="e.g. Gujarat Biochar Energy Hub"
                          value={facilityName}
                          onChange={(e) => setFacilityName(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="step2-fac-type">
                          Conversion Technology <span className="text-destructive">*</span>
                        </Label>
                        <SelectNative
                          id="step2-fac-type"
                          value={facilityType}
                          onChange={(e) => handleFacilityTypeChange(e.target.value as FacilityType)}
                        >
                          {FACILITY_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </SelectNative>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="step2-fac-capacity">
                          Rated Capacity (Tonnes) <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="step2-fac-capacity"
                          type="number"
                          required
                          min={1}
                          step="any"
                          placeholder="e.g. 500"
                          value={capacityTonnes}
                          onChange={(e) => setCapacityTonnes(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="step2-fac-load">Current Initial Load (Tonnes)</Label>
                        <Input
                          id="step2-fac-load"
                          type="number"
                          min={0}
                          step="any"
                          placeholder="e.g. 0"
                          value={currentLoadTonnes}
                          onChange={(e) => setCurrentLoadTonnes(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Accepted feedstocks */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>
                          Accepted Feedstocks for {facilityType} <span className="text-destructive">*</span>
                        </Label>
                        <span className="text-xs text-muted-foreground">{acceptedWasteTypes.length} selected</span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {allowedWasteForFacility.map((wt) => {
                          const isSelected = acceptedWasteTypes.includes(wt);
                          return (
                            <button
                              key={wt}
                              type="button"
                              onClick={() => toggleWasteType(wt)}
                              className={cn(
                                "flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors",
                                isSelected
                                  ? "border-accent bg-accent text-accent-foreground font-medium"
                                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                              )}
                            >
                              {isSelected && <Check className="h-3 w-3" />}
                              {WASTE_TYPE_LABEL[wt]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="step2-fac-address">
                        Plant Address <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="step2-fac-address"
                        required
                        placeholder="e.g. GIDC Industrial Area, Phase II, Vatva, Ahmedabad"
                        value={facilityAddress}
                        onChange={(e) => setFacilityAddress(e.target.value)}
                      />
                    </div>

                    {/* Coordinates */}
                    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Label>
                          Geographic Coordinates (Lat / Lng) <span className="text-destructive">*</span>
                        </Label>
                        <button
                          type="button"
                          onClick={handleUseMyLocation}
                          className={cn("flex items-center gap-1 text-xs font-medium hover:underline", roleAccent)}
                        >
                          <MapPin className="h-3 w-3" />
                          Use GPS Location
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          required
                          type="number"
                          step="any"
                          placeholder="Latitude (e.g. 22.75)"
                          value={facilityLat}
                          onChange={(e) => setFacilityLat(e.target.value)}
                        />
                        <Input
                          required
                          type="number"
                          step="any"
                          placeholder="Longitude (e.g. 72.68)"
                          value={facilityLng}
                          onChange={(e) => setFacilityLng(e.target.value)}
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-muted-foreground">
                        <span>Quick presets:</span>
                        {LOCATION_PRESETS.map((p) => (
                          <button
                            key={p.name}
                            type="button"
                            onClick={() => applyPreset(p.lat, p.lng)}
                            className="rounded-md bg-card px-2 py-1 text-[11px] text-foreground shadow-sm hover:bg-muted"
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}

                <div className="flex items-center gap-3 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setError(null);
                      setCurrentStep(1);
                    }}
                    className="gap-1.5"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                  </Button>

                  <Button type="submit" size="lg" disabled={submitting} className="flex-1">
                    {submitting
                      ? "Registering & launching portal..."
                      : `Complete Registration (${isGenerator ? "Waste Generator" : "Facility Operator"})`}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Existing account link */}
        <div className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Sign in here
          </Link>
        </div>
      </div>
      </div>

      {/* ── Right: brand panel (hidden below lg) - the left column scrolls
           internally (overflow-y-auto above) so the page itself never
           grows a scrollbar, and this panel stays fully visible at a fixed
           height the whole time. ─────────────────────────────────────── */}
      <div className="relative hidden overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-primary to-[#2f4d37] lg:flex lg:w-[38%] lg:flex-col lg:p-10">
        <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-accent/30 blur-3xl" />

        <div className="relative flex flex-1 flex-col">
          <Badge className="w-fit border border-white/25 bg-white/10 text-white backdrop-blur">
            Circular Carbon Ecosystem
          </Badge>

          <div className="flex flex-1 flex-col items-start justify-center gap-5 py-8 text-white">
            <h2 className="text-4xl font-bold leading-tight">Join the Circular Carbon Network</h2>
            <div className="h-px w-16 bg-white/40" />
            <p className="max-w-sm text-sm leading-relaxed text-white/80">
              Whether you generate agricultural or municipal waste, or operate a biochar, biogas, or
              biomass facility - register once to get matched, routed, and measured across the network.
            </p>
            <Button asChild size="lg" className="rounded-full bg-white px-6 text-foreground shadow-lg hover:bg-white/90">
              <Link href="/" className="flex items-center gap-2">
                Back to Home
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <p className="text-xs text-white/60">Team Gentalmen · HackOut&apos;26 at DAIICT</p>
        </div>
      </div>
      </div>
    </div>
  );
}
