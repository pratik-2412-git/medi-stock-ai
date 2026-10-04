import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ShortageClass } from "@/lib/shortage";
import { geocodePincode, type GeoPoint } from "@/lib/geocode";
import { classifyStockLevel } from "@/lib/stock-thresholds";

export type { ShortageClass };

export interface PharmacyResult {
  pharmacyId: string;
  pharmacyName: string;
  address: string;
  city: string;
  state: string;
  phone: string | null;
  openingTime: string | null;
  closingTime: string | null;
  latitude: number | null;
  longitude: number | null;
  quantity: number;
  shortageClass: ShortageClass;
  predictedDays: number | null;
  distance: number | null;
}

const SEARCH_RADIUS_KM = 10;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const VALID_SHORTAGE_CLASSES: ShortageClass[] = ["None", "Low", "Medium", "High"];

function toShortageClass(value: string | null | undefined): ShortageClass {
  if (value && (VALID_SHORTAGE_CLASSES as string[]).includes(value)) {
    return value as ShortageClass;
  }
  return "None";
}

// Which location source the patient has explicitly chosen. Exactly one of
// these is authoritative at a time — never a silent "GPS wins if both are
// present" fallback. Search, distance, map, and results all key off this.
export type LocationMethod = "gps" | "pincode" | null;

export function useMedicineSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  const [pincode, setPincodeRaw] = useState("");
  // Resolved from the pincode via geocoding when pincode is the active method.
  const [pincodeLocation, setPincodeLocation] = useState<GeoPoint | null>(null);
  const [locationMethod, setLocationMethod] = useState<LocationMethod>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [filterInStock, setFilterInStock] = useState(false);
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Typing a pincode selects the pincode method; clearing it while pincode
  // was the active method deselects it again (back to "nothing selected",
  // not a silent revert to GPS). GPS selection happens explicitly in
  // getLocation() below.
  const setPincode = (value: string) => {
    setPincodeRaw(value);
    if (value.trim()) {
      setLocationMethod("pincode");
    } else if (locationMethod === "pincode") {
      setLocationMethod(null);
      setPincodeLocation(null);
    }
  };

  // The point actually used for distance/radius calculations and for
  // centering the map: strictly whichever method the patient selected —
  // never an automatic GPS-over-pincode fallback. If neither (or the
  // selected method hasn't resolved to coordinates yet), this is null.
  const searchOrigin: GeoPoint | null =
    locationMethod === "gps" ? userLocation : locationMethod === "pincode" ? pincodeLocation : null;

  // Fetch all medicines for autocomplete
  const { data: allMedicines } = useQuery({
    queryKey: ["all-medicines"],
    queryFn: async () => {
      const { data, error } = await supabase.from("medicines").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Main search
  const searchResults = useQuery({
    queryKey: [
      "medicine-search",
      searchQuery,
      userLocation,
      pincodeLocation,
      pincode,
      locationMethod,
      filterInStock,
      filterLowStock,
    ],
    enabled: submitted && searchQuery.trim().length > 1 && !isGeocoding,
    queryFn: async (): Promise<PharmacyResult[]> => {
      // Find matching medicines
      const { data: matchedMedicines, error: medError } = await supabase
        .from("medicines")
        .select("id, name")
        .ilike("name", `%${searchQuery.trim()}%`);
      if (medError) throw medError;
      if (!matchedMedicines || matchedMedicines.length === 0) return [];

      const medicineIds = matchedMedicines.map((m) => m.id);
      const today = new Date().toISOString().slice(0, 10);

      // Get stock with pharmacy info. Intentionally NOT filtered to
      // quantity > 0 — out-of-stock rows (quantity = 0) must still surface
      // so the patient can see "Out of Stock" for a nearby pharmacy that
      // carries the medicine, rather than it silently disappearing.
      const { data: stockRows, error: stockError } = await supabase
        .from("stock")
        .select(
          "quantity, medicine_id, reorder_level, pharmacies (id, name, address, city, state, phone, opening_time, closing_time, latitude, longitude, pincode)",
        )
        .in("medicine_id", medicineIds);
      if (stockError) throw stockError;

      if (!stockRows || stockRows.length === 0) return [];

      // Get predictions

      const pharmacyIds = [
        ...new Set(
          stockRows
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((r) => (r.pharmacies as any)?.id as string | undefined)
            .filter((id): id is string => Boolean(id)),
        ),
      ];

      const { data: preds } = await supabase
        .from("predictions")
        .select("pharmacy_id, medicine_id, shortage_class, predicted_days")
        .in("pharmacy_id", pharmacyIds)
        .in("medicine_id", medicineIds)
        .eq("prediction_date", today);

      const predMap = new Map<string, { shortage_class: string; predicted_days: number | null }>();
      for (const p of preds ?? []) {
        predMap.set(`${p.pharmacy_id}:${p.medicine_id}`, {
          shortage_class: p.shortage_class,
          predicted_days: p.predicted_days,
        });
      }

      // Mirrors searchOrigin exactly — the selected method is the single
      // source of truth for distance, map centering, and result filtering.
      const origin: GeoPoint | null =
        locationMethod === "gps" ? userLocation : locationMethod === "pincode" ? pincodeLocation : null;

      let results: PharmacyResult[] = stockRows
        .filter((r) => r.pharmacies)
        .map((r) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ph = r.pharmacies as any;
          const pred = predMap.get(`${ph.id as string}:${r.medicine_id}`);
          let distance: number | null = null;
          if (origin && typeof ph.latitude === "number" && typeof ph.longitude === "number") {
            distance = haversineKm(
              origin.lat,
              origin.lng,
              ph.latitude as number,
              ph.longitude as number,
            );
          }
          return {
            pharmacyId: ph.id as string,
            pharmacyName: ph.name as string,
            address: (ph.address as string | null) ?? "",
            city: (ph.city as string | null) ?? "",
            state: (ph.state as string | null) ?? "",
            phone: ph.phone as string | null,
            openingTime: ph.opening_time as string | null,
            closingTime: ph.closing_time as string | null,
            latitude: ph.latitude as number | null,
            longitude: ph.longitude as number | null,
            quantity: r.quantity,
            shortageClass: toShortageClass(pred?.shortage_class),
            predictedDays: pred?.predicted_days ?? null,
            distance,
          };
        });

      if (origin) {
        // A real lat/lng reference point exists (GPS or geocoded pincode):
        // enforce the 10km radius as the source of truth.
        results = results.filter((r) => r.distance === null || r.distance <= SEARCH_RADIUS_KM);
      } else if (locationMethod === "pincode" && pincode.trim()) {
        // Geocoding failed / unavailable but pincode is the selected
        // method — fall back to an exact pincode match so the search still
        // narrows down rather than silently ignoring it. Only applies in
        // pincode mode: stale pincode text left over while GPS is the
        // active method must never affect results.
        const { data: pincodePharms } = await supabase
          .from("pharmacies")
          .select("id")
          .eq("pincode", pincode.trim());
        const pincodeIds = new Set((pincodePharms ?? []).map((p) => p.id));
        results = results.filter((r) => pincodeIds.has(r.pharmacyId));
      }

      // Apply UI filters — both read the same shared quantity formula used
      // everywhere else (stock-thresholds.ts): "In Stock Only" means
      // quantity > 5 units; "Low Stock Only" means 1-5 units.
      if (filterInStock) {
        results = results.filter((r) => classifyStockLevel(r.quantity) === "normal");
      }
      if (filterLowStock) {
        results = results.filter((r) => classifyStockLevel(r.quantity) === "low");
      }

      // Sort by distance, then by stock
      results.sort((a, b) => {
        if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
        if (a.distance !== null) return -1;
        if (b.distance !== null) return 1;
        return b.quantity - a.quantity;
      });

      return results;
    },
  });

  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }
    setIsGettingLocation(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        // Explicitly selecting "Use My Location" makes GPS the active
        // method — any previously selected pincode is deselected, not
        // merged or raced against.
        setLocationMethod("gps");
        setPincodeLocation(null);
        setIsGettingLocation(false);
      },
      (err) => {
        setLocationError("Could not get your location. Please enter a pincode instead.");
        setIsGettingLocation(false);
        console.warn("Geolocation error:", err);
      },
      { timeout: 10000 },
    );
  };

  const handleSearch = async () => {
    // A location method must be explicitly selected before searching —
    // either "Use My Location" or a pincode/area, never both implicitly.
    if (!locationMethod) {
      setLocationError('Choose a location first — tap "Use My Location" or enter a pincode/area.');
      return;
    }

    if (locationMethod === "gps") {
      if (!userLocation) {
        setLocationError('Location not detected yet. Tap "Use My Location" and allow access.');
        return;
      }
    } else {
      // locationMethod === "pincode"
      if (!pincode.trim()) {
        setLocationError("Enter a pincode or area to search.");
        return;
      }
      // Resolve the pincode to real coordinates so the 10km radius can be
      // calculated against it, completely independent of any GPS location.
      setIsGeocoding(true);
      const resolved = await geocodePincode(pincode);
      setPincodeLocation(resolved);
      setIsGeocoding(false);
    }

    setLocationError(null);
    setSubmitted(true);
  };

  const handleReset = () => {
    setSubmitted(false);
    setSearchQuery("");
  };

  return {
    searchQuery,
    setSearchQuery,
    userLocation,
    searchOrigin,
    locationMethod,
    pincode,
    setPincode,
    filterInStock,
    setFilterInStock,
    filterLowStock,
    setFilterLowStock,
    locationError,
    isGettingLocation,
    allMedicines,
    results: searchResults.data ?? [],
    isSearching: isGeocoding || searchResults.isLoading,
    searchError: searchResults.error,
    submitted,
    handleSearch,
    handleReset,
    getLocation,
  };
}