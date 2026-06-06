import { Link } from 'react-router-dom';
import { Pill, Shield, Sparkles, Clock, Users } from 'lucide-react';
import { Button } from './ui';
import { ThemeToggle } from './ThemeToggle';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-950 via-surface-900 to-brand-900 text-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500">
            <Pill className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-bold">DoseWise</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link to="/login" className="btn-ghost text-white hover:bg-white/10">
            Sign In
          </Link>
          <Link to="/register">
            <Button>Get Started</Button>
          </Link>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 pb-24 pt-16 text-center lg:pt-24">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-500/10 px-4 py-1.5 text-sm text-brand-200">
          <Sparkles className="h-4 w-4" />
          AI-Powered Medicine Management
        </div>
        <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          Never miss a dose.
          <br />
          <span className="bg-gradient-to-r from-brand-300 to-cyan-200 bg-clip-text text-transparent">
            Never run out of medicine.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300">
          DoseWise automatically tracks your medicines, predicts refills, sends smart reminders, and keeps your
          entire family&apos;s health records in one secure place.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link to="/register">
            <Button size="lg" className="shadow-glow">
              Start Free — Create Account
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="secondary" className="border-white/20 bg-white/10 text-white hover:bg-white/20">
              Sign In
            </Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Sparkles, title: 'AI Prescription Parser', desc: 'Upload prescriptions — AI extracts medicines automatically' },
          { icon: Clock, title: 'Smart Reminders', desc: 'Morning, afternoon & night dose alerts with Taken/Skip/Snooze' },
          { icon: Shield, title: 'Inventory Tracking', desc: 'Auto daily consumption & low-stock alerts before you run out' },
          { icon: Users, title: 'Family & Caregiver', desc: 'Manage multiple profiles and monitor elderly parents remotely' },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/20 text-brand-300">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="font-display font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-slate-400">{desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
