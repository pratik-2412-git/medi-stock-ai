import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { classifyShortage, shortageMessage, type ShortageClass } from "@/lib/shortage";
import type { Tables } from "@/integrations/supabase/types";

export type StockWithMedicine = Tables<"stock"> & {
  medicines: Tables<"medicines">;
};

export type PredictionRow = Tables<"predictions">;
export type AlertRow = Tables<"alerts">;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function usePharmacyRecord(pharmacyId: string | null) {
  return useQuery({
    queryKey: ["pharmacy", pharmacyId],
    enabled: !!pharmacyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pharmacies")
        .select("*")
        .eq("id", pharmacyId as string)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function usePharmacyStock(pharmacyId: string | null) {
  return useQuery({
    queryKey: ["stock", pharmacyId],
    enabled: !!pharmacyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock")
        .select("*, medicines(*)")
        .eq("pharmacy_id", pharmacyId as string)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as StockWithMedicine[];
    },
  });
}

export function usePharmacyPredictions(pharmacyId: string | null) {
  return useQuery({
    queryKey: ["predictions", pharmacyId, todayISO()],
    enabled: !!pharmacyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predictions")
        .select("*")
        .eq("pharmacy_id", pharmacyId as string)
        .eq("prediction_date", todayISO());
      if (error) throw error;
      return (data ?? []) as PredictionRow[];
    },
  });
}

export function usePharmacyAlerts(pharmacyId: string | null) {
  return useQuery({
    queryKey: ["alerts", pharmacyId],
    enabled: !!pharmacyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .eq("pharmacy_id", pharmacyId as string)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as AlertRow[];
    },
  });
}

export function useAllMedicines() {
  return useQuery({
    queryKey: ["all-medicines"],
    queryFn: async () => {
      const { data, error } = await supabase.from("medicines").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

interface UpdateStockInput {
  pharmacyId: string;
  medicineId: string;
  medicineName: string;
  stockId: string | null; // null => creating a new stock row for this pharmacy
  quantity: number;
  reorderLevel: number;
}

async function averageDailySales(pharmacyId: string, medicineId: string): Promise<number> {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
  const { data, error } = await supabase
    .from("sales")
    .select("quantity_sold")
    .eq("pharmacy_id", pharmacyId)
    .eq("medicine_id", medicineId)
    .gte("sale_date", fourteenDaysAgo.toISOString().slice(0, 10));
  if (error) throw error;
  if (!data || data.length === 0) return 1;
  const total = data.reduce((sum, row) => sum + row.quantity_sold, 0);
  return Math.max(1, total / data.length);
}

export function useUpdateStock(pharmacyId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateStockInput) => {
      // 1. Upsert the stock row.
      if (input.stockId) {
        const { error } = await supabase
          .from("stock")
          .update({ quantity: input.quantity, reorder_level: input.reorderLevel })
          .eq("id", input.stockId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("stock").insert({
          pharmacy_id: input.pharmacyId,
          medicine_id: input.medicineId,
          quantity: input.quantity,
          reorder_level: input.reorderLevel,
        });
        if (error) throw error;
      }

      // 2. Recalculate the shortage prediction from recent sales history.
      const avgSales = await averageDailySales(input.pharmacyId, input.medicineId);
      const result = classifyShortage(input.quantity, avgSales);
      const message = shortageMessage(input.medicineName, result);
      const today = todayISO();

      // Replace today's prediction for this pharmacy/medicine (no unique
      // constraint exists to upsert on, so delete-then-insert).
      const { error: deleteError } = await supabase
        .from("predictions")
        .delete()
        .eq("pharmacy_id", input.pharmacyId)
        .eq("medicine_id", input.medicineId)
        .eq("prediction_date", today);
      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase.from("predictions").insert({
        pharmacy_id: input.pharmacyId,
        medicine_id: input.medicineId,
        prediction_date: today,
        shortage_class: result.shortageClass,
        probability: result.probability,
        predicted_days: result.predictedDays,
        message,
      });
      if (insertError) throw insertError;

      // 3. Raise an alert for Medium/High risk, if one wasn't already raised today.
      if (result.shortageClass === "Medium" || result.shortageClass === "High") {
        const startOfToday = `${today}T00:00:00.000Z`;
        const { data: existingAlerts, error: alertLookupError } = await supabase
          .from("alerts")
          .select("id")
          .eq("pharmacy_id", input.pharmacyId)
          .eq("medicine_id", input.medicineId)
          .gte("created_at", startOfToday);
        if (alertLookupError) throw alertLookupError;

        if (!existingAlerts || existingAlerts.length === 0) {
          const { error: alertInsertError } = await supabase.from("alerts").insert({
            pharmacy_id: input.pharmacyId,
            medicine_id: input.medicineId,
            alert_type: "shortage",
            severity: result.shortageClass as ShortageClass,
            title: `${input.medicineName} — ${result.shortageClass} shortage risk`,
            message,
          });
          if (alertInsertError) throw alertInsertError;
        }
      }

      return result;
    },
    onSuccess: (result) => {
      toast.success(`Stock updated — risk: ${result.shortageClass}`);
      queryClient.invalidateQueries({ queryKey: ["stock", pharmacyId] });
      queryClient.invalidateQueries({ queryKey: ["predictions", pharmacyId] });
      queryClient.invalidateQueries({ queryKey: ["alerts", pharmacyId] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update stock");
    },
  });
}
