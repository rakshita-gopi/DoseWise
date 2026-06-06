import { motion } from 'framer-motion';
import { FileText, Pill, Sparkles, Calendar, User } from 'lucide-react';
import type { Prescription } from '../../types';
import { Badge } from '../ui';
import { formatDate } from '../../lib/utils';
import { cn } from '../../lib/utils';

interface PrescriptionCardProps {
  prescription: Prescription;
  index: number;
  onClick: () => void;
}

export function PrescriptionCard({ prescription, index, onClick }: PrescriptionCardProps) {
  const medCount = prescription.medicines?.length || 0;
  const dailyDoses = prescription.medicines?.reduce(
    (sum, m) => sum + (m.morning || 0) + (m.afternoon || 0) + (m.night || 0),
    0
  ) || 0;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35, ease: 'easeOut' }}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'group relative w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-card transition-shadow',
        'hover:border-brand-200 hover:shadow-lg hover:shadow-brand-500/10',
        'dark:border-slate-700/60 dark:bg-slate-900/70 dark:hover:border-brand-800'
      )}
    >
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand-500/5 transition-transform group-hover:scale-150 dark:bg-brand-400/5" />

      <div className="relative flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-500/25">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display font-semibold text-surface-900 dark:text-white">
            {prescription.title || `Dr. ${prescription.doctorName || 'Unknown'}`}
          </h3>
          {prescription.doctorName && prescription.title && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <User className="h-3 w-3" /> Dr. {prescription.doctorName}
            </p>
          )}
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
            <Calendar className="h-3 w-3" /> {formatDate(prescription.prescribedDate || prescription.createdAt)}
          </p>
        </div>
      </div>

      <div className="relative mt-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
          <Pill className="h-3 w-3" /> {medCount} medicines
        </span>
        <span className="rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
          {dailyDoses} doses/day
        </span>
        <Badge status={prescription.status} />
        {prescription.aiExtracted && (
          <span className="badge bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
            <Sparkles className="mr-1 inline h-3 w-3" />AI
          </span>
        )}
      </div>

      <div className="relative mt-3 flex flex-wrap gap-1.5">
        {prescription.medicines?.slice(0, 3).map((m, i) => (
          <span
            key={i}
            className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800/60 dark:text-slate-400"
          >
            {m.medicineName}
          </span>
        ))}
        {medCount > 3 && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400 dark:bg-surface-800">
            +{medCount - 3} more
          </span>
        )}
      </div>
    </motion.button>
  );
}
