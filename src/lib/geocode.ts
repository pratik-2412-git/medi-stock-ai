// Converts a pincode/postal code into coordinates using OpenStreetMap's free
// Nominatim geocoding API (no API key required — same provider already used
// for the Leaflet map tiles elsewhere in this app). Used so patients can
// search "within 10km" by pincode alone, without sharing their GPS location.

export interface GeoPoint {
  lat: number;
  lng: number;
}

const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";

/**
 * Resolves an Indian postal code to approximate lat/lng.
 * Returns null on any failure (network error, no match, bad response) so
 * callers can fall back gracefully rather than throwing.
 */
export async function geocodePincode(pincode: string): Promise<GeoPoint | null> {
  const trimmed = pincode.trim();
  if (!trimmed) return null;

  try {
    const url = `${NOMINATIM_SEARCH_URL}?format=json&postalcode=${encodeURIComponent(trimmed)}&country=India&limit=1`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;

    const data = (await response.json()) as Array<{ lat: string; lon: string }>;
    const first = data?.[0];
    if (!first) return null;

    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

    return { lat, lng };
  } catch {
    return null;
  }
}