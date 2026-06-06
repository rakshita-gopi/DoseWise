import { useEffect, useState } from 'react';
import { FileText, Upload, Sparkles, AlertTriangle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { prescriptionApi } from '../lib/services';
import type { Prescription } from '../types';
import { Card, Badge, Button, Textarea, Spinner, EmptyState } from '../components/ui';
import { formatDate } from '../lib/utils';

export function PrescriptionsPage() {
  const { activePatient } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [manualText, setManualText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

  const handleUpload = async () => {
    if (!activePatient || (!manualText && !file)) {
      toast.error('Enter prescription text or upload a file');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('patientId', activePatient._id);
    if (manualText) formData.append('rawText', manualText);
    if (file) formData.append('file', file);

    try {
      const { data } = await prescriptionApi.upload(formData);
      toast.success('Prescription processed by AI!');
      if (data.interactions && (data.interactions as { hasInteractions?: boolean }).hasInteractions) {
        toast('Drug interaction detected! Check notifications.', { icon: '⚠️', duration: 6000 });
      }
      setManualText('');
      clearFile();
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Upload failed';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  if (!activePatient) return <EmptyState icon={<FileText />} title="No profile selected" />;

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold dark:text-white">Prescriptions</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Upload PDF or image — AI reads and extracts medicines automatically</p>
      </div>

      <Card>
        <h2 className="mb-4 flex items-center gap-2 font-display font-semibold">
          <Sparkles className="h-5 w-5 text-brand-600" /> AI Prescription Upload
        </h2>
        <div className="space-y-4">
          <Textarea
            placeholder="Paste prescription text, e.g.: Metformin 500mg - 1 Morning + 1 Night (After Food), Telmisartan 40mg - 1 Morning..."
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            rows={4}
          />
          {file && (
            <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/50 p-3 dark:border-brand-800 dark:bg-brand-950/30">
              <FileText className="h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {(file.size / 1024).toFixed(1)} KB · {file.type.includes('pdf') ? 'PDF (text + vision OCR)' : 'Image (vision OCR)'}
                </p>
              </div>
              <button onClick={clearFile} className="text-slate-400 hover:text-red-500">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {previewUrl && (
            <img src={previewUrl} alt="Prescription preview" className="max-h-48 rounded-xl border border-slate-200 object-contain dark:border-slate-700" />
          )}
          <div className="flex flex-wrap items-center gap-3">
            <label className="btn-secondary cursor-pointer">
              <Upload className="h-4 w-4" />
              {file ? 'Change File' : 'Upload PDF/Image'}
              <input
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp,image/gif,.pdf,application/pdf"
                onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
              />
            </label>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? <><Spinner /> Processing...</> : <><Sparkles className="h-4 w-4" /> Process with AI</>}
            </Button>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Supports PDF prescriptions and photos (JPG, PNG, WEBP). Scanned PDFs use AI vision OCR.
          </p>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner className="h-8 w-8" /></div>
      ) : prescriptions.length === 0 ? (
        <EmptyState icon={<FileText />} title="No prescriptions yet" description="Upload your first prescription above" />
      ) : (
        <div className="space-y-4">
          {prescriptions.map((rx) => (
            <Card key={rx._id}>
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">Dr. {rx.doctorName || 'Unknown'}</h3>
                  <p className="text-xs text-slate-500">{rx.hospital} · {formatDate(rx.prescribedDate)}</p>
                </div>
                <div className="flex gap-2">
                  <Badge status={rx.status} />
                  {rx.aiExtracted && <span className="badge bg-violet-100 text-violet-700"><Sparkles className="mr-1 inline h-3 w-3" />AI</span>}
                </div>
              </div>
              {rx.nextReviewDate && (
                <p className="mb-3 flex items-center gap-1 text-xs text-amber-600">
                  <AlertTriangle className="h-3.5 w-3.5" /> Review by {formatDate(rx.nextReviewDate)}
                </p>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="pb-2">Medicine</th>
                      <th className="pb-2">Strength</th>
                      <th className="pb-2">Morning</th>
                      <th className="pb-2">Afternoon</th>
                      <th className="pb-2">Night</th>
                      <th className="pb-2">Food</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rx.medicines.map((m, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        <td className="py-2 font-medium">{m.medicineName}</td>
                        <td className="py-2">{m.strength || '—'}</td>
                        <td className="py-2">{m.morning}</td>
                        <td className="py-2">{m.afternoon}</td>
                        <td className="py-2">{m.night}</td>
                        <td className="py-2 capitalize">{m.foodType?.replace(/_/g, ' ') || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
