// Shortage-risk classification. Mirrors the rule-based formula used in the
// seed migration (supabase/migrations/20260808060000_seed_demo_data.sql):
//
//   days_of_stock = quantity / avg_daily_sales   (avg_daily_sales floors at 1)
//
//   > 15 days  -> None  (safe)
//   8-15 days  -> Low
//   3-7 days   -> Medium
//   < 3 days   -> High
//   qty = 0    -> High (out of stock)

export type ShortageClass = "None" | "Low" | "Medium" | "High";

export interface ShortageResult {
  shortageClass: ShortageClass;
  probability: number;
  predictedDays: number;
}

export function classifyShortage(quantity: number, avgDailySalesRaw: number): ShortageResult {
  const avgDailySales = Math.max(1, Math.round(avgDailySalesRaw));
  const predictedDays = Math.floor(quantity / avgDailySales);

  if (quantity === 0) {
    return { shortageClass: "High", probability: 0.97, predictedDays: 0 };
  }
  if (predictedDays < 3) {
    return { shortageClass: "High", probability: 0.9, predictedDays };
  }
  if (predictedDays <= 7) {
    return { shortageClass: "Medium", probability: 0.7, predictedDays };
  }
  if (predictedDays <= 15) {
    return { shortageClass: "Low", probability: 0.4, predictedDays };
  }
  return { shortageClass: "None", probability: 0.1, predictedDays };
}

export function shortageMessage(medicineName: string, result: ShortageResult): string {
  const { shortageClass, predictedDays } = result;
  if (shortageClass === "High" && predictedDays <= 0) {
    return `${medicineName} — Out of stock`;
  }
  if (shortageClass === "High") {
    return `${medicineName} — High risk of shortage in ${predictedDays} day(s)`;
  }
  if (shortageClass === "Medium") {
    return `${medicineName} — Medium risk, approximately ${predictedDays} day(s) remaining`;
  }
  if (shortageClass === "Low") {
    return `${medicineName} — Low stock, approximately ${predictedDays} day(s) remaining`;
  }
  return `${medicineName} — Stock level is healthy`;
}

export const shortageBadgeClasses: Record<ShortageClass, string> = {
  None: "bg-status-ok-soft text-status-ok-foreground",
  Low: "bg-status-ok-soft text-status-ok-foreground",
  Medium: "bg-status-warn-soft text-status-warn-foreground",
  High: "bg-status-critical-soft text-status-critical-foreground",
};
