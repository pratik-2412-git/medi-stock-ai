/*import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
 
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
  shortageClass: string;
  predictedDays: number | null;
  distance: number | null;
}
 
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
 
export function useMedicineSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [pincode, setPincode] = useState("");
  const [filterInStock, setFilterInStock] = useState(false);
  const [filterLowRisk, setFilterLowRisk] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [submitted, setSubmitted] = useState(false);
 
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
    queryKey: ["medicine-search", searchQuery, userLocation, pincode, filterInStock, filterLowRisk],
    enabled: submitted && searchQuery.trim().length > 1,
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
 
      // Get stock with pharmacy info
      const { data: stockRows, error: stockError } = await supabase
        .from("stock")
        .select(`
          quantity, medicine_id, reorder_level,
          pharmacies (id, name, address, city, state, phone, opening_time, closing_time, latitude, longitude, pincode)
        `)
        .in("medicine_id", medicineIds)
        .gt("quantity", 0);
      if (stockError) throw stockError;
 
      if (!stockRows || stockRows.length === 0) return [];
 
      // Get predictions
      const pharmacyIds = [...new Set(stockRows.map((r) => (r.pharmacies as any)?.id).filter(Boolean))];
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
 
      let results: PharmacyResult[] = stockRows
        .filter((r) => r.pharmacies)
        .map((r) => {
          const ph = r.pharmacies as any;
          const pred = predMap.get(`${ph.id}:${r.medicine_id}`);
          let distance: number | null = null;
          if (userLocation && ph.latitude && ph.longitude) {
            distance = haversineKm(userLocation.lat, userLocation.lng, ph.latitude, ph.longitude);
          }
          return {
            pharmacyId: ph.id,
            pharmacyName: ph.name,
            address: ph.address ?? "",
            city: ph.city ?? "",
            state: ph.state ?? "",
            phone: ph.phone,
            openingTime: ph.opening_time,
            closingTime: ph.closing_time,
            latitude: ph.latitude,
            longitude: ph.longitude,
            quantity: r.quantity,
            shortageClass: pred?.shortage_class ?? "None",
            predictedDays: pred?.predicted_days ?? null,
            distance,
          };
        });
 
      // Filter by pincode
      if (pincode.trim()) {
        const { data: pincodePharms } = await supabase
          .from("pharmacies")
          .select("id")
          .eq("pincode", pincode.trim());
        const pincodeIds = new Set((pincodePharms ?? []).map((p) => p.id));
        results = results.filter((r) => pincodeIds.has(r.pharmacyId));
      }
 
      // Filter by location (10km radius)
      if (userLocation) {
        results = results.filter((r) => r.distance === null || r.distance <= 10);
      }
 
      // Apply UI filters
      if (filterInStock) results = results.filter((r) => r.quantity > 0);
      if (filterLowRisk) results = results.filter((r) => r.shortageClass === "None" || r.shortageClass === "Low");
 
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
        setIsGettingLocation(false);
      },
      (err) => {
        setLocationError("Could not get your location. Please enter a pincode instead.");
        setIsGettingLocation(false);
        console.warn("Geolocation error:", err);
      },
      { timeout: 10000 }
    );
  };
 
  const handleSearch = () => {
    setSubmitted(true);
  };
 
  const handleReset = () => {
    setSubmitted(false);
    setSearchQuery("");
  };
 
  return {
    searchQuery, setSearchQuery,
    userLocation,
    pincode, setPincode,
    filterInStock, setFilterInStock,
    filterLowRisk, setFilterLowRisk,
    locationError,
    isGettingLocation,
    allMedicines,
    results: searchResults.data ?? [],
    isSearching: searchResults.isLoading,
    searchError: searchResults.error,
    submitted,
    handleSearch,
    handleReset,
    getLocation,
  };
}
*/
/*
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
 
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
  shortageClass: string;
  predictedDays: number | null;
  distance: number | null;
}
 
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
 
export function useMedicineSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [pincode, setPincode] = useState("");
  const [filterInStock, setFilterInStock] = useState(false);
  const [filterLowRisk, setFilterLowRisk] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [submitted, setSubmitted] = useState(false);
 
  const { data: allMedicines } = useQuery({
    queryKey: ["all-medicines"],
    queryFn: async () => {
      const { data, error } = await supabase.from("medicines").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
 
  const searchResults = useQuery({
    queryKey: ["medicine-search", searchQuery, userLocation, pincode, filterInStock, filterLowRisk],
    enabled: submitted && searchQuery.trim().length > 1,
    queryFn: async (): Promise<PharmacyResult[]> => {
      const { data: matchedMedicines, error: medError } = await supabase
        .from("medicines")
        .select("id, name")
        .ilike("name", `%${searchQuery.trim()}%`);
      if (medError) throw medError;
      if (!matchedMedicines || matchedMedicines.length === 0) return [];
 
      const medicineIds = matchedMedicines.map((m) => m.id);
      const today = new Date().toISOString().slice(0, 10);
 
      const { data: stockRows, error: stockError } = await supabase
        .from("stock")
        .select(
          "quantity, medicine_id, reorder_level, pharmacies (id, name, address, city, state, phone, opening_time, closing_time, latitude, longitude, pincode)"
        )
        .in("medicine_id", medicineIds)
        .gt("quantity", 0);
      if (stockError) throw stockError;
      if (!stockRows || stockRows.length === 0) return [];
 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pharmacyIds = [...new Set(stockRows.map((r) => (r.pharmacies as any)?.id as string | undefined).filter((id): id is string => Boolean(id)))];
 
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
 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let results: PharmacyResult[] = stockRows
        .filter((r) => r.pharmacies)
        .map((r) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ph = r.pharmacies as any;
          const pred = predMap.get(`${ph.id as string}:${r.medicine_id}`);
          let distance: number | null = null;
          if (userLocation && typeof ph.latitude === "number" && typeof ph.longitude === "number") {
            distance = haversineKm(userLocation.lat, userLocation.lng, ph.latitude as number, ph.longitude as number);
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
            shortageClass: pred?.shortage_class ?? "None",
            predictedDays: pred?.predicted_days ?? null,
            distance,
          };
        });
 
      if (pincode.trim()) {
        const { data: pincodePharms } = await supabase
          .from("pharmacies")
          .select("id")
          .eq("pincode", pincode.trim());
        const pincodeIds = new Set((pincodePharms ?? []).map((p) => p.id));
        results = results.filter((r) => pincodeIds.has(r.pharmacyId));
      }
 
      if (userLocation) {
        results = results.filter((r) => r.distance === null || r.distance <= 10);
      }
 
      if (filterInStock) results = results.filter((r) => r.quantity > 0);
      if (filterLowRisk)
        results = results.filter(
          (r) => r.shortageClass === "None" || r.shortageClass === "Low"
        );
 
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
        setIsGettingLocation(false);
      },
      () => {
        setLocationError("Could not get your location. Please enter a pincode instead.");
        setIsGettingLocation(false);
      },
      { timeout: 10000 }
    );
  };
 
  const handleSearch = () => setSubmitted(true);
  const handleReset = () => { setSubmitted(false); setSearchQuery(""); };
 
  return {
    searchQuery,
    setSearchQuery,
    userLocation,
    pincode,
    setPincode,
    filterInStock,
    setFilterInStock,
    filterLowRisk,
    setFilterLowRisk,
    locationError,
    isGettingLocation,
    allMedicines,
    results: searchResults.data ?? [],
    isSearching: searchResults.isLoading,
    searchError: searchResults.error,
    submitted,
    handleSearch,
    handleReset,
    getLocation,
  };
}
*/
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ShortageClass } from "@/lib/shortage";

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

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const VALID_SHORTAGE_CLASSES: ShortageClass[] = ["None", "Low", "Medium", "High"];

function toShortageClass(value: string | null | undefined): ShortageClass {
  if (value && (VALID_SHORTAGE_CLASSES as string[]).includes(value)) {
    return value as ShortageClass;
  }
  return "None";
}

export function useMedicineSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [pincode, setPincode] = useState("");
  const [filterInStock, setFilterInStock] = useState(false);
  const [filterLowRisk, setFilterLowRisk] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: allMedicines } = useQuery({
    queryKey: ["all-medicines"],
    queryFn: async () => {
      const { data, error } = await supabase.from("medicines").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const searchResults = useQuery({
    queryKey: ["medicine-search", searchQuery, userLocation, pincode, filterInStock, filterLowRisk],
    enabled: submitted && searchQuery.trim().length > 1,
    queryFn: async (): Promise<PharmacyResult[]> => {
      const { data: matchedMedicines, error: medError } = await supabase
        .from("medicines")
        .select("id, name")
        .ilike("name", `%${searchQuery.trim()}%`);
      if (medError) throw medError;
      if (!matchedMedicines || matchedMedicines.length === 0) return [];

      const medicineIds = matchedMedicines.map((m) => m.id);
      const today = new Date().toISOString().slice(0, 10);

      const { data: stockRows, error: stockError } = await supabase
        .from("stock")
        .select(
          "quantity, medicine_id, reorder_level, pharmacies (id, name, address, city, state, phone, opening_time, closing_time, latitude, longitude, pincode)"
        )
        .in("medicine_id", medicineIds)
        .gt("quantity", 0);
      if (stockError) throw stockError;
      if (!stockRows || stockRows.length === 0) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pharmacyIds = [...new Set(
        stockRows
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((r) => (r.pharmacies as any)?.id as string | undefined)
          .filter((id): id is string => Boolean(id))
      )];

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

      let results: PharmacyResult[] = stockRows
        .filter((r) => r.pharmacies)
        .map((r) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ph = r.pharmacies as any;
          const pred = predMap.get(`${ph.id as string}:${r.medicine_id}`);
          let distance: number | null = null;
          if (
            userLocation &&
            typeof ph.latitude === "number" &&
            typeof ph.longitude === "number"
          ) {
            distance = haversineKm(
              userLocation.lat,
              userLocation.lng,
              ph.latitude as number,
              ph.longitude as number
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

      if (pincode.trim()) {
        const { data: pincodePharms } = await supabase
          .from("pharmacies")
          .select("id")
          .eq("pincode", pincode.trim());
        const pincodeIds = new Set((pincodePharms ?? []).map((p) => p.id));
        results = results.filter((r) => pincodeIds.has(r.pharmacyId));
      }

      if (userLocation) {
        results = results.filter((r) => r.distance === null || r.distance <= 10);
      }

      if (filterInStock) results = results.filter((r) => r.quantity > 0);
      if (filterLowRisk)
        results = results.filter(
          (r) => r.shortageClass === "None" || r.shortageClass === "Low"
        );

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
        setIsGettingLocation(false);
      },
      () => {
        setLocationError("Could not get your location. Please enter a pincode instead.");
        setIsGettingLocation(false);
      },
      { timeout: 10000 }
    );
  };

  const handleSearch = () => setSubmitted(true);
  const handleReset = () => {
    setSubmitted(false);
    setSearchQuery("");
  };

  return {
    searchQuery,
    setSearchQuery,
    userLocation,
    pincode,
    setPincode,
    filterInStock,
    setFilterInStock,
    filterLowRisk,
    setFilterLowRisk,
    locationError,
    isGettingLocation,
    allMedicines,
    results: searchResults.data ?? [],
    isSearching: searchResults.isLoading,
    searchError: searchResults.error,
    submitted,
    handleSearch,
    handleReset,
    getLocation,
  };
}