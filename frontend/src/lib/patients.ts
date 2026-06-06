import type { Patient, User } from '../types';

/** Profiles whose health data (Rx, inventory, docs) should be shown in the app */
export function getManagedPatients(user: User | null, patients: Patient[]): Patient[] {
  if (!user || !patients.length) return [];

  if (user.role === 'caregiver') {
    return patients.filter((p) => p.relationship !== 'self' && p.relationship !== 'caregiver');
  }

  return patients;
}

export function shouldShowProfileSwitcher(user: User | null, patients: Patient[]): boolean {
  const managed = getManagedPatients(user, patients);
  if (user?.role === 'caregiver') return managed.length >= 1;
  return patients.length > 1;
}

export function getDefaultActivePatient(user: User | null, patients: Patient[], storedId?: string | null): Patient | null {
  if (!patients.length) return null;

  if (storedId) {
    const stored = patients.find((p) => p._id === storedId);
    if (stored) {
      if (user?.role === 'caregiver' && (stored.relationship === 'self' || stored.relationship === 'caregiver')) {
        /* fall through */
      } else {
        return stored;
      }
    }
  }

  const managed = getManagedPatients(user, patients);
  if (user?.role === 'caregiver') {
    return managed[0] || null;
  }

  return patients.find((p) => p.isPrimary) || patients[0];
}
