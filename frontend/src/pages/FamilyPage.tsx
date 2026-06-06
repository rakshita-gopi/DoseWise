import { useState } from 'react';
import { Users, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { patientApi } from '../lib/services';
import { Card, Button, Input, Label, Select, EmptyState } from '../components/ui';

export function FamilyPage() {
  const { patients, refreshPatients, setActivePatient } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', relationship: 'parent', gender: 'male', age: '' });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await patientApi.create({
        ...form,
        age: form.age ? Number(form.age) : undefined,
      });
      toast.success(`Profile for ${form.name} created!`);
      await refreshPatients();
      setActivePatient(data.data);
      setShowForm(false);
      setForm({ name: '', relationship: 'parent', gender: 'male', age: '' });
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
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Family Profiles</h1>
          <p className="text-sm text-slate-500">Manage health records for family members</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" /> Add Profile
        </Button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <Label>Relationship</Label>
              <Select value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })}>
                <option value="parent">Parent</option>
                <option value="child">Child</option>
                <option value="spouse">Spouse</option>
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
              <Button type="submit">Create Profile</Button>
            </div>
          </form>
        </Card>
      )}

      {patients.length === 0 ? (
        <EmptyState icon={<Users />} title="No profiles" description="Add family member profiles above" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {patients.map((p) => (
            <Card key={p._id} className="group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">
                    {p.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold">{p.name}</h3>
                    <p className="text-xs capitalize text-slate-500">{p.relationship}{p.isPrimary && ' · Primary'}</p>
                  </div>
                </div>
                {!p.isPrimary && (
                  <button
                    onClick={() => handleDelete(p._id, p.name)}
                    className="opacity-0 transition group-hover:opacity-100 text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4 w-full"
                onClick={() => setActivePatient(p)}
              >
                Switch to this profile
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
