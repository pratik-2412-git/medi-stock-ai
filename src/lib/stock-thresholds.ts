/**
 * Shared stock-level classification used everywhere a plain quantity-based
 * stock status is shown: pharmacy-owner summary cards, and the patient-facing
 * search (pharmacy result cards, map markers, "In Stock"/"Low Stock" filters).
 * Change this one value to retune the threshold app-wide.
 *
 *   quantity === 0              -> Out of Stock
 *   0 < quantity <= threshold   -> Low Stock
 *   quantity > threshold        -> In Stock ("normal")
 */
export const LOW_STOCK_THRESHOLD = 5;

export type StockLevel = "out" | "low" | "normal";

export function classifyStockLevel(
  quantity: number,
  threshold: number = LOW_STOCK_THRESHOLD,
): StockLevel {
  if (quantity <= 0) return "out";
  if (quantity <= threshold) return "low";
  return "normal";
}