import { Plus, Trash2, Save } from 'lucide-react';
import type { Medicine } from '../../types';
import { Button, Input, Label, Select, Spinner } from '../ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';

export interface PrescriptionFormData {
  title: string;
  doctorName: string;
  hospital: string;
  prescribedDate: string;
  nextReviewDate: string;
  medicines: Medicine[];
}

const emptyMedicine = (): Medicine => ({
  medicineName: '',
  strength: '',
  morning: 0,
  afternoon: 0,
  night: 0,
  foodType: 'any',
  duration: '',
  instructions: '',
});

interface PrescriptionEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: PrescriptionFormData;
  onChange: (data: PrescriptionFormData) => void;
  onSave: () => void;
  saving?: boolean;
  mode?: 'create' | 'edit';
}

export function PrescriptionEditor({
  open,
  onOpenChange,
  data,
  onChange,
  onSave,
  saving,
  mode = 'create',
}: PrescriptionEditorProps) {
  const updateMedicine = (index: number, field: keyof Medicine, value: string | number) => {
    const medicines = [...data.medicines];
    medicines[index] = { ...medicines[index], [field]: value };
    onChange({ ...data, medicines });
  };

  const addMedicine = () => onChange({ ...data, medicines: [...data.medicines, emptyMedicine()] });

  const removeMedicine = (index: number) => {
    if (data.medicines.length <= 1) return;
    onChange({ ...data, medicines: data.medicines.filter((_, i) => i !== index) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Review & Save Prescription' : 'Edit Prescription'}</DialogTitle>
          <DialogDescription>
            Name your prescription and verify medicine details before saving.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Prescription Name *</Label>
            <Input
              value={data.title}
              onChange={(e) => onChange({ ...data, title: e.target.value })}
              placeholder="e.g. Dr. Sharma — Diabetes Rx, March 2026"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Doctor Name</Label>
              <Input value={data.doctorName} onChange={(e) => onChange({ ...data, doctorName: e.target.value })} />
            </div>
            <div>
              <Label>Hospital / Clinic</Label>
              <Input value={data.hospital} onChange={(e) => onChange({ ...data, hospital: e.target.value })} />
            </div>
            <div>
              <Label>Prescribed Date</Label>
              <Input type="date" value={data.prescribedDate} onChange={(e) => onChange({ ...data, prescribedDate: e.target.value })} />
            </div>
            <div>
              <Label>Next Review Date</Label>
              <Input type="date" value={data.nextReviewDate} onChange={(e) => onChange({ ...data, nextReviewDate: e.target.value })} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="mb-0">Medicines</Label>
              <Button type="button" variant="secondary" size="sm" onClick={addMedicine}>
                <Plus className="h-3.5 w-3.5" /> Add Medicine
              </Button>
            </div>

            {data.medicines.map((med, i) => (
              <div
                key={i}
                className="animate-in fade-in slide-in-from-bottom-2 rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-surface-800/50"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">
                    Medicine {i + 1}
                  </span>
                  {data.medicines.length > 1 && (
                    <button type="button" onClick={() => removeMedicine(i)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label>Medicine Name *</Label>
                    <Input value={med.medicineName} onChange={(e) => updateMedicine(i, 'medicineName', e.target.value)} />
                  </div>
                  <div>
                    <Label>Strength</Label>
                    <Input value={med.strength || ''} onChange={(e) => updateMedicine(i, 'strength', e.target.value)} placeholder="500mg" />
                  </div>
                  <div>
                    <Label>Duration</Label>
                    <Input value={med.duration || ''} onChange={(e) => updateMedicine(i, 'duration', e.target.value)} placeholder="30 days" />
                  </div>
                  <div>
                    <Label>Morning</Label>
                    <Input type="number" min={0} value={med.morning} onChange={(e) => updateMedicine(i, 'morning', Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Afternoon</Label>
                    <Input type="number" min={0} value={med.afternoon} onChange={(e) => updateMedicine(i, 'afternoon', Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Night</Label>
                    <Input type="number" min={0} value={med.night} onChange={(e) => updateMedicine(i, 'night', Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Food Timing</Label>
                    <Select value={med.foodType || 'any'} onChange={(e) => updateMedicine(i, 'foodType', e.target.value)}>
                      <option value="any">Any time</option>
                      <option value="before_food">Before food</option>
                      <option value="after_food">After food</option>
                      <option value="with_food">With food</option>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={onSave} disabled={saving || !data.title.trim()}>
              {saving ? <Spinner /> : <><Save className="h-4 w-4" /> Save Prescription</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function extractedToFormData(
  extracted: {
    doctorName?: string | null;
    hospital?: string | null;
    prescribedDate?: string | null;
    nextReviewDate?: string | null;
    medicines: Medicine[];
  },
  defaultTitle?: string
): PrescriptionFormData {
  return {
    title: defaultTitle || `Prescription — ${new Date().toLocaleDateString('en-IN')}`,
    doctorName: extracted.doctorName || '',
    hospital: extracted.hospital || '',
    prescribedDate: extracted.prescribedDate || new Date().toISOString().split('T')[0],
    nextReviewDate: extracted.nextReviewDate || '',
    medicines: extracted.medicines.map((m) => ({
      medicineName: m.medicineName || '',
      strength: m.strength || '',
      morning: m.morning ?? 0,
      afternoon: m.afternoon ?? 0,
      night: m.night ?? 0,
      foodType: m.foodType || 'any',
      duration: m.duration || '',
      instructions: m.instructions || '',
    })),
  };
}
