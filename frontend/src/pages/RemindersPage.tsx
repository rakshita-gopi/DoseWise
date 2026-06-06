import { useEffect, useState } from 'react';
import { Bell, Check, X, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { inventoryApi, doseApi, notificationApi } from '../lib/services';
import type { DoseLog, Notification } from '../types';
import { Card, Badge, Button, Spinner, EmptyState } from '../components/ui';
import { formatDate } from '../lib/utils';

export function RemindersPage() {
  const { activePatient, notifications, refreshNotifications } = useAuth();
  const [doses, setDoses] = useState<DoseLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activePatient) return;
    setLoading(true);
    inventoryApi
      .reminders(activePatient._id)
      .then(({ data }) => setDoses(data))
      .finally(() => setLoading(false));
  }, [activePatient]);

  const updateDose = async (id: string, status: string) => {
    try {
      const { data } = await doseApi.updateStatus(id, status);
      setDoses((prev) => prev.map((d) => (d._id === id ? data : d)));
      toast.success(status === 'taken' ? 'Dose marked as taken!' : `Dose ${status}`);
    } catch {
      toast.error('Failed to update dose');
    }
  };

  const markRead = async (id: string) => {
    await notificationApi.markRead(id);
    refreshNotifications();
  };

  if (!activePatient) return <EmptyState icon={<Bell />} title="No profile selected" />;

  const slotIcon = { morning: '🌅', afternoon: '☀️', night: '🌙' };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Reminders & Notifications</h1>
        <p className="text-sm text-slate-500">Today&apos;s doses and alerts for {activePatient.name}</p>
      </div>

      <Card>
        <h2 className="mb-4 font-display font-semibold">Today&apos;s Doses</h2>
        {loading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : doses.length === 0 ? (
          <EmptyState icon={<Clock />} title="No doses scheduled" description="Upload a prescription to get reminders" />
        ) : (
          <div className="space-y-3">
            {doses.map((dose) => (
              <div key={dose._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{slotIcon[dose.scheduledTime]}</span>
                  <div>
                    <p className="font-semibold">{dose.medicineName}</p>
                    <p className="text-xs capitalize text-slate-500">{dose.scheduledTime} dose</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {dose.status === 'pending' ? (
                    <>
                      <Button size="sm" onClick={() => updateDose(dose._id, 'taken')}>
                        <Check className="h-3.5 w-3.5" /> Taken
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => updateDose(dose._id, 'skipped')}>
                        Skip
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => updateDose(dose._id, 'snoozed')}>
                        <Clock className="h-3.5 w-3.5" /> Snooze
                      </Button>
                    </>
                  ) : (
                    <Badge status={dose.status} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display font-semibold">Notifications</h2>
          <Button size="sm" variant="ghost" onClick={() => notificationApi.markAllRead().then(refreshNotifications)}>
            Mark all read
          </Button>
        </div>
        {notifications.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No notifications yet</p>
        ) : (
          <div className="space-y-2">
            {notifications.map((n: Notification) => (
              <div
                key={n._id}
                className={`flex items-start justify-between gap-3 rounded-xl p-3 ${n.status === 'unread' ? 'bg-brand-50/50' : 'bg-slate-50'}`}
              >
                <div>
                  <p className="text-sm font-medium">{n.title || n.type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-slate-500">{n.message}</p>
                  <p className="mt-1 text-[10px] text-slate-400">{formatDate(n.createdAt)}</p>
                </div>
                {n.status === 'unread' && (
                  <button onClick={() => markRead(n._id)} className="text-brand-600 hover:text-brand-700">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
