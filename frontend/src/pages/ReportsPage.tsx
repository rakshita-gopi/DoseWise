import { useEffect, useState } from 'react';
import { AlertTriangle, FileBarChart, Phone, Printer } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { reportApi, type StockReport } from '../lib/services';
import { Card, Badge, Spinner, EmptyState, Button } from '../components/ui';
import { PageHeader } from '../components/ui/PageHeader';
import { formatDate } from '../lib/utils';

export function ReportsPage() {
  const { activePatient, user } = useAuth();
  const [report, setReport] = useState<StockReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activePatient) return;
    setLoading(true);
    reportApi
      .stock(activePatient._id)
      .then(({ data }) => setReport(data))
      .finally(() => setLoading(false));
  }, [activePatient]);

  if (!activePatient) {
    return <EmptyState icon={<FileBarChart />} title="No profile selected" description="Select a patient to view stock reports" />;
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!report) return null;

  const handlePrint = () => window.print();

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Stock Reports"
        description={`Low stock and out-of-stock alerts for ${activePatient.name}`}
        action={
          <Button variant="secondary" onClick={handlePrint}>
            <Printer className="h-4 w-4" /> Print Report
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Medicines', value: report.summary.total },
          { label: 'Low Stock', value: report.summary.lowStock, warn: true },
          { label: 'Out of Stock', value: report.summary.outOfStock, danger: true },
          { label: 'Active', value: report.summary.active },
        ].map(({ label, value, warn, danger }) => (
          <Card key={label} className={danger ? 'border-red-200 dark:border-red-900/50' : warn ? 'border-amber-200 dark:border-amber-900/50' : ''}>
            <p className={`text-2xl font-bold ${danger ? 'text-red-600 dark:text-red-400' : warn ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-slate-100'}`}>
              {value}
            </p>
            <p className="muted text-xs">{label}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="section-title">SMS Notifications</h2>
            <p className="muted text-sm">
              Alerts are sent to your saved mobile number when stock runs low or out.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2 dark:bg-slate-900/60">
            <Phone className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {report.notifyPhone || user?.phone || 'No phone saved — add one in Profile'}
            </span>
          </div>
        </div>
        <p className="muted mt-2 text-xs">Generated {formatDate(report.generatedAt)} · Default alert threshold: 2 days</p>
      </Card>

      {(report.outOfStock.length > 0 || report.lowStock.length > 0) && (
        <Card className="alert-warning">
          <h2 className="mb-4 flex items-center gap-2 font-display font-semibold text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-5 w-5" /> Medicines Needing Refill
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-head">
                  <th className="pb-2 text-left font-medium">Medicine</th>
                  <th className="pb-2 text-left font-medium">Stock</th>
                  <th className="pb-2 text-left font-medium">Days Left</th>
                  <th className="pb-2 text-left font-medium">Status</th>
                  <th className="pb-2 text-left font-medium">Exhaustion</th>
                </tr>
              </thead>
              <tbody>
                {[...report.outOfStock, ...report.lowStock].map((item) => (
                  <tr key={item._id} className="table-row">
                    <td className="py-3 font-medium text-slate-900 dark:text-slate-100">{item.medicineName}</td>
                    <td className="py-3">{item.availableQuantity}</td>
                    <td className="py-3">{item.daysRemaining ?? '—'}</td>
                    <td className="py-3"><Badge status={item.status} /></td>
                    <td className="py-3">{formatDate(item.exhaustionDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="section-title mb-4">Full Inventory</h2>
        {report.allItems.length === 0 ? (
          <p className="muted py-6 text-center text-sm">No medicines in inventory</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-head">
                  <th className="pb-2 text-left font-medium">Medicine</th>
                  <th className="pb-2 text-left font-medium">Stock</th>
                  <th className="pb-2 text-left font-medium">Daily Usage</th>
                  <th className="pb-2 text-left font-medium">Days Left</th>
                  <th className="pb-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {report.allItems.map((item) => (
                  <tr key={item._id} className="table-row">
                    <td className="py-3 font-medium">{item.medicineName}</td>
                    <td className="py-3">{item.availableQuantity}</td>
                    <td className="py-3">{item.dailyUsage}</td>
                    <td className="py-3">{item.daysRemaining}</td>
                    <td className="py-3"><Badge status={item.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="section-title mb-4">Alert History</h2>
        {report.alertHistory.length === 0 ? (
          <p className="muted py-6 text-center text-sm">No stock alerts yet</p>
        ) : (
          <div className="space-y-2">
            {report.alertHistory.map((n) => (
              <div key={n._id} className="panel flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{n.title || n.type}</p>
                  <p className="muted text-sm">{n.message}</p>
                </div>
                <p className="muted text-xs">{formatDate(n.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
