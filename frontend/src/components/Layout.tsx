import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Pill,
  FileText,
  ShoppingBag,
  Bell,
  FolderOpen,
  MessageCircle,
  Users,
  UserCircle,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { ThemeToggle } from './ThemeToggle';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/reminders', icon: Bell, label: 'Reminders' },
  { to: '/prescriptions', icon: FileText, label: 'Prescriptions' },
  { to: '/inventory', icon: Pill, label: 'Inventory' },
  { to: '/purchases', icon: ShoppingBag, label: 'Purchases' },
  { to: '/documents', icon: FolderOpen, label: 'Documents' },
  { to: '/assistant', icon: MessageCircle, label: 'AI Assistant' },
  { to: '/family', icon: Users, label: 'Family Profiles' },
  { to: '/caregiver', icon: UserCircle, label: 'Caregiver View' },
  { to: '/profile', icon: UserCircle, label: 'Profile' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, patients, activePatient, setActivePatient, notifications, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();
  const unread = notifications.filter((n) => n.status === 'unread').length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-surface-50 dark:bg-surface-950">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-100 bg-white transition-transform dark:border-slate-800 dark:bg-surface-900 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-5 dark:border-slate-800">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Pill className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-surface-900 dark:text-white">DoseWise</h1>
            <p className="text-[10px] font-medium uppercase tracking-wider text-brand-600 dark:text-brand-400">Smart Medicine</p>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-surface-900 dark:text-slate-400 dark:hover:bg-surface-800 dark:hover:text-slate-100'
                )
              }
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              {label}
              {to === '/reminders' && unread > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-3 dark:border-slate-800">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-slate-100 bg-white/80 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-surface-900/80 lg:px-8">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>

          {patients.length > 1 && (
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:bg-surface-900 dark:hover:bg-surface-800"
              >
                <UserCircle className="h-4 w-4 text-brand-600" />
                {activePatient?.name || 'Select Profile'}
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
              {profileOpen && (
                <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-xl border border-slate-100 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-surface-900">
                  {patients.map((p) => (
                    <button
                      key={p._id}
                      onClick={() => {
                        setActivePatient(p);
                        setProfileOpen(false);
                      }}
                      className={cn(
                        'block w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-surface-800',
                        activePatient?._id === p._id && 'bg-brand-50 text-brand-700 font-medium dark:bg-brand-950 dark:text-brand-300'
                      )}
                    >
                      {p.name}
                      <span className="ml-1 text-xs text-slate-400 capitalize">({p.relationship})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-surface-900 dark:text-slate-100">{user?.name}</p>
              <p className="text-xs capitalize text-slate-500 dark:text-slate-400">{user?.role}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-900 dark:text-brand-300">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
