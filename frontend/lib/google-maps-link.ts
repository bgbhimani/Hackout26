/**
 * Turns a pasted Google Maps link (or raw "lat, lng" text) into coordinates,
 * so users can locate a farm/facility by pasting a link instead of hunting
 * for latitude/longitude themselves.
 *
 * Google Maps URLs embed the coordinates in a handful of well-known shapes
 * (reverse-engineered from what Maps actually produces - there's no public
 * spec for the URL format):
 *
 *   .../place/Some+Place/@22.5645,72.9289,17z/data=...!3d22.5650!4d72.9295
 *                                  ^ viewport center      ^ exact place pin (preferred when present)
 *   .../@22.5645,72.9289,15z                              (plain map view, no place)
 *   ?q=22.5645,72.9289  /  ?query=22.5645,72.9289  /  &ll=22.5645,72.9289
 *   "22.5645, 72.9289"                                    (copied via Maps' "Copy coordinates")
 *
 * Shortened links (maps.app.goo.gl/..., goo.gl/maps/...) don't contain any
 * of this - they only reveal it after an HTTP redirect, which the browser
 * can't read cross-origin. Expand those first via the backend
 * (/api/geocode/expand-url, see resolveMapsLink in lib/api.ts) and parse the
 * result this function returns.
 */

export interface LatLng {
  latitude: number;
  longitude: number;
}

const SHORT_LINK_HOSTS = new Set(["maps.app.goo.gl", "goo.gl", "g.co"]);

function isValidLatLng(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  );
}

/** Shortened Maps links redirect before revealing any coordinates - the
 * caller needs to expand them server-side before parseGoogleMapsLink can
 * find anything. */
export function isShortGoogleMapsLink(input: string): boolean {
  try {
    const host = new URL(input.trim()).hostname.replace(/^www\./, "");
    return SHORT_LINK_HOSTS.has(host);
  } catch {
    return false;
  }
}

/** True for anything that at least looks like a Google Maps URL or a raw
 * "lat, lng" pair - used to decide whether to even attempt parsing/expansion
 * rather than silently doing nothing on unrelated pasted text. */
export function looksLikeMapsInput(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  if (/^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(trimmed)) return true;
  try {
    const host = new URL(trimmed).hostname.replace(/^www\./, "");
    return host.endsWith("google.com") || SHORT_LINK_HOSTS.has(host);
  } catch {
    return false;
  }
}

export function parseGoogleMapsLink(input: string): LatLng | null {
  const raw = input.trim();
  if (!raw) return null;

  let text = raw;
  try {
    text = decodeURIComponent(raw);
  } catch {
    // malformed %-escape - fall back to the raw string
  }

  // Ordered most- to least-specific: the !3d/!4d pair (when present) is the
  // actual place marker, while @lat,lng is only the map viewport's center
  // and can be slightly off for a named place.
  const patterns: RegExp[] = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|query)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&]ll=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const lat = Number(match[1]);
      const lng = Number(match[2]);
      if (isValidLatLng(lat, lng)) {
        return { latitude: lat, longitude: lng };
      }
    }
  }

  return null;
}
