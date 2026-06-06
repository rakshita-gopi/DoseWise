import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import { LandingPage } from './components/LandingPage';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { DashboardPage } from './pages/DashboardPage';
import { RemindersPage } from './pages/RemindersPage';
import { PrescriptionsPage } from './pages/PrescriptionsPage';
import { InventoryPage, PurchasesPage } from './pages/InventoryPages';
import { DocumentsPage } from './pages/DocumentsPage';
import { AssistantPage } from './pages/AssistantPage';
import { FamilyPage } from './pages/FamilyPage';
import { CaregiverPage } from './pages/CaregiverPage';
import { ProfilePage } from './pages/ProfilePage';
import { ReportsPage } from './pages/ReportsPage';

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{ className: 'text-sm !bg-white dark:!bg-surface-900 dark:!text-slate-100' }} />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/reminders" element={<RemindersPage />} />
          <Route path="/prescriptions" element={<PrescriptionsPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/purchases" element={<PurchasesPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/family" element={<FamilyPage />} />
          <Route path="/caregiver" element={<CaregiverPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
    </ThemeProvider>
  );
}
