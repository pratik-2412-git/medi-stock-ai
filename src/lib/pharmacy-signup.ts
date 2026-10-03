import { supabase } from "@/integrations/supabase/client";

export interface PendingPharmacy {
  name: string;
  owner_name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
}

const STORAGE_KEY = "medistock:pending-pharmacy";

// A complete decimal number: optional "-", one or more digits, optionally
// followed by "." and one or more digits. Deliberately rejects incomplete
// input like "19.", "-", or "." so an in-progress keystroke never gets
// parsed as a finished coordinate.
const COMPLETE_DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;

/**
 * Parses a latitude/longitude field's raw text (e.g. "19.0760") into a number,
 * preserving full decimal precision. Returns null for an empty, in-progress
 * (e.g. "19."), or otherwise invalid value instead of silently rounding,
 * truncating, or guessing at an unfinished entry.
 */
export function parseCoordinate(value: string): number | null {
  const trimmed = value.trim();
  if (!COMPLETE_DECIMAL_PATTERN.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isValidLatitude(value: number): boolean {
  return value >= -90 && value <= 90;
}

export function isValidLongitude(value: number): boolean {
  return value >= -180 && value <= 180;
}

/** Email confirmation can delay the session, so keep the details until we can write them. */
export function savePendingPharmacy(details: PendingPharmacy) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(details));
}

export function readPendingPharmacy(): PendingPharmacy | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingPharmacy;
  } catch {
    return null;
  }
}

export function clearPendingPharmacy() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

/**
 * Creates the pharmacy row and links it to the owner's profile via pharmacy_id.
 * Safe to call repeatedly: it no-ops when the profile is already linked.
 */
export async function createPharmacyForUser(userId: string, details: PendingPharmacy) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("pharmacy_id")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.pharmacy_id) {
    clearPendingPharmacy();
    return profile.pharmacy_id;
  }

  const { data: pharmacy, error } = await supabase
    .from("pharmacies")
    .insert(details)
    .select("id")
    .single();
  if (error) throw error;

  const { error: linkError } = await supabase
    .from("profiles")
    .update({ pharmacy_id: pharmacy.id })
    .eq("id", userId);
  if (linkError) throw linkError;

  clearPendingPharmacy();
  return pharmacy.id;
}

/** Called after login/signup: finishes a pharmacy signup that was interrupted by email confirmation. */
export async function flushPendingPharmacy(userId: string) {
  const pending = readPendingPharmacy();
  if (!pending) return;
  try {
    await createPharmacyForUser(userId, pending);
  } catch {
    // Leave the pending details in place so the next sign-in can retry.
  }
}