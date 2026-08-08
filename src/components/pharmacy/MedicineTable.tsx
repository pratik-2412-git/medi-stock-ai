import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export function MedicineTable({
  pharmacyId,
  stock,
  predictions,
}: {
  pharmacyId: string;
  stock: StockWithMedicine[];
  predictions: PredictionRow[];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<StockWithMedicine | null>(null);

  const predictionByMedicine = new Map<string, PredictionRow>();
  for (const prediction of predictions) {
    predictionByMedicine.set(prediction.medicine_id, prediction);
  }

  const openEdit = (row: StockWithMedicine) => {
    setEditingRow(row);
    setDialogOpen(true);
  };

  const openAdd = () => {
    setEditingRow(null);
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Inventory</CardTitle>
        <Button size="sm" onClick={openAdd}>
          <Plus className="size-4" />
          Update stock
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Medicine</TableHead>
              <TableHead>Current stock</TableHead>
              <TableHead>Reorder level</TableHead>
              <TableHead>Last updated</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stock.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  No medicines tracked yet. Click "Update stock" to add one.
                </TableCell>
              </TableRow>
            )}
            {stock.map((row) => {
              const prediction = predictionByMedicine.get(row.medicine_id);
              const riskClass: ShortageClass =
                (prediction?.shortage_class as ShortageClass | undefined) ?? "None";
              return (
                <TableRow key={row.id}>
                  <TableCell className="font-medium text-foreground">
                    {row.medicines.name}
                  </TableCell>
                  <TableCell>{row.quantity}</TableCell>
                  <TableCell>{row.reorder_level}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(row.updated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={shortageBadgeClasses[riskClass]}>
                      {riskClass === "None" ? "Safe" : riskClass}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                      Update
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>

      <UpdateStockDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        pharmacyId={pharmacyId}
        existingRow={editingRow}
      />
    </Card>
  );
}
