import api from './api';
import type { User, Patient, Prescription, InventoryItem, DashboardData, Notification, DoseLog, ChatMessage, Document, Purchase } from '../types';

export const authApi = {
  register: (data: { name: string; email: string; password: string; phone?: string; role?: string }) =>
    api.post<{ token: string; user: User; primaryPatientId: string }>('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post<{ token: string; user: User; primaryPatientId: string }>('/auth/login', data),
  me: () => api.get<{ user: User; primaryPatientId: string }>('/auth/me'),
};

export const patientApi = {
  list: () => api.get<Patient[]>('/patients'),
  get: (id: string) => api.get<Patient>(`/patients/${id}`),
  create: (data: Partial<Patient>) => api.post<Patient>('/patients', data),
  update: (id: string, data: Partial<Patient>) => api.put<Patient>(`/patients/${id}`, data),
  delete: (id: string) => api.delete(`/patients/${id}`),
};

export interface ParsedPrescription {
  doctorName?: string | null;
  hospital?: string | null;
  prescribedDate?: string | null;
  nextReviewDate?: string | null;
  medicines: Prescription['medicines'];
}

export const prescriptionApi = {
  list: (patientId: string) => api.get<Prescription[]>(`/prescriptions/patient/${patientId}`),
  get: (id: string) => api.get<Prescription>(`/prescriptions/${id}`),
  parse: (formData: FormData) =>
    api.post<{ extracted: ParsedPrescription; interactions: unknown; uploadedFile?: string; source: string }>(
      '/prescriptions/parse',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ),
  save: (data: Record<string, unknown>) =>
    api.post<{ prescription: Prescription; interactions: unknown }>('/prescriptions/save', data),
  update: (id: string, data: Record<string, unknown>) => api.put<Prescription>(`/prescriptions/${id}`, data),
  delete: (id: string) => api.delete(`/prescriptions/${id}`),
  upload: (formData: FormData) =>
    api.post<{ prescription: Prescription; interactions: unknown }>('/prescriptions/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const purchaseApi = {
  list: (patientId: string) => api.get<Purchase[]>(`/purchases/patient/${patientId}`),
  upload: (formData: FormData) =>
    api.post('/purchases/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const inventoryApi = {
  list: (patientId: string) => api.get<InventoryItem[]>(`/inventory/patient/${patientId}`),
  dashboard: (patientId: string) => api.get<DashboardData>(`/inventory/patient/${patientId}/dashboard`),
  reminders: (patientId: string) => api.get<DoseLog[]>(`/inventory/patient/${patientId}/reminders`),
  update: (id: string, data: Partial<InventoryItem>) => api.patch<InventoryItem>(`/inventory/${id}`, data),
};

export const doseApi = {
  list: (patientId: string) => api.get<DoseLog[]>(`/doses/patient/${patientId}`),
  adherence: (patientId: string) => api.get(`/doses/patient/${patientId}/adherence`),
  updateStatus: (id: string, status: string) => api.patch<DoseLog>(`/doses/${id}/status`, { status }),
};

export const notificationApi = {
  list: () => api.get<Notification[]>('/notifications'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

export const documentApi = {
  list: (patientId: string) => api.get<Document[]>(`/documents/patient/${patientId}`),
  upload: (formData: FormData) =>
    api.post<Document>('/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id: string) => api.delete(`/documents/${id}`),
};

export const chatApi = {
  history: () => api.get<ChatMessage[]>('/chat/history'),
  send: (message: string, patientId?: string) =>
    api.post<{ reply: ChatMessage }>('/chat/message', { message, patientId }),
};

export const caregiverApi = {
  patients: () => api.get('/caregiver/patients'),
  patientDetail: (id: string) => api.get(`/caregiver/patient/${id}`),
};
