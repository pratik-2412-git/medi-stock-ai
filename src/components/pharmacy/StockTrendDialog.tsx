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
 
export function StockTrendDialog({ open, onOpenChange, row, pharmacyId }: StockTrendDialogProps) {
  const { data: salesData, isLoading } = useQuery({
    queryKey: ["sales-trend", pharmacyId, row?.medicine_id],
    enabled: open && !!row,
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
      const { data, error } = await supabase
        .from("sales")
        .select("sale_date, quantity_sold")
        .eq("pharmacy_id", pharmacyId)
        .eq("medicine_id", row!.medicine_id)
        .gte("sale_date", thirtyDaysAgo.toISOString().slice(0, 10))
        .order("sale_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
 
  const chartData = salesData?.map((s) => ({
    date: new Date(s.sale_date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
    sold: s.quantity_sold,
  })) ?? [];
 
  const avgSold = chartData.length
    ? Math.round(chartData.reduce((a, b) => a + b.sold, 0) / chartData.length)
    : 0;
 
  const recent = chartData.slice(-7);
  const older = chartData.slice(-14, -7);
  const recentAvg = recent.length ? recent.reduce((a, b) => a + b.sold, 0) / recent.length : 0;
  const olderAvg = older.length ? older.reduce((a, b) => a + b.sold, 0) / older.length : 0;
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
          ) : chartData.length === 0 ? (
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