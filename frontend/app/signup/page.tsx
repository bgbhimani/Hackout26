"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Factory,
  Leaf,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Sprout,
  User as UserIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 via-background to-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center gap-2 text-center">
          <Link href="/login" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Leaf className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Waste-to-Carbon Value Chain Tracker
            </span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Create Your Account
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Two-step onboarding to join the circular carbon ecosystem
          </p>
        </div>

        {/* 2-Step Progress Indicator */}
        <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
          <div className="flex items-center justify-between">
            {/* Step 1 Pill */}
            <div
              onClick={() => {
                if (currentStep === 2) setCurrentStep(1);
              }}
              className={`flex items-center gap-2 cursor-pointer transition-opacity ${
                currentStep === 1 ? "opacity-100 font-semibold" : "opacity-75 hover:opacity-100"
              }`}
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  currentStep === 1
                    ? "bg-primary text-primary-foreground"
                    : "bg-emerald-600 text-white"
                }`}
              >
                {currentStep === 2 ? <Check className="h-4 w-4" /> : "1"}
              </div>
              <div>
                <p className="text-xs font-medium leading-none text-foreground">Step 1</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Role & Account</p>
              </div>
            </div>

            <div className="h-[2px] flex-1 mx-4 bg-border">
              <div
                className={`h-full transition-all duration-300 ${
                  currentStep === 2 ? "bg-primary w-full" : "w-0"
                }`}
              />
            </div>

            {/* Step 2 Pill */}
            <div
              className={`flex items-center gap-2 transition-opacity ${
                currentStep === 2 ? "opacity-100 font-semibold" : "opacity-50"
              }`}
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  currentStep === 2
                    ? selectedRole === "WASTE_GENERATOR"
                      ? "bg-emerald-600 text-white"
                      : "bg-blue-600 text-white"
                    : "bg-muted text-muted-foreground border border-border"
                }`}
              >
                2
              </div>
              <div>
                <p className="text-xs font-medium leading-none text-foreground">Step 2</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {selectedRole === "WASTE_GENERATOR" ? "Farm Profile" : "Plant Specs"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ================= STEP 1: ROLE & ACCOUNT CREDENTIALS ================= */}
        {currentStep === 1 && (
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Step 1: Choose Role & Enter Account Details</CardTitle>
              <CardDescription className="text-xs">
                Select your participant role in the network and create your login credentials.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleProceedToStep2} className="space-y-5">
                {/* Compact Role Selection */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">Select Your Participant Role</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Waste Generator Card */}
                    <div
                      onClick={() => setSelectedRole("WASTE_GENERATOR")}
                      className={`group relative flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
                        selectedRole === "WASTE_GENERATOR"
                          ? "border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/25 ring-1 ring-emerald-600 shadow-xs"
                          : "border-border bg-card hover:bg-muted/50 hover:border-muted-foreground/30"
                      }`}
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                          selectedRole === "WASTE_GENERATOR"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        }`}
                      >
                        <Sprout className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">Waste Generator</span>
                          {selectedRole === "WASTE_GENERATOR" && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          Farms, APMCs, Dairy & Agro-Food
                        </p>
                      </div>
                    </div>

                    {/* Facility Operator Card */}
                    <div
                      onClick={() => setSelectedRole("FACILITY_OPERATOR")}
                      className={`group relative flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
                        selectedRole === "FACILITY_OPERATOR"
                          ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/25 ring-1 ring-blue-600 shadow-xs"
                          : "border-border bg-card hover:bg-muted/50 hover:border-muted-foreground/30"
                      }`}
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                          selectedRole === "FACILITY_OPERATOR"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                        }`}
                      >
                        <Factory className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">Facility Operator</span>
                          {selectedRole === "FACILITY_OPERATOR" && (
                            <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          Biochar, Biogas & Conversion Plants
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Credentials */}
                <div className="space-y-3 rounded-lg border border-border/80 bg-muted/20 p-4">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <UserIcon className="h-3.5 w-3.5" />
                    <span>Your Contact & Login Credentials</span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="step1-name" className="text-xs font-medium">
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
                      <Label htmlFor="step1-email" className="text-xs font-medium">
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
                    <Label htmlFor="step1-password" className="text-xs font-medium">
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

                {/* Error Box */}
                {error && (
                  <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}

                {/* Next Step Button */}
                <Button type="submit" className="w-full gap-2 font-medium">
                  <span>Continue to Step 2: {selectedRole === "WASTE_GENERATOR" ? "Farm Details" : "Plant Specs"}</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ================= STEP 2: DETAILED ORGANIZATION & LOCATION ================= */}
        {currentStep === 2 && (
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    Step 2: {selectedRole === "WASTE_GENERATOR" ? "Farm & Waste Profile" : "Plant Capacity & Technology"}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Provide your site details and location coordinates for spatial matching and routing.
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs px-2.5 py-1 gap-1 ${
                    selectedRole === "WASTE_GENERATOR"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-500/30 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-blue-50 text-blue-700 border-blue-500/30 dark:bg-blue-950 dark:text-blue-300"
                  }`}
                >
                  {selectedRole === "WASTE_GENERATOR" ? <Sprout className="h-3.5 w-3.5" /> : <Factory className="h-3.5 w-3.5" />}
                  {name} ({email})
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmitStep2} className="space-y-5">
                {selectedRole === "WASTE_GENERATOR" ? (
                  /* ================= GENERATOR STEP 2 ================= */
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="step2-gen-name" className="text-xs font-medium">
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
                        <Label htmlFor="step2-gen-type" className="text-xs font-medium">
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
                      <Label htmlFor="step2-gen-phone" className="text-xs font-medium">
                        Contact Phone Number
                      </Label>
                      <div className="relative">
                        <Input
                          id="step2-gen-phone"
                          type="tel"
                          placeholder="e.g. +91 98250 12345"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                        <Phone className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="step2-gen-address" className="text-xs font-medium">
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
                    <div className="space-y-2 rounded-lg border border-border/80 bg-muted/20 p-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">
                          Geographic Coordinates (Lat / Lng) <span className="text-destructive">*</span>
                        </Label>
                        <button
                          type="button"
                          onClick={handleUseMyLocation}
                          className="flex items-center gap-1 text-[11px] text-emerald-600 hover:underline"
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

                      <div className="flex flex-wrap items-center gap-1 pt-1 text-[11px] text-muted-foreground">
                        <span>Quick presets:</span>
                        {LOCATION_PRESETS.map((p) => (
                          <button
                            key={p.name}
                            type="button"
                            onClick={() => applyPreset(p.lat, p.lng)}
                            className="rounded bg-muted px-1.5 py-0.5 text-[10px] hover:bg-muted/80 text-foreground"
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
                        <Label htmlFor="step2-fac-name" className="text-xs font-medium">
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
                        <Label htmlFor="step2-fac-type" className="text-xs font-medium">
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
                        <Label htmlFor="step2-fac-capacity" className="text-xs font-medium">
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
                        <Label htmlFor="step2-fac-load" className="text-xs font-medium">
                          Current Initial Load (Tonnes)
                        </Label>
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

                    {/* Accepted Feedstocks */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">
                          Accepted Feedstocks for {facilityType} <span className="text-destructive">*</span>
                        </Label>
                        <span className="text-[11px] text-muted-foreground">
                          {acceptedWasteTypes.length} selected
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {allowedWasteForFacility.map((wt) => {
                          const isSelected = acceptedWasteTypes.includes(wt);
                          return (
                            <button
                              key={wt}
                              type="button"
                              onClick={() => toggleWasteType(wt)}
                              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-colors border ${
                                isSelected
                                  ? "bg-blue-600 text-white border-blue-600 font-medium"
                                  : "bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                              }`}
                            >
                              {isSelected && <Check className="h-3 w-3" />}
                              {WASTE_TYPE_LABEL[wt]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="step2-fac-address" className="text-xs font-medium">
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
                    <div className="space-y-2 rounded-lg border border-border/80 bg-muted/20 p-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">
                          Geographic Coordinates (Lat / Lng) <span className="text-destructive">*</span>
                        </Label>
                        <button
                          type="button"
                          onClick={handleUseMyLocation}
                          className="flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
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

                      <div className="flex flex-wrap items-center gap-1 pt-1 text-[11px] text-muted-foreground">
                        <span>Quick presets:</span>
                        {LOCATION_PRESETS.map((p) => (
                          <button
                            key={p.name}
                            type="button"
                            onClick={() => applyPreset(p.lat, p.lng)}
                            className="rounded bg-muted px-1.5 py-0.5 text-[10px] hover:bg-muted/80 text-foreground"
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Box */}
                {error && (
                  <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}

                {/* Navigation Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setError(null);
                      setCurrentStep(1);
                    }}
                    className="gap-1 text-xs"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to Step 1
                  </Button>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className={`flex-1 text-white font-medium ${
                      selectedRole === "WASTE_GENERATOR"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {submitting
                      ? "Registering & Launching Portal..."
                      : selectedRole === "WASTE_GENERATOR"
                      ? "Complete Registration (Waste Generator)"
                      : "Complete Registration (Facility Operator)"}
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
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}
