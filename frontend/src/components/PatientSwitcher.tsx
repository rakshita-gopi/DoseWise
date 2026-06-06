import { useState } from 'react';
import { UserCircle, ChevronDown, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getManagedPatients, shouldShowProfileSwitcher } from '../lib/patients';
import { cn } from '../lib/utils';

export function PatientSwitcher() {
  const { user, patients, activePatient, setActivePatient } = useAuth();
  const [open, setOpen] = useState(false);

  if (!shouldShowProfileSwitcher(user, patients)) return null;

  const managed = getManagedPatients(user, patients);
  const list = user?.role === 'caregiver' ? managed : patients;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
      >
        <UserCircle className="h-4 w-4 text-brand-600 dark:text-brand-400" />
        <span className="max-w-[140px] truncate">{activePatient?.name || 'Select person'}</span>
        {activePatient?.relationship && activePatient.relationship !== 'self' && (
          <span className="hidden capitalize text-slate-400 sm:inline">({activePatient.relationship})</span>
        )}
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-900">
            <p className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {user?.role === 'caregiver' ? 'Managing medicines for' : 'Switch profile'}
            </p>
            {list.map((p) => (
              <button
                key={p._id}
                onClick={() => {
                  setActivePatient(p);
                  setOpen(false);
                }}
                className={cn(
                  'block w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800',
                  activePatient?._id === p._id && 'bg-brand-50 font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
                )}
              >
                <span className="font-medium">{p.name}</span>
                <span className="ml-1.5 text-xs capitalize text-slate-400">({p.relationship})</span>
              </button>
            ))}
            {user?.role === 'caregiver' && (
              <Link
                to="/family"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-sm text-brand-600 hover:bg-slate-50 dark:border-slate-700 dark:text-brand-400 dark:hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" /> Add father, mother...
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function ActivePatientBanner() {
  const { user, activePatient } = useAuth();

  if (!activePatient || user?.role !== 'caregiver') return null;

  return (
    <div className="mb-4 flex items-center gap-2 rounded-xl border border-brand-200/80 bg-brand-50/50 px-4 py-2.5 text-sm dark:border-brand-800/50 dark:bg-brand-900/20">
      <UserCircle className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
      <span className="text-slate-700 dark:text-slate-300">
        Viewing health records for{' '}
        <strong className="text-slate-900 dark:text-white">{activePatient.name}</strong>
        <span className="ml-1 capitalize text-slate-500">({activePatient.relationship})</span>
      </span>
    </div>
  );
}
