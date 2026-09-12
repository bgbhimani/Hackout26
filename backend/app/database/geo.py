"""
Every conversion between (latitude, longitude) - what the API, forms, and
frontend use - and PostGIS Geography WKB - what the database stores -
happens here. Lives in `database/` rather than `services/` because models
need it too (for the `.latitude`/`.longitude` convenience properties on
WasteGenerator and Facility), and models must not depend on the services layer.
"""
from geoalchemy2.shape import from_shape, to_shape
from shapely.geometry import Point
from sqlalchemy import text
from sqlalchemy.orm import Session


def point_from_lat_lng(latitude: float, longitude: float):
    """Build a value suitable for a Geography(POINT) column. Note the
    (lng, lat) order Shapely/GeoJSON expect - the opposite of how the API
    and forms present the two fields, which is the single most common bug
    source in geospatial code; keep the flip contained to this function."""
    return from_shape(Point(longitude, latitude), srid=4326)


def lat_lng_from_point(point) -> tuple[float, float]:
    """Inverse of point_from_lat_lng - takes a geography value read back
    from the ORM and returns (latitude, longitude)."""
    shape = to_shape(point)
    return shape.y, shape.x


def build_distance_matrix_km(db: Session, points: list[tuple[float, float]]) -> list[list[float]]:
    """Real PostGIS geodesic distances (accurate on the WGS84 ellipsoid, not
    flat-earth haversine) between every pair of (lat, lng) points, in ONE
    round trip regardless of how many points there are - built via a
    CROSS JOIN over an unnested array rather than one query per pair, which
    matters on a database with real network latency (see docs/architecture.md
    on Neon connection cost). Used by route_service.py to build the OR-Tools
    distance matrix. Returns an N x N matrix, matrix[i][j] = km from
    points[i] to points[j] (0 on the diagonal)."""
    if len(points) < 2:
        return [[0.0] * len(points) for _ in points]

    ids = list(range(len(points)))
    lats = [p[0] for p in points]
    lngs = [p[1] for p in points]

    rows = db.execute(
        text(
            """
            WITH pts AS (
                SELECT * FROM unnest(:ids, :lats, :lngs) AS t(id, lat, lng)
            )
            SELECT a.id AS from_id, b.id AS to_id,
                   ST_Distance(
                       ST_SetSRID(ST_MakePoint(a.lng, a.lat), 4326)::geography,
                       ST_SetSRID(ST_MakePoint(b.lng, b.lat), 4326)::geography
                   ) / 1000.0 AS distance_km
            FROM pts a CROSS JOIN pts b
            """
        ),
        {"ids": ids, "lats": lats, "lngs": lngs},
    ).all()

    matrix = [[0.0] * len(points) for _ in points]
    for from_id, to_id, distance_km in rows:
        matrix[from_id][to_id] = float(distance_km)
    return matrix
