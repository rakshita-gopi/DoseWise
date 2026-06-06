import { useEffect, useState } from 'react';
import { Pill, Upload, Sparkles, Pencil, Trash2, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { inventoryApi, purchaseApi } from '../lib/services';
import type { InventoryItem, Purchase } from '../types';
import { Card, Badge, Button, Textarea, Spinner, EmptyState } from '../components/ui';
import { PageHeader } from '../components/ui/PageHeader';
import { InventoryEditor, itemToForm, emptyInventoryForm, type InventoryFormData } from '../components/inventory/InventoryEditor';
import { formatDate, daysRemaining } from '../lib/utils';

export function InventoryPage() {
  const { activePatient } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<InventoryFormData>(itemToForm({
    _id: '', patientId: '', medicineName: '', availableQuantity: 0, dailyUsage: 0,
    morning: 0, afternoon: 0, night: 0, status: 'active',
  }));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('edit');

  const load = () => {
    if (!activePatient) return;
    inventoryApi.list(activePatient._id).then(({ data }) => setInventory(data)).finally(() => setLoading(false));
  };

  useEffect(load, [activePatient]);

  const openEdit = (item: InventoryItem) => {
    setEditorMode('edit');
    setEditingId(item._id);
    setFormData(itemToForm(item));
    setEditorOpen(true);
  };

  const openCreate = () => {
    setEditorMode('create');
    setEditingId(null);
    setFormData(emptyInventoryForm());
    setEditorOpen(true);
  };

  const handleDelete = async () => {
    if (!editingId) return;
    const item = inventory.find((i) => i._id === editingId);
    if (!confirm(`Remove "${item?.medicineName || 'this medicine'}" from inventory?`)) return;

    setDeleting(true);
    try {
      await inventoryApi.delete(editingId);
      setInventory((prev) => prev.filter((i) => i._id !== editingId));
      toast.success('Medicine removed from inventory');
      setEditorOpen(false);
    } catch {
      toast.error('Failed to delete medicine');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteFromCard = async (item: InventoryItem) => {
    if (!confirm(`Remove "${item.medicineName}" from inventory?`)) return;
    try {
      await inventoryApi.delete(item._id);
      setInventory((prev) => prev.filter((i) => i._id !== item._id));
      toast.success('Medicine removed');
    } catch {
      toast.error('Failed to delete medicine');
    }
  };

  const handleSave = async () => {
    if (!activePatient || !formData.medicineName.trim()) return;
    setSaving(true);
    const payload = {
      ...formData,
      expiryDate: formData.expiryDate || undefined,
    };

    try {
      if (editorMode === 'create') {
        const { data } = await inventoryApi.create({
          patientId: activePatient._id,
          ...payload,
        });
        setInventory((prev) => [...prev, data].sort((a, b) => a.medicineName.localeCompare(b.medicineName)));
        toast.success('Medicine added to inventory!');
      } else if (editingId) {
        const { data } = await inventoryApi.update(editingId, payload);
        setInventory((prev) => prev.map((i) => (i._id === editingId ? data : i)));
        toast.success('Medicine updated!');
      }
      setEditorOpen(false);
    } catch {
      toast.error(editorMode === 'create' ? 'Failed to add medicine' : 'Failed to update medicine');
    } finally {
      setSaving(false);
    }
  };

  if (!activePatient) return <EmptyState icon={<Pill />} title="No profile selected" />;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-500">
      <PageHeader
        title="Medicine Inventory"
        description="Auto-tracked stock with daily consumption"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Medicine
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-12"><Spinner className="h-8 w-8" /></div>
      ) : inventory.length === 0 ? (
        <EmptyState icon={<Pill />} title="No medicines in inventory" description="Add a medicine manually or upload a prescription and bill" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {inventory.map((item, i) => {
            const days = daysRemaining(item.availableQuantity, item.dailyUsage);
            return (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className="group relative overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-1 bg-gradient-to-r from-brand-500 to-brand-400 transition-all"
                    style={{ width: `${Math.min(100, (days ?? 30) * 3.33)}%` }}
                  />
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-slate-900 dark:text-slate-100">{item.medicineName}</h3>
                      <p className="muted truncate text-xs">{item.strength}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Badge status={item.status} />
                      <button
                        onClick={() => openEdit(item)}
                        className="rounded-lg p-1.5 text-slate-400 opacity-0 transition-all hover:bg-slate-100 hover:text-brand-600 group-hover:opacity-100 dark:hover:bg-slate-800 dark:hover:text-brand-400"
                        title="Edit medicine"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteFromCard(item)}
                        className="rounded-lg p-1.5 text-slate-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                        title="Delete medicine"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <div className="panel-stat">
                      <p className="muted text-xs">Stock</p>
                      <p className="stat-value">{item.availableQuantity}</p>
                    </div>
                    <div className="panel-stat">
                      <p className="muted text-xs">Days Left</p>
                      <p className="stat-value">{days ?? '—'}</p>
                    </div>
                  </div>
                  <div className="muted mt-3 flex gap-2 text-xs">
                    <span>🌅 {item.morning}</span>
                    <span>☀️ {item.afternoon}</span>
                    <span>🌙 {item.night}</span>
                    <span className="ml-auto">Daily: {item.dailyUsage}</span>
                  </div>
                  {item.expiryDate && (
                    <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">Expires: {formatDate(item.expiryDate)}</p>
                  )}
                  <div className="mt-4 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button variant="secondary" size="sm" className="flex-1" onClick={() => openEdit(item)}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleDeleteFromCard(item)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <InventoryEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        data={formData}
        onChange={setFormData}
        onSave={handleSave}
        onDelete={editorMode === 'edit' ? handleDelete : undefined}
        saving={saving}
        deleting={deleting}
        mode={editorMode}
      />
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
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-500">
      <PageHeader title="Pharmacy Bills" description="Upload bills to auto-update inventory" />

      <Card>
        <h2 className="section-title mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand-600 dark:text-brand-400" /> AI Bill Reader
        </h2>
        <Textarea
          placeholder="Paste bill details, e.g.: Metformin 500mg x 60 tablets..."
          value={billText}
          onChange={(e) => setBillText(e.target.value)}
          rows={3}
        />
        <div className="mt-3 flex flex-wrap gap-3">
          <label className="btn-secondary cursor-pointer">
            <Upload className="h-4 w-4" />
            {file ? file.name : 'Upload Bill'}
            <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp,image/gif,.pdf,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
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
          <Card key={p._id} className="group">
            <div className="mb-3 flex justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">{p.pharmacy || 'Pharmacy'}</h3>
                <p className="muted text-xs">{formatDate(p.purchaseDate)}</p>
              </div>
              <div className="flex items-start gap-2">
                {p.totalAmount != null && (
                  <p className="font-bold text-brand-600 dark:text-brand-400">₹{p.totalAmount}</p>
                )}
                <button
                  onClick={async () => {
                    if (!confirm(`Delete this purchase record from ${p.pharmacy || 'pharmacy'}?`)) return;
                    try {
                      await purchaseApi.delete(p._id);
                      setPurchases((prev) => prev.filter((x) => x._id !== p._id));
                      toast.success('Purchase deleted');
                    } catch {
                      toast.error('Failed to delete purchase');
                    }
                  }}
                  className="rounded-lg p-1.5 text-slate-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                  title="Delete purchase"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              {p.items.map((item, i) => (
                <div key={i} className="panel flex justify-between">
                  <span className="text-slate-700 dark:text-slate-300">{item.medicineName} {item.strength}</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">×{item.quantity}</span>
                </div>
              ))}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
