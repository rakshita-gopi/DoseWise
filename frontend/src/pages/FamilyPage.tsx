import { useState } from 'react';
import { Users, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { patientApi } from '../lib/services';
import { getManagedPatients } from '../lib/patients';
import { Card, Button, Input, Label, Select, EmptyState } from '../components/ui';
import { PageHeader } from '../components/ui/PageHeader';

export function FamilyPage() {
  const { user, patients, refreshPatients, setActivePatient } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', relationship: 'father', gender: 'male', age: '' });

  const isCaregiver = user?.role === 'caregiver';
  const displayPatients = isCaregiver ? getManagedPatients(user, patients) : patients.filter((p) => !p.isPrimary || p.relationship !== 'self');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await patientApi.create({
        ...form,
        age: form.age ? Number(form.age) : undefined,
      });
      toast.success(`Profile for ${form.name} created!`);
      await refreshPatients();
      setActivePatient(data);
      setShowForm(false);
      setForm({ name: '', relationship: 'father', gender: 'male', age: '' });
    } catch {
      toast.error('Failed to create profile');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete profile for ${name}?`)) return;
    try {
      await patientApi.delete(id);
      toast.success('Profile deleted');
      refreshPatients();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Delete failed';
      toast.error(msg);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-500">
      <PageHeader
        title={isCaregiver ? 'People You Care For' : 'Family Profiles'}
        description={
          isCaregiver
            ? 'Add father, mother, or others — then switch between them to manage prescriptions, inventory & documents'
            : 'Manage health records for family members'
        }
        action={
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4" /> {isCaregiver ? 'Add Person' : 'Add Profile'}
          </Button>
        }
      />

      {showForm && (
        <Card>
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Full Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Ramesh Kumar" />
            </div>
            <div>
              <Label>Relationship *</Label>
              <Select value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })}>
                <option value="father">Father</option>
                <option value="mother">Mother</option>
                <option value="parent">Parent</option>
                <option value="spouse">Spouse</option>
                <option value="child">Child</option>
                <option value="grandparent">Grandparent</option>
                <option value="other">Other</option>
              </Select>
            </div>
            <div>
              <Label>Gender</Label>
              <Select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </Select>
            </div>
            <div>
              <Label>Age</Label>
              <Input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Create & Switch to This Person</Button>
            </div>
          </form>
        </Card>
      )}

      {displayPatients.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title={isCaregiver ? 'No people added yet' : 'No family profiles'}
          description={isCaregiver ? 'Add your father, mother, or other family members to start managing their medicines' : 'Add family member profiles above'}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayPatients.map((p) => (
            <Card key={p._id} className="group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                    {p.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">{p.name}</h3>
                    <p className="muted text-xs capitalize">{p.relationship}</p>
                  </div>
                </div>
                {!p.isPrimary && (
                  <button
                    onClick={() => handleDelete(p._id, p.name)}
                    className="text-red-400 opacity-0 transition hover:text-red-600 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button variant="secondary" size="sm" className="mt-4 w-full" onClick={() => setActivePatient(p)}>
                View {p.name}&apos;s records
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
