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

export type MatchStatus = "REQUESTED" | "COUNTERED" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";

/** Which side of a Match negotiation made a given offer/response. */
export type OfferParty = "GENERATOR" | "FACILITY";

/** One entry in a Match's negotiation thread (see MatchOffer). */
export type OfferAction = "REQUEST" | "COUNTER" | "ACCEPT" | "REJECT" | "WITHDRAW";

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
  /** A recommendation is only a preview - POST /recommend never persists
   * anything. Both non-null only if a request has already been sent (or
   * previously sent) to this facility for this waste record. */
  match_id: string | null;
  match_status: MatchStatus | null;
}

/** What POST /api/matching/request needs - the explicit "Send Request"
 * action on a recommendation card. */
export interface SendRequestPayload {
  waste_record_id: string;
  facility_id: string;
  offer_price?: number | null;
  offer_pickup_date?: string | null;
  note?: string | null;
}

/** Either side can propose different terms while a match is REQUESTED or
 * COUNTERED - POST /api/matching/{match_id}/counter. */
export interface CounterOfferPayload {
  offer_price?: number | null;
  offer_pickup_date?: string | null;
  note?: string | null;
}

/** One entry in a match's negotiation thread (GET /{match_id}/offers). */
export interface MatchOfferOut {
  id: string;
  offered_by: OfferParty;
  action: OfferAction;
  offer_price: number | null;
  offer_pickup_date: string | null;
  note: string | null;
  created_at: string;
}

/** A persisted Match row (GET /api/matching/{waste_id}, and the accept/
 * reject/counter/withdraw endpoints' response). */
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
  last_offer_by: OfferParty;
  offer_price: number | null;
  offer_pickup_date: string | null;
  offer_note: string | null;
  offer_round: number;
  created_at: string;
}

/** MatchOut plus the context both sides of a negotiation need - who's
 * offering what, and whose turn it is to respond. Returned by GET
 * /api/matching/pending (a facility operator's incoming requests), GET
 * /api/matching/accepted, and GET /api/matching/my-requests (a generator's
 * sent requests). */
export interface PendingMatchOut extends MatchOut {
  waste_type: WasteType;
  quantity_tonnes: number;
  generator_name: string;
  facility_type: FacilityType;
  /** True when it's the CALLER's turn to accept/reject/counter. */
  can_respond: boolean;
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
