"""
Every number the matching engine (app/services/matching_service.py) uses to
score a facility recommendation lives here, exactly as the spec requires:
"Make weights configurable in backend constants." Nothing in the scoring
function should have a bare numeric literal that isn't named here.
"""

# Must sum to 1.0 - enforced by a test in tests/test_matching.py.
MATCHING_WEIGHTS = {
    "compatibility": 0.40,
    "distance": 0.25,
    "capacity": 0.20,
    "utilization": 0.15,
}

# Distance beyond which a facility scores 0 on the distance component -
# collection becomes impractical for regional agricultural/municipal waste
# logistics past this range. Linear decay from 0km (100) to this (0).
MAX_MATCHING_DISTANCE_KM = 150.0

# Hard cutoff: candidates beyond this are dropped from /recommend entirely,
# not merely floored to a 0 distance score. Without this, a facility on the
# other side of the country (or a generator with a garbled lat/lng) still
# shows up ranked by its other three components, which reads as nonsensical
# ("3,099.8 km away, 66.9% match"). Set generously above MAX_MATCHING_DISTANCE_KM
# so it only excludes genuinely implausible pairings, not merely long hauls.
MAX_CANDIDATE_DISTANCE_KM = MAX_MATCHING_DISTANCE_KM * 3

# Only ACTIVE facilities are ever recommended - a facility under
# maintenance or marked inactive cannot actually accept a delivery.
MAX_RECOMMENDATIONS = 10

# Approximate Indian road-freight rate for bulk/agricultural cargo,
# rupees per tonne-km - used only as a rough transport-cost estimate for
# ranking and display, not a real logistics quote.
TRANSPORT_COST_PER_TONNE_KM = 8.0
