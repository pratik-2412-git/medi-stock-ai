import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { classifyShortage, shortageMessage, shortageBadgeClasses, shortageLabel, type ShortageClass } from "@/lib/shortage";
import type { StockWithMedicine, PredictionRow } from "@/hooks/usePharmacyDashboard";
import { Brain, CheckCircle2, AlertTriangle } from "lucide-react";
 
interface RunPredictionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stock: StockWithMedicine[];
  predictions: PredictionRow[];
  pharmacyId: string;
}
 
function todayISO() { return new Date().toISOString().slice(0, 10); }
 
export function RunPredictionDialog({
  open, onOpenChange, stock, predictions, pharmacyId
}: RunPredictionDialogProps) {
  const queryClient = useQueryClient();
  const [results, setResults] = useState<Array<{name: string; class: ShortageClass; days: number}>>([]);
  const [ran, setRan] = useState(false);
 
  const runMutation = useMutation({
    mutationFn: async () => {
      const today = todayISO();
      const newResults: typeof results = [];
 
      for (const row of stock) {
        // Get avg daily sales
        const fourteenAgo = new Date();
        fourteenAgo.setDate(fourteenAgo.getDate() - 13);
        const { data: salesData } = await supabase
          .from("sales")
          .select("quantity_sold")
          .eq("pharmacy_id", pharmacyId)
          .eq("medicine_id", row.medicine_id)
          .gte("sale_date", fourteenAgo.toISOString().slice(0, 10));
 
        const avgSales = salesData && salesData.length > 0
          ? Math.max(1, salesData.reduce((s, r) => s + r.quantity_sold, 0) / salesData.length)
          : 1;
 
        const result = classifyShortage(row.quantity, avgSales);
        const message = shortageMessage(row.medicines.name, result);
 
        // Delete & re-insert prediction
        await supabase.from("predictions").delete()
          .eq("pharmacy_id", pharmacyId)
          .eq("medicine_id", row.medicine_id)
          .eq("prediction_date", today);
 
        await supabase.from("predictions").insert({
          pharmacy_id: pharmacyId,
          medicine_id: row.medicine_id,
          prediction_date: today,
          shortage_class: result.shortageClass,
          probability: result.probability,
          predicted_days: result.predictedDays,
          message,
        });
 
        // Create alert if needed
        if (result.shortageClass === "Medium" || result.shortageClass === "High") {
          const startOfToday = `${today}T00:00:00.000Z`;
          const { data: existing } = await supabase.from("alerts").select("id")
            .eq("pharmacy_id", pharmacyId)
            .eq("medicine_id", row.medicine_id)
            .gte("created_at", startOfToday);
 
          if (!existing || existing.length === 0) {
            await supabase.from("alerts").insert({
              pharmacy_id: pharmacyId,
              medicine_id: row.medicine_id,
              alert_type: "shortage",
              severity: result.shortageClass,
              title: `${row.medicines.name} — ${result.shortageClass} shortage risk`,
              message,
            });
          }
        }
 
        newResults.push({ name: row.medicines.name, class: result.shortageClass, days: result.predictedDays });
      }
 
      setResults(newResults);
      setRan(true);
    },
    onSuccess: () => {
      toast.success("Predictions updated for all medicines");
      queryClient.invalidateQueries({ queryKey: ["predictions", pharmacyId] });
      queryClient.invalidateQueries({ queryKey: ["alerts", pharmacyId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to run predictions"),
  });
 
  const handleClose = () => {
    setRan(false);
    setResults([]);
    onOpenChange(false);
  };
 
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="size-5 text-primary" />
            Run AI Shortage Prediction
          </DialogTitle>
        </DialogHeader>
 
        {!ran ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This will analyse the last 14 days of sales data for all {stock.length} tracked medicines
              and update shortage risk predictions.
            </p>
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2">RISK THRESHOLDS</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between"><span>Safe</span><span>&gt;15 days of stock</span></div>
                <div className="flex justify-between"><span>Low risk</span><span>8–15 days</span></div>
                <div className="flex justify-between"><span>Medium risk</span><span>3–7 days</span></div>
                <div className="flex justify-between"><span>High risk / Out of stock</span><span>&lt;3 days</span></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="size-4 text-status-ok" />
              <p className="text-sm font-medium">Predictions updated for {results.length} medicines</p>
            </div>
            {results.map((r) => (
              <div key={r.name} className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
                <span className="text-sm text-foreground">{r.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{r.days}d</span>
                  <Badge variant="outline" className={shortageBadgeClasses[r.class]}>
                    {shortageLabel[r.class]}
                  </Badge>
                </div>
              </div>
            ))}
            {results.filter(r => r.class === "High" || r.class === "Medium").length > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-status-warn bg-status-warn-soft p-3 mt-2">
                <AlertTriangle className="size-4 text-status-warn-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-status-warn-foreground">
                  {results.filter(r => r.class === "High").length} high-risk and {results.filter(r => r.class === "Medium").length} medium-risk medicines detected. Alerts have been generated.
                </p>
              </div>
            )}
          </div>
        )}
 
        <DialogFooter>
          {!ran ? (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={() => runMutation.mutate()} disabled={runMutation.isPending || stock.length === 0}>
                {runMutation.isPending ? "Running..." : `Run Prediction (${stock.length} medicines)`}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}