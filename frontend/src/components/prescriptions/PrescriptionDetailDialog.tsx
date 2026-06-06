import { Pencil, Trash2, ExternalLink } from 'lucide-react';
import type { Prescription } from '../../types';
import { Badge, Button } from '../ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { formatDate } from '../../lib/utils';

interface PrescriptionDetailDialogProps {
  prescription: Prescription | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function PrescriptionDetailDialog({
  prescription,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: PrescriptionDetailDialogProps) {
  if (!prescription) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{prescription.title || `Dr. ${prescription.doctorName || 'Prescription'}`}</DialogTitle>
          <DialogDescription>
            {prescription.hospital && `${prescription.hospital} · `}
            Prescribed {formatDate(prescription.prescribedDate)}
            {prescription.nextReviewDate && ` · Review by ${formatDate(prescription.nextReviewDate)}`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <Badge status={prescription.status} />
          {prescription.aiExtracted && (
            <span className="badge bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">AI Extracted</span>
          )}
        </div>

        {prescription.uploadedFile && (
          <a
            href={prescription.uploadedFile}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            <ExternalLink className="h-4 w-4" /> View uploaded file
          </a>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-surface-800 dark:text-slate-400">
                <th className="px-4 py-3">Medicine</th>
                <th className="px-4 py-3">Strength</th>
                <th className="px-4 py-3">🌅</th>
                <th className="px-4 py-3">☀️</th>
                <th className="px-4 py-3">🌙</th>
                <th className="px-4 py-3">Food</th>
              </tr>
            </thead>
            <tbody>
              {prescription.medicines.map((m, i) => (
                <tr key={i} className="border-b border-slate-50 last:border-0 dark:border-slate-800">
                  <td className="px-4 py-3 font-medium dark:text-slate-200">{m.medicineName}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{m.strength || '—'}</td>
                  <td className="px-4 py-3">{m.morning}</td>
                  <td className="px-4 py-3">{m.afternoon}</td>
                  <td className="px-4 py-3">{m.night}</td>
                  <td className="px-4 py-3 capitalize text-slate-500">{m.foodType?.replace(/_/g, ' ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between gap-3 pt-2">
          <Button variant="danger" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
          <Button onClick={onEdit}>
            <Pencil className="h-4 w-4" /> Edit Prescription
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
