import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAllMedicines, useUpdateStock, type StockWithMedicine } from "@/hooks/usePharmacyDashboard";
import type { Tables } from "@/integrations/supabase/types";

interface UpdateStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pharmacyId: string;
  // Pass an existing stock row to edit it, or null to add a new medicine to stock.
  existingRow: StockWithMedicine | null;
}

export function UpdateStockDialog({
  open,
  onOpenChange,
  pharmacyId,
  existingRow,
}: UpdateStockDialogProps) {
  const { data: allMedicines } = useAllMedicines();
  const updateStock = useUpdateStock(pharmacyId);

  const [medicineId, setMedicineId] = useState<string>(existingRow?.medicine_id ?? "");
  const [quantity, setQuantity] = useState<string>(String(existingRow?.quantity ?? 0));
  const [reorderLevel, setReorderLevel] = useState<string>(
    String(existingRow?.reorder_level ?? 10),
  );

  useEffect(() => {
    setMedicineId(existingRow?.medicine_id ?? "");
    setQuantity(String(existingRow?.quantity ?? 0));
    setReorderLevel(String(existingRow?.reorder_level ?? 10));
  }, [existingRow, open]);

  const selectedMedicine: Tables<"medicines"> | undefined =
    existingRow?.medicines ?? allMedicines?.find((m) => m.id === medicineId);

  const handleSave = async () => {
    if (!medicineId || !selectedMedicine) return;
    await updateStock.mutateAsync({
      pharmacyId,
      medicineId,
      medicineName: selectedMedicine.name,
      stockId: existingRow?.id ?? null,
      quantity: Number(quantity) || 0,
      reorderLevel: Number(reorderLevel) || 0,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingRow ? "Update stock" : "Add medicine to stock"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Medicine</Label>
            {existingRow ? (
              <Input value={existingRow.medicines.name} disabled />
            ) : (
              <Select value={medicineId} onValueChange={setMedicineId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a medicine" />
                </SelectTrigger>
                <SelectContent>
                  {allMedicines?.map((medicine) => (
                    <SelectItem key={medicine.id} value={medicine.id}>
                      {medicine.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min={0}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reorderLevel">Reorder level</Label>
              <Input
                id="reorderLevel"
                type="number"
                min={0}
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!medicineId || updateStock.isPending}>
            {updateStock.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
