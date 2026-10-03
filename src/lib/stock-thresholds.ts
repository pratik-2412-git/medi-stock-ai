/**
 * Shared stock-level classification used across the pharmacy dashboard
 * (summary cards, inventory table). Change this one value to retune what
 * counts as "low stock" everywhere it's used.
 *
 *   quantity === 0              -> Out of Stock
 *   0 < quantity <= threshold   -> Low Stock
 *   quantity > threshold        -> Normal
 */
export const LOW_STOCK_THRESHOLD = 10;

export type StockLevel = "out" | "low" | "normal";

export function classifyStockLevel(
  quantity: number,
  threshold: number = LOW_STOCK_THRESHOLD,
): StockLevel {
  if (quantity <= 0) return "out";
  if (quantity <= threshold) return "low";
  return "normal";
}