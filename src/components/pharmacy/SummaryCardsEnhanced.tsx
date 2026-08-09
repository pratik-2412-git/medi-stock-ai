import { Package, AlertTriangle, Clock, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PredictionRow, StockWithMedicine } from "@/hooks/usePharmacyDashboard";
 
interface SummaryCardsEnhancedProps {
  stock: StockWithMedicine[];
  predictions: PredictionRow[];
  isLoading?: boolean;
}
 
export function SummaryCardsEnhanced({ stock, predictions, isLoading = false }: SummaryCardsEnhancedProps) {
  const totalTracked = stock.length;
  const lowStock = stock.filter((r) => r.quantity <= r.reorder_level).length;
  const outOfStock = stock.filter((r) => r.quantity === 0).length;
  const highRisk = new Set(
    predictions.filter((p) => p.shortage_class === "High").map((p) => p.medicine_id)
  ).size;
  const lastUpdated = stock.reduce<string | null>((latest, row) => {
    if (!latest || row.updated_at > latest) return row.updated_at;
    return latest;
  }, null);
 
  const cards = [
    {
      label: "Total Tracked",
      value: totalTracked,
      sub: "medicines",
      icon: Package,
      color: "text-primary",
      bg: "bg-primary-soft",
    },
    {
      label: "Low Stock",
      value: lowStock,
      sub: outOfStock > 0 ? `${outOfStock} out of stock` : "at or below reorder",
      icon: TrendingDown,
      color: "text-status-warn-foreground",
      bg: "bg-status-warn-soft",
    },
    {
      label: "High Risk",
      value: highRisk,
      sub: "shortage predicted",
      icon: AlertTriangle,
      color: "text-status-critical-foreground",
      bg: "bg-status-critical-soft",
    },
    {
      label: "Last Updated",
      value: lastUpdated ? new Date(lastUpdated).toLocaleDateString("en-IN") : "—",
      sub: lastUpdated ? new Date(lastUpdated).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "",
      icon: Clock,
      color: "text-muted-foreground",
      bg: "bg-muted",
      isText: true,
    },
  ];
 
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-3 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="mt-1 h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
 
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                {card.label}
                <span className={`flex size-7 items-center justify-center rounded-lg ${card.bg}`}>
                  <Icon className={`size-3.5 ${card.color}`} />
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {card.isText ? (
                <>
                  <p className="text-xl font-bold text-foreground">{card.value}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{card.sub}</p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold text-foreground">{card.value}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{card.sub}</p>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
 