import { Save, Trash2 } from 'lucide-react';
import type { InventoryItem } from '../../types';
import { Button, Input, Label, Spinner } from '../ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';

export interface InventoryFormData {
  medicineName: string;
  strength: string;
  availableQuantity: number;
  morning: number;
  afternoon: number;
  night: number;
  expiryDate: string;
  batchNumber: string;
  lowStockThreshold: number;
}

export function itemToForm(item: InventoryItem): InventoryFormData {
  return {
    medicineName: item.medicineName,
    strength: item.strength || '',
    availableQuantity: item.availableQuantity,
    morning: item.morning,
    afternoon: item.afternoon,
    night: item.night,
    expiryDate: item.expiryDate ? item.expiryDate.split('T')[0] : '',
    batchNumber: item.batchNumber || '',
    lowStockThreshold: item.lowStockThreshold ?? 7,
  };
}

interface InventoryEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: InventoryFormData;
  onChange: (data: InventoryFormData) => void;
  onSave: () => void;
  onDelete?: () => void;
  saving?: boolean;
  deleting?: boolean;
}

export function InventoryEditor({ open, onOpenChange, data, onChange, onSave, onDelete, saving, deleting }: InventoryEditorProps) {
  const daily = data.morning + data.afternoon + data.night;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Medicine</DialogTitle>
          <DialogDescription>Update stock, dosage schedule, and expiry details.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Medicine Name *</Label>
            <Input value={data.medicineName} onChange={(e) => onChange({ ...data, medicineName: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Strength</Label>
              <Input value={data.strength} onChange={(e) => onChange({ ...data, strength: e.target.value })} placeholder="500mg" />
            </div>
            <div>
              <Label>Stock Quantity *</Label>
              <Input type="number" min={0} value={data.availableQuantity} onChange={(e) => onChange({ ...data, availableQuantity: Number(e.target.value) })} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>🌅 Morning</Label>
              <Input type="number" min={0} value={data.morning} onChange={(e) => onChange({ ...data, morning: Number(e.target.value) })} />
            </div>
            <div>
              <Label>☀️ Afternoon</Label>
              <Input type="number" min={0} value={data.afternoon} onChange={(e) => onChange({ ...data, afternoon: Number(e.target.value) })} />
            </div>
            <div>
              <Label>🌙 Night</Label>
              <Input type="number" min={0} value={data.night} onChange={(e) => onChange({ ...data, night: Number(e.target.value) })} />
            </div>
          </div>

          <p className="rounded-lg bg-brand-50/80 px-3 py-2 text-xs text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
            Daily usage: <strong>{daily}</strong> doses/day
            {daily > 0 && data.availableQuantity > 0 && (
              <> · ~{Math.floor(data.availableQuantity / daily)} days remaining</>
            )}
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Expiry Date</Label>
              <Input type="date" value={data.expiryDate} onChange={(e) => onChange({ ...data, expiryDate: e.target.value })} />
            </div>
            <div>
              <Label>Batch Number</Label>
              <Input value={data.batchNumber} onChange={(e) => onChange({ ...data, batchNumber: e.target.value })} />
            </div>
            <div>
              <Label>Low Stock Alert (days)</Label>
              <Input type="number" min={1} value={data.lowStockThreshold} onChange={(e) => onChange({ ...data, lowStockThreshold: Number(e.target.value) })} />
            </div>
          </div>

          <div className="flex justify-between gap-3 pt-2">
            {onDelete ? (
              <Button variant="danger" size="sm" onClick={onDelete} disabled={deleting || saving}>
                {deleting ? <Spinner /> : <><Trash2 className="h-4 w-4" /> Delete</>}
              </Button>
            ) : <span />}
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={onSave} disabled={saving || deleting || !data.medicineName.trim()}>
                {saving ? <Spinner /> : <><Save className="h-4 w-4" /> Save Changes</>}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
