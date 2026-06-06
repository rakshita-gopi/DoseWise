import { useEffect, useState } from 'react';
import { Heart, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { caregiverApi, inventoryApi, doseApi } from '../lib/services';
import { Card, Spinner, EmptyState } from '../components/ui';

interface MonitoredPatient {
  _id: string;
  name: string;
  relationship: string;
  adherenceRate: number;
  totalMedicines: number;
  lowStock: number;
  missed: number;
}

export function CaregiverPage() {
  const { user, patients } = useAuth();
  const [monitored, setMonitored] = useState<MonitoredPatient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (user?.role === 'caregiver' || user?.role === 'doctor') {
          const { data } = await caregiverApi.patients();
          setMonitored(
            data.map((p: Record<string, unknown>) => ({
              _id: p._id as string,
              name: p.name as string,
              relationship: p.relationship as string,
              adherenceRate: (p.adherence as { adherenceRate?: number })?.adherenceRate ?? 0,
              totalMedicines: (p.inventorySummary as { total?: number })?.total ?? 0,
              lowStock: (p.inventorySummary as { lowStock?: number })?.lowStock ?? 0,
              missed: (p.adherence as { missed?: number })?.missed ?? 0,
            }))
          );
        } else {
          const family = patients.filter((p) => !p.isPrimary);
          const enriched = await Promise.all(
            family.map(async (p) => {
              try {
                const [dash, adherence] = await Promise.all([
                  inventoryApi.dashboard(p._id),
                  doseApi.adherence(p._id),
                ]);
                return {
                  _id: p._id,
                  name: p.name,
                  relationship: p.relationship,
                  adherenceRate: adherence.data.adherenceRate,
                  totalMedicines: dash.data.summary.totalMedicines,
                  lowStock: dash.data.summary.lowStockCount,
                  missed: adherence.data.missed,
                };
              } catch {
                return { _id: p._id, name: p.name, relationship: p.relationship, adherenceRate: 0, totalMedicines: 0, lowStock: 0, missed: 0 };
              }
            })
          );
          setMonitored(enriched);
        }
      } catch {
        setMonitored([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, patients]);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Caregiver Dashboard</h1>
        <p className="text-sm text-slate-500">Monitor medicines, adherence & stock for your loved ones</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner className="h-8 w-8" /></div>
      ) : monitored.length === 0 ? (
        <EmptyState icon={<Heart />} title="No family members to monitor" description="Add family profiles from the Family Profiles page" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {monitored.map((p) => (
            <Card key={p._id}>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">
                  {p.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold">{p.name}</h3>
                  <p className="text-xs capitalize text-slate-500">{p.relationship}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-emerald-50 p-3">
                  <p className="text-lg font-bold text-emerald-700">{p.adherenceRate}%</p>
                  <p className="text-[10px] text-emerald-600">Adherence</p>
                </div>
                <div className="rounded-xl bg-brand-50 p-3">
                  <p className="text-lg font-bold text-brand-700">{p.totalMedicines}</p>
                  <p className="text-[10px] text-brand-600">Medicines</p>
                </div>
                <div className="rounded-xl bg-amber-50 p-3">
                  <p className="text-lg font-bold text-amber-700">{p.lowStock}</p>
                  <p className="text-[10px] text-amber-600">Low Stock</p>
                </div>
              </div>
              {p.lowStock > 0 && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  <AlertTriangle className="h-4 w-4" />
                  Some medicines need refilling soon
                </div>
              )}
              {p.missed > 0 && (
                <p className="mt-2 text-xs text-red-500">{p.missed} missed doses in last 30 days</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
