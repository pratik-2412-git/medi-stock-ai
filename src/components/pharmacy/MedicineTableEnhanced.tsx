/*import { useState } from "react";
import { Plus, TrendingUp, Brain, RefreshCw } from "lucide-react";
 
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { shortageBadgeClasses, type ShortageClass } from "@/lib/shortage";
import type { PredictionRow, StockWithMedicine } from "@/hooks/usePharmacyDashboard";
import { UpdateStockDialog } from "./UpdateStockDialog";
import { StockTrendDialog } from "./StockTrendDialog";
import { RunPredictionDialog } from "./RunPredictionDialog";
 
interface MedicineTableEnhancedProps {
  pharmacyId: string;
  stock: StockWithMedicine[];
  predictions: PredictionRow[];
  isLoading?: boolean;
}
 
export function MedicineTableEnhanced({
  pharmacyId,
  stock,
  predictions,
  isLoading = false,
}: MedicineTableEnhancedProps) {
  const [updateDialog, setUpdateDialog] = useState(false);
  const [editingRow, setEditingRow] = useState<StockWithMedicine | null>(null);
  const [trendDialog, setTrendDialog] = useState(false);
  const [trendRow, setTrendRow] = useState<StockWithMedicine | null>(null);
  const [predictionDialog, setPredictionDialog] = useState(false);
 
  const predictionByMedicine = new Map<string, PredictionRow>();
  for (const p of predictions) predictionByMedicine.set(p.medicine_id, p);
 
  const openEdit = (row: StockWithMedicine) => { setEditingRow(row); setUpdateDialog(true); };
  const openAdd = () => { setEditingRow(null); setUpdateDialog(true); };
  const openTrend = (row: StockWithMedicine) => { setTrendRow(row); setTrendDialog(true); };
 
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <CardTitle className="text-base">Inventory</CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => setPredictionDialog(true)}>
            <Brain className="size-4" />
            Run Prediction
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus className="size-4" />
            Update Stock
          </Button>
        </div>
      </CardHeader>
 
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
            ))}
          </div>
        ) : stock.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <RefreshCw className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No medicines tracked yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Click "Update Stock" to add your first medicine.
              </p>
            </div>
            <Button size="sm" onClick={openAdd}>
              <Plus className="size-4" />
              Add Medicine
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Reorder</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stock.map((row) => {
                  const prediction = predictionByMedicine.get(row.medicine_id);
                  const riskClass: ShortageClass = (prediction?.shortage_class as ShortageClass | undefined) ?? "None";
                  const isLow = row.quantity <= row.reorder_level;
 
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium text-foreground">
                        <div>
                          {row.medicines.name}
                          {row.medicines.category && (
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              {row.medicines.category}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={isLow ? "font-semibold text-status-critical-foreground" : ""}>
                          {row.quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{row.reorder_level}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(row.updated_at).toLocaleDateString("en-IN")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className={shortageBadgeClasses[riskClass]}>
                            {riskClass === "None" ? "Safe" : riskClass}
                          </Badge>
                          {prediction?.predicted_days !== undefined && prediction.predicted_days <= 7 && (
                            <span className="text-xs text-muted-foreground">
                              {prediction.predicted_days}d
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openTrend(row)}
                            title="View sales trend"
                          >
                            <TrendingUp className="size-3.5" />
                            <span className="hidden sm:inline ml-1">Trend</span>
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                            Update
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
 
      <UpdateStockDialog
        open={updateDialog}
        onOpenChange={setUpdateDialog}
        pharmacyId={pharmacyId}
        existingRow={editingRow}
      />
      <StockTrendDialog
        open={trendDialog}
        onOpenChange={setTrendDialog}
        row={trendRow}
        pharmacyId={pharmacyId}
      />
      <RunPredictionDialog
        open={predictionDialog}
        onOpenChange={setPredictionDialog}
        stock={stock}
        predictions={predictions}
        pharmacyId={pharmacyId}
      />
    </Card>
  );
}
*/
import { useState } from "react";
import { Plus, TrendingUp, Brain, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { shortageBadgeClasses, type ShortageClass } from "@/lib/shortage";
import type { PredictionRow, StockWithMedicine } from "@/hooks/usePharmacyDashboard";
import { UpdateStockDialog } from "@/components/pharmacy/UpdateStockDialog";
import { StockTrendDialog } from "@/components/pharmacy/StockTrendDialog";
import { RunPredictionDialog } from "@/components/pharmacy/RunPredictionDialog";

interface MedicineTableEnhancedProps {
  pharmacyId: string;
  stock: StockWithMedicine[];
  predictions: PredictionRow[];
  isLoading?: boolean;
}

export function MedicineTableEnhanced({
  pharmacyId,
  stock,
  predictions,
  isLoading = false,
}: MedicineTableEnhancedProps) {
  const [updateDialog, setUpdateDialog] = useState(false);
  const [editingRow, setEditingRow] = useState<StockWithMedicine | null>(null);
  const [trendDialog, setTrendDialog] = useState(false);
  const [trendRow, setTrendRow] = useState<StockWithMedicine | null>(null);
  const [predictionDialog, setPredictionDialog] = useState(false);

  const predictionByMedicine = new Map<string, PredictionRow>();
  for (const p of predictions) predictionByMedicine.set(p.medicine_id, p);

  const openEdit = (row: StockWithMedicine) => { setEditingRow(row); setUpdateDialog(true); };
  const openAdd = () => { setEditingRow(null); setUpdateDialog(true); };
  const openTrend = (row: StockWithMedicine) => { setTrendRow(row); setTrendDialog(true); };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <CardTitle className="text-base">Inventory</CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => setPredictionDialog(true)}>
            <Brain className="size-4" />
            Run Prediction
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus className="size-4" />
            Update Stock
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
            ))}
          </div>
        ) : stock.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <RefreshCw className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No medicines tracked yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Click "Update Stock" to add your first medicine.
              </p>
            </div>
            <Button size="sm" onClick={openAdd}>
              <Plus className="size-4" />
              Add Medicine
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Reorder</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stock.map((row) => {
                  const prediction = predictionByMedicine.get(row.medicine_id);
                  const riskClass: ShortageClass =
                    (prediction?.shortage_class as ShortageClass | undefined) ?? "None";
                  const isLow = row.quantity <= row.reorder_level;
                  const predictedDays: number | null = prediction?.predicted_days ?? null;

                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium text-foreground">
                        <div>
                          {row.medicines.name}
                          {row.medicines.category && (
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              {row.medicines.category}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={isLow ? "font-semibold text-status-critical-foreground" : ""}>
                          {row.quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {row.reorder_level}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(row.updated_at).toLocaleDateString("en-IN")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className={shortageBadgeClasses[riskClass]}>
                            {riskClass === "None" ? "Safe" : riskClass}
                          </Badge>
                          {predictedDays !== null && predictedDays <= 7 && (
                            <span className="text-xs text-muted-foreground">
                              {predictedDays}d
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openTrend(row)}
                            title="View sales trend"
                          >
                            <TrendingUp className="size-3.5" />
                            <span className="hidden sm:inline ml-1">Trend</span>
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                            Update
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <UpdateStockDialog
        open={updateDialog}
        onOpenChange={setUpdateDialog}
        pharmacyId={pharmacyId}
        existingRow={editingRow}
      />
      <StockTrendDialog
        open={trendDialog}
        onOpenChange={setTrendDialog}
        row={trendRow}
        pharmacyId={pharmacyId}
      />
      <RunPredictionDialog
        open={predictionDialog}
        onOpenChange={setPredictionDialog}
        stock={stock}
        predictions={predictions}
        pharmacyId={pharmacyId}
      />
    </Card>
  );
}