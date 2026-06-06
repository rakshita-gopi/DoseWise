import { useEffect, useState } from 'react';
import { FileText, Upload, Sparkles, X, PenLine } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { prescriptionApi } from '../lib/services';
import type { Prescription } from '../types';
import { Card, Button, Textarea, Spinner, EmptyState } from '../components/ui';
import { PrescriptionCard } from '../components/prescriptions/PrescriptionCard';
import { PrescriptionDetailDialog } from '../components/prescriptions/PrescriptionDetailDialog';
import {
  PrescriptionEditor,
  extractedToFormData,
  type PrescriptionFormData,
} from '../components/prescriptions/PrescriptionEditor';

export function PrescriptionsPage() {
  const { activePatient } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [manualText, setManualText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | undefined>();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PrescriptionFormData>(extractedToFormData({ medicines: [] }));

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);

  const handleFileSelect = (selected: File | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    if (selected && selected.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(selected));
    } else {
      setPreviewUrl(null);
    }
  };

  const clearFile = () => handleFileSelect(null);

  const load = () => {
    if (!activePatient) return;
    prescriptionApi.list(activePatient._id).then(({ data }) => setPrescriptions(data)).finally(() => setLoading(false));
  };

  useEffect(load, [activePatient]);

  const openManualCreate = () => {
    setEditorMode('create');
    setEditingId(null);
    setUploadedFilePath(undefined);
    setFormData(extractedToFormData({ medicines: [{ medicineName: '', strength: '', morning: 0, afternoon: 0, night: 0, foodType: 'any' }] }));
    setEditorOpen(true);
  };

  const handleParse = async () => {
    if (!activePatient || (!manualText && !file)) {
      toast.error('Enter prescription text or upload a file');
      return;
    }

    setParsing(true);
    const form = new FormData();
    form.append('patientId', activePatient._id);
    if (manualText) form.append('rawText', manualText);
    if (file) form.append('file', file);

    try {
      const { data } = await prescriptionApi.parse(form);
      setUploadedFilePath(data.uploadedFile);
      setFormData(extractedToFormData(data.extracted));
      setEditorMode('create');
      setEditingId(null);
      setEditorOpen(true);
      toast.success('AI extracted medicines — review and save!');
      if (data.interactions && (data.interactions as { hasInteractions?: boolean }).hasInteractions) {
        toast('Drug interaction detected!', { icon: '⚠️', duration: 6000 });
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Parsing failed';
      toast.error(msg);
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    if (!activePatient || !formData.title.trim()) {
      toast.error('Please enter a prescription name');
      return;
    }
    if (!formData.medicines.some((m) => m.medicineName.trim())) {
      toast.error('Add at least one medicine');
      return;
    }

    setSaving(true);
    const payload = {
      patientId: activePatient._id,
      title: formData.title.trim(),
      doctorName: formData.doctorName,
      hospital: formData.hospital,
      prescribedDate: formData.prescribedDate,
      nextReviewDate: formData.nextReviewDate || undefined,
      medicines: formData.medicines.filter((m) => m.medicineName.trim()),
      aiExtracted: editorMode === 'create' && !!uploadedFilePath,
      uploadedFile: uploadedFilePath,
    };

    try {
      if (editorMode === 'edit' && editingId) {
        await prescriptionApi.update(editingId, payload);
        toast.success('Prescription updated!');
      } else {
        await prescriptionApi.save(payload);
        toast.success('Prescription saved!');
        setManualText('');
        clearFile();
        setUploadedFilePath(undefined);
      }
      setEditorOpen(false);
      load();
      if (selectedRx && editingId === selectedRx._id) {
        const { data } = await prescriptionApi.get(editingId);
        setSelectedRx(data);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Save failed';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const openDetail = (rx: Prescription) => {
    setSelectedRx(rx);
    setDetailOpen(true);
  };

  const openEdit = (rx: Prescription) => {
    setDetailOpen(false);
    setEditorMode('edit');
    setEditingId(rx._id);
    setFormData({
      title: rx.title || '',
      doctorName: rx.doctorName || '',
      hospital: rx.hospital || '',
      prescribedDate: rx.prescribedDate ? rx.prescribedDate.split('T')[0] : '',
      nextReviewDate: rx.nextReviewDate ? rx.nextReviewDate.split('T')[0] : '',
      medicines: rx.medicines.map((m) => ({ ...m })),
    });
    setEditorOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedRx || !confirm(`Delete "${selectedRx.title || 'this prescription'}"?`)) return;
    try {
      await prescriptionApi.delete(selectedRx._id);
      toast.success('Prescription deleted');
      setDetailOpen(false);
      setSelectedRx(null);
      load();
    } catch {
      toast.error('Delete failed');
    }
  };

  if (!activePatient) return <EmptyState icon={<FileText />} title="No profile selected" />;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-500">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Prescriptions</h1>
          <p className="page-desc">
            Upload, review, name and save your prescriptions
          </p>
        </div>
        <Button variant="secondary" onClick={openManualCreate}>
          <PenLine className="h-4 w-4" /> Create Manually
        </Button>
      </div>

      <Card className="transition-shadow hover:shadow-md">
        <h2 className="mb-4 flex items-center gap-2 font-display font-semibold">
          <Sparkles className="h-5 w-5 text-brand-600" /> AI Prescription Upload
        </h2>
        <div className="space-y-4">
          <Textarea
            placeholder="Or paste prescription text here..."
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            rows={3}
          />
          {file && (
            <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/50 p-3 dark:border-brand-800 dark:bg-brand-950/30">
              <FileText className="h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {(file.size / 1024).toFixed(1)} KB · {file.type.includes('pdf') ? 'PDF → AI Vision OCR' : 'Image → AI Vision OCR'}
                </p>
              </div>
              <button onClick={clearFile} className="text-slate-400 hover:text-red-500">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {previewUrl && (
            <img src={previewUrl} alt="Preview" className="max-h-40 rounded-xl border border-slate-200 object-contain dark:border-slate-700" />
          )}
          <div className="flex flex-wrap items-center gap-3">
            <label className="btn-secondary cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]">
              <Upload className="h-4 w-4" />
              {file ? 'Change File' : 'Upload PDF/Image'}
              <input
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp,image/gif,.pdf,application/pdf"
                onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
              />
            </label>
            <Button onClick={handleParse} disabled={parsing}>
              {parsing ? <><Spinner /> Analyzing document...</> : <><Sparkles className="h-4 w-4" /> Process with AI</>}
            </Button>
          </div>
        </div>
      </Card>

      <div>
        <h2 className="section-title mb-4">
          Saved Prescriptions ({prescriptions.length})
        </h2>
        {loading ? (
          <div className="flex justify-center py-12"><Spinner className="h-8 w-8" /></div>
        ) : prescriptions.length === 0 ? (
          <EmptyState icon={<FileText />} title="No prescriptions yet" description="Upload or create your first prescription above" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {prescriptions.map((rx, i) => (
              <PrescriptionCard key={rx._id} prescription={rx} index={i} onClick={() => openDetail(rx)} />
            ))}
          </div>
        )}
      </div>

      <PrescriptionEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        data={formData}
        onChange={setFormData}
        onSave={handleSave}
        saving={saving}
        mode={editorMode}
      />

      <PrescriptionDetailDialog
        prescription={selectedRx}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={() => selectedRx && openEdit(selectedRx)}
        onDelete={handleDelete}
      />
    </div>
  );
}
