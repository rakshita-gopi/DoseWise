import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Pill, AlertTriangle, TrendingUp, CheckCircle2, Plus, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { inventoryApi } from '../lib/services';
import type { DashboardData } from '../types';
import { Card, Badge, Spinner, EmptyState } from '../components/ui';
import { getGreeting, formatDate, daysRemaining } from '../lib/utils';

const PIE_COLORS = ['#10b981', '#ef4444', '#94a3b8'];

export function DashboardPage() {
  const { activePatient, user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activePatient) return;
    setLoading(true);
    inventoryApi
      .dashboard(activePatient._id)
      .then(({ data: d }) => setData(d))
      .finally(() => setLoading(false));
  }, [activePatient]);

  if (!activePatient) {
    return <EmptyState icon={<Pill />} title="No profile selected" description="Create or select a patient profile" />;
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!data) return null;

  const adherenceData = [
    { name: 'Taken', value: data.adherence.taken },
    { name: 'Missed', value: data.adherence.missed },
    { name: 'Skipped', value: data.adherence.skipped },
  ];

  const stockChart = data.inventory.slice(0, 6).map((i) => ({
    name: i.medicineName.slice(0, 10),
    stock: i.availableQuantity,
    days: daysRemaining(i.availableQuantity, i.dailyUsage) ?? 0,
  }));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-500">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{getGreeting()}, {user?.name?.split(' ')[0]}</p>
          <h1 className="font-display text-2xl font-bold text-surface-900">
            {activePatient.name}&apos;s Health Dashboard
          </h1>
        </div>
        <div className="flex gap-2">
          <Link to="/prescriptions" className="btn-secondary text-sm">
            <Plus className="h-4 w-4" /> Upload Rx
          </Link>
          <Link to="/assistant" className="btn-primary text-sm">
            <Sparkles className="h-4 w-4" /> Ask AI
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Medicines', value: data.summary.totalMedicines, icon: Pill, color: 'text-brand-600 bg-brand-50' },
          { label: 'Active', value: data.summary.activeMedicines, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Low Stock', value: data.summary.lowStockCount, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50' },
          { label: 'Adherence', value: `${data.summary.adherenceRate}%`, icon: TrendingUp, color: 'text-violet-600 bg-violet-50' },
        ].map(({ label, value, icon: Icon, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.35 }}
          >
          <Card className="flex items-center gap-4">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-900">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Stock Chart */}
        <Card>
          <h2 className="mb-4 font-display font-semibold">Medicine Stock Levels</h2>
          {stockChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stockChart}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="stock" fill="#0891b2" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">No inventory data yet</p>
          )}
        </Card>

        {/* Adherence */}
        <Card>
          <h2 className="mb-4 font-display font-semibold">Dose Adherence (30 days)</h2>
          {data.adherence.total > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={adherenceData} dataKey="value" innerRadius={50} outerRadius={70} paddingAngle={3}>
                    {adherenceData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 text-sm">
                <p><span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500 mr-2" />Taken: {data.adherence.taken}</p>
                <p><span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500 mr-2" />Missed: {data.adherence.missed}</p>
                <p><span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-400 mr-2" />Skipped: {data.adherence.skipped}</p>
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">Start tracking doses to see adherence</p>
          )}
        </Card>
      </div>

      {/* Low Stock Alerts */}
      {data.lowStock.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <h2 className="mb-3 flex items-center gap-2 font-display font-semibold text-amber-800">
            <AlertTriangle className="h-5 w-5" /> Low Stock Alerts
          </h2>
          <div className="space-y-2">
            {data.lowStock.map((item) => (
              <div key={item._id} className="flex items-center justify-between rounded-xl bg-white p-3">
                <div>
                  <p className="font-medium">{item.medicineName}</p>
                  <p className="text-xs text-slate-500">
                    {item.availableQuantity} tablets left · {daysRemaining(item.availableQuantity, item.dailyUsage)} days remaining
                  </p>
                </div>
                <Badge status={item.status} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Refill Predictions */}
      <Card>
        <h2 className="mb-4 font-display font-semibold">AI Refill Predictions</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-500">
                <th className="pb-2 font-medium">Medicine</th>
                <th className="pb-2 font-medium">Stock</th>
                <th className="pb-2 font-medium">Days Left</th>
                <th className="pb-2 font-medium">Exhaustion Date</th>
              </tr>
            </thead>
            <tbody>
              {data.predictions.map((p) => (
                <tr key={p.medicineName} className="border-b border-slate-50">
                  <td className="py-3 font-medium">{p.medicineName}</td>
                  <td className="py-3">{data.inventory.find((i) => i.medicineName === p.medicineName)?.availableQuantity ?? '—'}</td>
                  <td className="py-3">{p.daysRemaining ?? '—'}</td>
                  <td className="py-3">{formatDate(p.exhaustionDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
