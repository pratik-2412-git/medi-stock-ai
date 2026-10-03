import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import type { StockWithMedicine } from "@/hooks/usePharmacyDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
 
interface StockTrendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: StockWithMedicine | null;
  pharmacyId: string;
}
 
const WINDOW_DAYS = 30;

/** YYYY-MM-DD for a Date in the user's LOCAL timezone (toISOString would shift it to UTC). */
function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** The rolling window: today and the 29 days before it, oldest first, as local dates. */
function rollingWindow(): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: WINDOW_DAYS }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (WINDOW_DAYS - 1 - i));
    return d;
  });
}

export function StockTrendDialog({ open, onOpenChange, row, pharmacyId }: StockTrendDialogProps) {
  const { data: salesData, isLoading } = useQuery({
    queryKey: ["sales-trend", pharmacyId, row?.medicine_id],
    enabled: open && !!row,
    queryFn: async () => {
      const days = rollingWindow();
      const start = localDateKey(days.at(0) ?? new Date());
      const end = localDateKey(days.at(-1) ?? new Date());
      const { data, error } = await supabase
        .from("sales")
        .select("sale_date, quantity_sold")
        .eq("pharmacy_id", pharmacyId)
        .eq("medicine_id", row!.medicine_id)
        .gte("sale_date", start)
        .lte("sale_date", end)
        .order("sale_date", { ascending: true });
      if (error) {
        console.error("Failed to load sales trend", error);
        throw error;
      }
      return data ?? [];
    },
  });

  // Sum quantity_sold per calendar day (several rows may exist for one day),
  // then lay the sums over the full rolling 30-day window. A day with no
  // sales row is a day with no recorded sales (0) — nothing is invented.
  const soldByDate = new Map<string, number>();
  for (const s of salesData ?? []) {
    soldByDate.set(s.sale_date, (soldByDate.get(s.sale_date) ?? 0) + s.quantity_sold);
  }
  const hasSales = (salesData?.length ?? 0) > 0;

  const chartData = rollingWindow().map((d) => ({
    date: d.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
    sold: soldByDate.get(localDateKey(d)) ?? 0,
  }));

  const sum = (rows: { sold: number }[]) => rows.reduce((a, b) => a + b.sold, 0);
  const avgSold = hasSales ? Math.round((sum(chartData) / WINDOW_DAYS) * 10) / 10 : 0;

  // 7-day trend: the last 7 days vs the 7 days before them.
  const recentAvg = sum(chartData.slice(-7)) / 7;
  const olderAvg = sum(chartData.slice(-14, -7)) / 7;
  const trend = recentAvg > olderAvg + 0.5 ? "up" : recentAvg < olderAvg - 0.5 ? "down" : "flat";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sales Trend — {row?.medicines.name}</DialogTitle>
        </DialogHeader>
 
        <div className="grid grid-cols-3 gap-3 mt-2">
          <StatCard label="Current Stock" value={row?.quantity ?? 0} unit="units" />
          <StatCard label="Avg Daily Sales" value={avgSold} unit="units/day" />
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">Trend (7d)</p>
            <div className="mt-1 flex items-center gap-1.5">
              {trend === "up" && <TrendingUp className="size-4 text-status-critical" />}
              {trend === "down" && <TrendingDown className="size-4 text-status-ok" />}
              {trend === "flat" && <Minus className="size-4 text-muted-foreground" />}
              <span className={`text-sm font-semibold ${
                trend === "up" ? "text-status-critical-foreground" :
                trend === "down" ? "text-status-ok-foreground" : "text-muted-foreground"
              }`}>
                {trend === "up" ? "Rising" : trend === "down" ? "Falling" : "Stable"}
              </span>
            </div>
          </div>
        </div>
 
        <div className="mt-4">
          <p className="mb-3 text-sm font-medium text-muted-foreground">Daily Sales (Last 30 Days)</p>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : !hasSales ? (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed">
              <p className="text-sm text-muted-foreground">No sales data available</p>
            </div>
          ) : (
            <ChartContainer
              config={{ sold: { label: "Units Sold", color: "var(--color-primary)" } }}
              className="h-48 w-full"
            >
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="soldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                <YAxis tick={{ fontSize: 10 }} width={28} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="sold"
                  stroke="var(--color-primary)"
                  fill="url(#soldGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
 
function StatCard({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{unit}</p>
    </div>
  );
}