/**
 * Shared frontend types. Mirrors the backend enums in
 * backend/app/constants/enums.py - keep the two in sync by hand for now;
 * generating these from the OpenAPI schema is a reasonable Phase 10 upgrade
 * but is unnecessary complexity for a hackathon MVP.
 */

export type UserRole = "ADMIN" | "WASTE_GENERATOR" | "FACILITY_OPERATOR";

export type GeneratorType = "FARM" | "FOOD_INDUSTRY" | "MUNICIPALITY" | "INDUSTRIAL";

export type WasteType =
  | "RICE_STRAW"
  | "WHEAT_STRAW"
  | "COTTON_RESIDUE"
  | "SUGARCANE_RESIDUE"
  | "FOOD_WASTE"
  | "ORGANIC_WASTE"
  | "ANIMAL_MANURE";

export type WasteStatus = "AVAILABLE" | "PENDING" | "COLLECTED" | "PROCESSED";

export type MatchStatus = "RECOMMENDED" | "ACCEPTED" | "REJECTED";

export type FacilityType = "BIOCHAR" | "BIOGAS" | "BIOMASS_CONVERSION";

export type FacilityStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface WasteGeneratorSignupPayload {
  name: string;
  email: string;
  password: string;
  generator_name: string;
  generator_type: GeneratorType;
  phone?: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface FacilityOperatorSignupPayload {
  name: string;
  email: string;
  password: string;
  facility_name: string;
  facility_type: FacilityType;
  capacity_tonnes: number;
  current_load_tonnes?: number;
  accepted_waste_types: WasteType[];
  address: string;
  latitude: number;
  longitude: number;
}

export interface Generator {
  id: string;
  name: string;
  generator_type: GeneratorType;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string;
  latitude: number;
  longitude: number;
  created_at: string;
  updated_at: string;
}

export interface Facility {
  id: string;
  name: string;
  facility_type: FacilityType;
  capacity_tonnes: number;
  current_load_tonnes: number;
  utilization_percent: number;
  accepted_waste_types: WasteType[];
  address: string;
  latitude: number;
  longitude: number;
  status: FacilityStatus;
  created_at: string;
  updated_at: string;
}

export interface ScoreBreakdown {
  compatibility: number;
  distance: number;
  capacity: number;
  utilization: number;
}

export interface FacilityRecommendation {
  facility_id: string;
  facility_name: string;
  facility_type: FacilityType;
  match_score: number;
  distance_km: number;
  available_capacity_tonnes: number;
  accepted_waste_types: WasteType[];
  estimated_transport_cost: number;
  reasons: string[];
  score_breakdown: ScoreBreakdown;
  /** The persisted Match row this recommendation was saved as (always
   * RECOMMENDED at this point) - only the facility operator can act on it,
   * via POST /api/matching/{match_id}/accept|reject. */
  match_id: string | null;
}

/** A persisted Match row (GET /api/matching/{waste_id}, and the accept/
 * reject endpoints' response). */
export interface MatchOut {
  id: string;
  waste_record_id: string;
  facility_id: string;
  facility_name: string;
  compatibility_score: number;
  distance_km: number;
  estimated_transport_cost: number;
  reasons: string[];
  status: MatchStatus;
  created_at: string;
}

/** MatchOut plus the waste-side context a facility operator needs to decide
 * whether to accept - who's offering what. Returned by GET /api/matching/
 * pending (RECOMMENDED, awaiting a decision) and GET /api/matching/accepted
 * (ACCEPTED, awaiting a route). */
export interface PendingMatchOut extends MatchOut {
  waste_type: WasteType;
  quantity_tonnes: number;
  generator_name: string;
}

export interface CarbonRecord {
  id: string;
  waste_record_id: string;
  facility_id: string;
  facility_name: string;
  waste_type: WasteType;
  waste_quantity_tonnes: number;
  conversion_type: FacilityType;
  conversion_output_tonnes: number;
  carbon_content_percent: number;
  estimated_sequestered_co2_tonnes: number;
  transport_emissions_tonnes: number;
  net_co2_impact_tonnes: number;
  methodology_note: string;
  created_at: string;
}

export interface ForecastResult {
  predicted_quantity_tonnes: number;
  confidence: number;
  model: string;
}

export interface ForecastRecord {
  id: string;
  generator_id: string;
  waste_type: WasteType;
  forecast_date: string;
  predicted_quantity_tonnes: number;
  confidence: number;
  model_name: string;
  created_at: string;
}

export interface RouteStop {
  stop_order: number;
  generator_id: string;
  generator_name: string;
  latitude: number;
  longitude: number;
  quantity_tonnes: number;
  waste_record_ids: string[];
}

export interface DroppedStop {
  generator_id: string;
  generator_name: string;
  quantity_tonnes: number;
  reason: string;
}

export interface OptimizedRoute {
  id: string;
  facility_id: string;
  facility_name: string;
  vehicle_capacity_tonnes: number;
  total_distance_km: number;
  estimated_transport_cost: number;
  total_waste_tonnes: number;
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED";
  stops: RouteStop[];
  path: [number, number][];
  dropped_stops: DroppedStop[];
  facility_capacity_warning: string | null;
  created_at: string;
}

export interface WasteRecordWithGenerator {
  id: string;
  generator_id: string;
  waste_type: WasteType;
  quantity_tonnes: number;
  moisture_percent: number | null;
  available_from: string;
  available_until: string | null;
  status: WasteStatus;
  generator_name: string;
  generator_type: string;
  latitude: number;
  longitude: number;
}

export interface DashboardSummary {
  total_waste_available_tonnes: number;
  waste_diverted_tonnes: number;
  active_facilities: number;
  active_routes: number;
  estimated_co2_impact_tonnes: number;
}

export interface MonthlyQuantity {
  month: string;
  quantity_tonnes: number;
}

export interface WasteTypeQuantity {
  waste_type: WasteType;
  quantity_tonnes: number;
}

export interface FacilityUtilizationPoint {
  facility_name: string;
  utilization_percent: number;
}

export interface MonthlyCarbonImpact {
  month: string;
  net_co2_impact_tonnes: number;
}

export interface DashboardAnalytics {
  waste_availability_over_time: MonthlyQuantity[];
  waste_by_type: WasteTypeQuantity[];
  waste_diverted_over_time: MonthlyQuantity[];
  facility_utilization: FacilityUtilizationPoint[];
  carbon_impact_over_time: MonthlyCarbonImpact[];
}
