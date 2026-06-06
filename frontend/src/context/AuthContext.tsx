import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { User, Patient, Notification } from '../types';
import { authApi, patientApi, notificationApi } from '../lib/services';
import { connectSocket, disconnectSocket } from '../lib/socket';

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

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
      setPatients(data);
      setActivePatient((prev) => prev || data.find((p) => p.isPrimary) || data[0] || null);
    } catch {
      /* ignore */
    }
  }, []);

  const login = useCallback(
    (token: string, u: User, primaryPatientId?: string) => {
      localStorage.setItem('dosewise_token', token);
      localStorage.setItem('dosewise_user', JSON.stringify(u));
      setUser(u);

      connectSocket(u.id, {
        onNotification: (n) => setNotifications((prev) => [n, ...prev]),
      });

      refreshPatients().then(() => {
        if (primaryPatientId) {
          patientApi.get(primaryPatientId).then(({ data }) => setActivePatient(data)).catch(() => {});
        }
      });
      refreshNotifications();
    },
    [refreshPatients, refreshNotifications]
  );

  const logout = useCallback(() => {
    localStorage.removeItem('dosewise_token');
    localStorage.removeItem('dosewise_user');
    disconnectSocket();
    setUser(null);
    setPatients([]);
    setActivePatient(null);
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
          return Promise.all([refreshPatients(), refreshNotifications()]);
        })
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [logout, refreshPatients, refreshNotifications]);

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
