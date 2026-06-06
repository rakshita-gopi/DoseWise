import { useEffect, useState, useRef } from 'react';
import { FolderOpen, Upload, Trash2, FileText, Image } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { documentApi } from '../lib/services';
import type { Document } from '../types';
import { Card, Button, Input, Label, Select, Spinner, EmptyState } from '../components/ui';
import { formatDate } from '../lib/utils';

const categories = [
  { value: 'prescription', label: 'Prescription' },
  { value: 'lab_report', label: 'Lab Report' },
  { value: 'xray', label: 'X-Ray' },
  { value: 'ct_scan', label: 'CT Scan' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other', label: 'Other' },
];

export function DocumentsPage() {
  const { activePatient } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('other');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    if (!activePatient) return;
    documentApi.list(activePatient._id).then(({ data }) => setDocuments(data)).finally(() => setLoading(false));
  };

  useEffect(load, [activePatient]);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!activePatient || !file) {
      toast.error('Select a file to upload');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('patientId', activePatient._id);
    formData.append('title', title || file.name);
    formData.append('category', category);
    formData.append('file', file);

    try {
      await documentApi.upload(formData);
      toast.success('Document uploaded!');
      setTitle('');
      if (fileRef.current) fileRef.current.value = '';
      load();
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document?')) return;
    await documentApi.delete(id);
    toast.success('Document deleted');
    load();
  };

  if (!activePatient) return <EmptyState icon={<FolderOpen />} title="No profile selected" />;

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Medical Document Vault</h1>
        <p className="text-sm text-slate-500">Store prescriptions, lab reports, scans & insurance docs</p>
      </div>

      <Card>
        <h2 className="mb-4 font-display font-semibold">Upload Document</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title" />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <input ref={fileRef} type="file" accept="image/*,.pdf" className="text-sm" />
          <Button onClick={handleUpload} disabled={uploading}>
            {uploading ? <Spinner /> : <><Upload className="h-4 w-4" /> Upload</>}
          </Button>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : documents.length === 0 ? (
        <EmptyState icon={<FolderOpen />} title="No documents yet" description="Upload your medical records above" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <Card key={doc._id} className="group">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  {doc.fileType?.includes('pdf') ? <FileText className="h-5 w-5" /> : <Image className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold">{doc.title}</h3>
                  <p className="text-xs capitalize text-slate-500">{doc.category.replace(/_/g, ' ')}</p>
                  <p className="text-[10px] text-slate-400">{formatDate(doc.createdAt)}</p>
                </div>
                <button onClick={() => handleDelete(doc._id)} className="opacity-0 transition group-hover:opacity-100 text-red-400 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <a href={doc.filePath} target="_blank" rel="noopener noreferrer" className="mt-3 block text-xs font-medium text-brand-600 hover:underline">
                View Document →
              </a>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
