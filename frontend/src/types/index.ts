export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'patient' | 'caregiver' | 'doctor' | 'admin';
}

export interface Patient {
  _id: string;
  userId: string;
  name: string;
  relationship: string;
  dob?: string;
  age?: number;
  gender?: string;
  bloodGroup?: string;
  height?: number;
  weight?: number;
  address?: string;
  emergencyContact?: { name?: string; phone?: string; relation?: string };
  caregiverDetails?: { name?: string; phone?: string; email?: string };
  medicalConditions?: string[];
  allergies?: string[];
  insuranceInfo?: { provider?: string; policyNumber?: string; validUntil?: string };
  isPrimary?: boolean;
}

export interface Medicine {
  medicineName: string;
  strength?: string;
  morning: number;
  afternoon: number;
  night: number;
  foodType?: string;
  duration?: string;
  instructions?: string;
}

export interface Prescription {
  _id: string;
  patientId: string;
  title?: string;
  doctorName?: string;
  hospital?: string;
  prescribedDate?: string;
  nextReviewDate?: string;
  uploadedFile?: string;
  medicines: Medicine[];
  status: string;
  aiExtracted: boolean;
  createdAt: string;
}

export interface InventoryItem {
  _id: string;
  patientId: string;
  medicineName: string;
  strength?: string;
  availableQuantity: number;
  dailyUsage: number;
  morning: number;
  afternoon: number;
  night: number;
  foodType?: string;
  expiryDate?: string;
  exhaustionDate?: string;
  batchNumber?: string;
  lowStockThreshold?: number;
  status: 'active' | 'low_stock' | 'out_of_stock' | 'expired';
}

export interface Notification {
  _id: string;
  type: string;
  title?: string;
  message: string;
  status: 'unread' | 'read';
  createdAt: string;
}

export interface DoseLog {
  _id: string;
  medicineName: string;
  scheduledTime: 'morning' | 'afternoon' | 'night';
  scheduledAt: string;
  status: 'taken' | 'missed' | 'skipped' | 'snoozed' | 'pending';
  inventoryId?: InventoryItem;
}

export interface DashboardData {
  patient: Patient;
  inventory: InventoryItem[];
  lowStock: InventoryItem[];
  adherence: { total: number; taken: number; missed: number; skipped: number; adherenceRate: number };
  predictions: Array<{ medicineName: string; daysRemaining: number | null; exhaustionDate?: string }>;
  summary: {
    totalMedicines: number;
    activeMedicines: number;
    lowStockCount: number;
    adherenceRate: number;
  };
}

export interface ChatMessage {
  _id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface Document {
  _id: string;
  title: string;
  category: string;
  filePath: string;
  fileType?: string;
  createdAt: string;
}

export interface Purchase {
  _id: string;
  pharmacy?: string;
  purchaseDate: string;
  items: Array<{ medicineName: string; quantity: number; strength?: string }>;
  totalAmount?: number;
}
