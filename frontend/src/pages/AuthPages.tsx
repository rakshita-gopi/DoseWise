import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Pill } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../lib/services';
import { Button, Input, Label, Spinner } from '../components/ui';
import { PasswordInput } from '../components/ui/PasswordInput';
import { ThemeToggle } from '../components/ThemeToggle';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authApi.login({ email, password });
      login(data.token, data.user, data.primaryPatientId);
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden flex-1 flex-col justify-between bg-gradient-to-br from-brand-700 to-brand-900 p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
            <Pill className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-bold">DoseWise</span>
        </div>
        <div>
          <h2 className="font-display text-3xl font-bold">Your health, organized.</h2>
          <p className="mt-3 max-w-md text-brand-100">
            Track medicines, get AI-powered refill predictions, and never miss a dose again.
          </p>
        </div>
        <p className="text-sm text-brand-200">© 2026 DoseWise Healthcare</p>
      </div>

      <div className="relative flex flex-1 items-center justify-center p-6 dark:bg-surface-950">
        <div className="absolute right-6 top-6"><ThemeToggle /></div>
        <form onSubmit={handleSubmit} className="w-full max-w-md animate-slide-up">
          <h1 className="font-display text-2xl font-bold text-surface-900 dark:text-white">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your DoseWise account</p>

          <div className="mt-8 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Enter your password" />
            </div>
          </div>

          <Button type="submit" className="mt-6 w-full" disabled={loading}>
            {loading ? <Spinner /> : 'Sign In'}
          </Button>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'patient' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authApi.register(form);
      login(data.token, data.user, data.primaryPatientId);
      toast.success('Account created! Welcome to DoseWise.');
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Registration failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-surface-50 p-6 dark:bg-surface-950">
      <div className="absolute right-6 top-6"><ThemeToggle /></div>
      <form onSubmit={handleSubmit} className="w-full max-w-md animate-slide-up">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white">
            <Pill className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-bold dark:text-white">Create your account</h1>
          <p className="mt-1 text-sm text-slate-500">Join DoseWise — smart medicine management</p>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Full Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <Label>Phone (optional)</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <Label>Password</Label>
            <PasswordInput value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} placeholder="Create a password" />
          </div>
          <div>
            <Label>Account Type</Label>
            <select
              className="input"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="patient">Patient</option>
              <option value="caregiver">Caregiver</option>
            </select>
          </div>
        </div>

        <Button type="submit" className="mt-6 w-full" disabled={loading}>
          {loading ? <Spinner /> : 'Create Account'}
        </Button>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-600">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
