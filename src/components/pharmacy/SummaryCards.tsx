import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PredictionRow, StockWithMedicine } from "@/hooks/usePharmacyDashboard";

export function SummaryCards({
  stock,
  predictions,
}: {
  stock: StockWithMedicine[];
  predictions: PredictionRow[];
}) {
  const totalTracked = stock.length;
  const lowStock = stock.filter((row) => row.quantity <= row.reorder_level).length;
  const highRiskMedicineIds = new Set(
    predictions.filter((p) => p.shortage_class === "High").map((p) => p.medicine_id),
  );
  const highRisk = highRiskMedicineIds.size;
  const lastUpdated = stock.reduce<string | null>((latest, row) => {
    if (!latest || row.updated_at > latest) return row.updated_at;
    return latest;
  }, null);

  const cards = [
    { label: "Total medicines tracked", value: totalTracked },
    { label: "Medicines with low stock", value: lowStock },
    { label: "High shortage risk (3–5 days)", value: highRisk },
    {
      label: "Last inventory update",
      value: lastUpdated ? new Date(lastUpdated).toLocaleString() : "—",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
