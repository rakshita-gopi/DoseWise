import { useEffect, useState } from 'react';
import { Pill, Upload, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { inventoryApi, purchaseApi } from '../lib/services';
import type { InventoryItem, Purchase } from '../types';
import { Card, Badge, Button, Textarea, Spinner, EmptyState } from '../components/ui';
import { formatDate, daysRemaining } from '../lib/utils';

export function InventoryPage() {
  const { activePatient } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activePatient) return;
    inventoryApi.list(activePatient._id).then(({ data }) => setInventory(data)).finally(() => setLoading(false));
  }, [activePatient]);

  if (!activePatient) return <EmptyState icon={<Pill />} title="No profile selected" />;

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Medicine Inventory</h1>
        <p className="text-sm text-slate-500">Auto-tracked stock with daily consumption</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner className="h-8 w-8" /></div>
      ) : inventory.length === 0 ? (
        <EmptyState icon={<Pill />} title="No medicines in inventory" description="Upload a prescription and bill to start tracking" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {inventory.map((item) => {
            const days = daysRemaining(item.availableQuantity, item.dailyUsage);
            return (
              <Card key={item._id} className="relative overflow-hidden">
                <div className="absolute right-0 top-0 h-1 w-full bg-gradient-to-r from-brand-500 to-brand-300" style={{ width: `${Math.min(100, (days ?? 30) * 3.33)}%` }} />
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{item.medicineName}</h3>
                    <p className="text-xs text-slate-500">{item.strength}</p>
                  </div>
                  <Badge status={item.status} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-xs text-slate-500">Stock</p>
                    <p className="text-lg font-bold">{item.availableQuantity}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-xs text-slate-500">Days Left</p>
                    <p className="text-lg font-bold">{days ?? '—'}</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2 text-xs text-slate-500">
                  <span>🌅 {item.morning}</span>
                  <span>☀️ {item.afternoon}</span>
                  <span>🌙 {item.night}</span>
                  <span className="ml-auto">Daily: {item.dailyUsage}</span>
                </div>
                {item.expiryDate && (
                  <p className="mt-2 text-xs text-slate-400">Expires: {formatDate(item.expiryDate)}</p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function PurchasesPage() {
  const { activePatient } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [billText, setBillText] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const load = () => {
    if (!activePatient) return;
    purchaseApi.list(activePatient._id).then(({ data }) => setPurchases(data)).finally(() => setLoading(false));
  };

  useEffect(load, [activePatient]);

  const handleUpload = async () => {
    if (!activePatient || (!billText && !file)) {
      toast.error('Enter bill details or upload a file');
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('patientId', activePatient._id);
    if (billText) formData.append('rawText', billText);
    if (file) formData.append('file', file);

    try {
      await purchaseApi.upload(formData);
      toast.success('Bill processed — inventory updated!');
      setBillText('');
      setFile(null);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Upload failed';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  if (!activePatient) return <EmptyState icon={<Upload />} title="No profile selected" />;

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Pharmacy Bills</h1>
        <p className="text-sm text-slate-500">Upload bills to auto-update inventory</p>
      </div>

      <Card>
        <h2 className="mb-4 flex items-center gap-2 font-display font-semibold">
          <Sparkles className="h-5 w-5 text-brand-600" /> AI Bill Reader
        </h2>
        <Textarea
          placeholder="Paste bill details, e.g.: Metformin 500mg x 60 tablets, Telmisartan 40mg x 30 tablets from Apollo Pharmacy..."
          value={billText}
          onChange={(e) => setBillText(e.target.value)}
          rows={3}
        />
        <div className="mt-3 flex flex-wrap gap-3">
          <label className="btn-secondary cursor-pointer">
            <Upload className="h-4 w-4" />
            {file ? file.name : 'Upload Bill'}
            <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
          <Button onClick={handleUpload} disabled={uploading}>
            {uploading ? <Spinner /> : 'Process Bill'}
          </Button>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : purchases.length === 0 ? (
        <EmptyState icon={<Upload />} title="No purchases recorded" />
      ) : (
        purchases.map((p) => (
          <Card key={p._id}>
            <div className="mb-3 flex justify-between">
              <div>
                <h3 className="font-semibold">{p.pharmacy || 'Pharmacy'}</h3>
                <p className="text-xs text-slate-500">{formatDate(p.purchaseDate)}</p>
              </div>
              {p.totalAmount && <p className="font-bold text-brand-600">₹{p.totalAmount}</p>}
            </div>
            <div className="space-y-1 text-sm">
              {p.items.map((item, i) => (
                <div key={i} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span>{item.medicineName} {item.strength}</span>
                  <span className="font-medium">×{item.quantity}</span>
                </div>
              ))}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
