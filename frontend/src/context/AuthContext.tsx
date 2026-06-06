import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { User, Patient, Notification } from '../types';
import { authApi, patientApi, notificationApi } from '../lib/services';
import { connectSocket, disconnectSocket } from '../lib/socket';
import { getDefaultActivePatient } from '../lib/patients';

const ACTIVE_PATIENT_KEY = 'dosewise_active_patient';

interface AuthContextType {
  user: User | null;
  patients: Patient[];
  activePatient: Patient | null;
  notifications: Notification[];
  loading: boolean;
  setActivePatient: (p: Patient | null) => void;
  login: (token: string, user: User, primaryPatientId?: string) => void;
  logout: () => void;
  refreshPatients: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function persistActivePatient(patient: Patient | null) {
  if (patient) {
    localStorage.setItem(ACTIVE_PATIENT_KEY, patient._id);
  } else {
    localStorage.removeItem(ACTIVE_PATIENT_KEY);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [activePatient, setActivePatientState] = useState<Patient | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const setActivePatient = useCallback((p: Patient | null) => {
    setActivePatientState(p);
    persistActivePatient(p);
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const { data } = await notificationApi.list();
      setNotifications(data);
    } catch {
      /* ignore */
    }
  }, []);

  const refreshPatients = useCallback(async () => {
    try {
      const { data } = await patientApi.list();
      const storedId = localStorage.getItem(ACTIVE_PATIENT_KEY);
      const currentUser =
        user || (JSON.parse(localStorage.getItem('dosewise_user') || 'null') as User | null);
      setPatients(data);
      setActivePatientState((prev) => {
        const next = getDefaultActivePatient(currentUser, data, prev?._id || storedId);
        if (next) persistActivePatient(next);
        return next;
      });
    } catch {
      /* ignore */
    }
  }, [user]);

  const login = useCallback(
    (token: string, u: User, primaryPatientId?: string) => {
      localStorage.setItem('dosewise_token', token);
      localStorage.setItem('dosewise_user', JSON.stringify(u));
      setUser(u);

      connectSocket(u.id, {
        onNotification: (n) => setNotifications((prev) => [n, ...prev]),
      });

      patientApi.list().then(({ data }) => {
        setPatients(data);
        const storedId = localStorage.getItem(ACTIVE_PATIENT_KEY);
        const active = getDefaultActivePatient(u, data, storedId || primaryPatientId);
        if (active) {
          setActivePatientState(active);
          persistActivePatient(active);
        } else if (primaryPatientId && u.role !== 'caregiver') {
          patientApi.get(primaryPatientId).then(({ data: p }) => {
            setActivePatientState(p);
            persistActivePatient(p);
          }).catch(() => {});
        }
      });

      refreshNotifications();
    },
    [refreshNotifications]
  );

  const logout = useCallback(() => {
    localStorage.removeItem('dosewise_token');
    localStorage.removeItem('dosewise_user');
    localStorage.removeItem(ACTIVE_PATIENT_KEY);
    disconnectSocket();
    setUser(null);
    setPatients([]);
    setActivePatientState(null);
    setNotifications([]);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('dosewise_token');
    const stored = localStorage.getItem('dosewise_user');

    if (token && stored) {
      authApi
        .me()
        .then(({ data }) => {
          setUser(data.user);
          connectSocket(data.user.id, {
            onNotification: (n) => setNotifications((prev) => [n, ...prev]),
          });
          return patientApi.list().then(({ data: patientList }) => {
            setPatients(patientList);
            const storedId = localStorage.getItem(ACTIVE_PATIENT_KEY);
            const active = getDefaultActivePatient(data.user, patientList, storedId || data.primaryPatientId);
            if (active) {
              setActivePatientState(active);
              persistActivePatient(active);
            }
            return refreshNotifications();
          });
        })
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [logout, refreshNotifications]);

  return (
    <AuthContext.Provider
      value={{
        user,
        patients,
        activePatient,
        notifications,
        loading,
        setActivePatient,
        login,
        logout,
        refreshPatients,
        refreshNotifications,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
