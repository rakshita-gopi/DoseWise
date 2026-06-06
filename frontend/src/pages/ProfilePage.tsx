import { useState } from 'react';
import { Phone, UserCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { authApi, patientApi } from '../lib/services';
import { Card, Button, Input, Label, Spinner } from '../components/ui';

export function ProfilePage() {
  const { user, activePatient, refreshPatients, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [accountPhone, setAccountPhone] = useState(user?.phone || '');
  const [form, setForm] = useState({
    name: activePatient?.name || '',
    age: activePatient?.age?.toString() || '',
    gender: activePatient?.gender || 'male',
    bloodGroup: activePatient?.bloodGroup || '',
    height: activePatient?.height?.toString() || '',
    weight: activePatient?.weight?.toString() || '',
    address: activePatient?.address || '',
    medicalConditions: activePatient?.medicalConditions?.join(', ') || '',
    allergies: activePatient?.allergies?.join(', ') || '',
    emergencyName: activePatient?.emergencyContact?.name || '',
    emergencyPhone: activePatient?.emergencyContact?.phone || '',
  });

  if (!activePatient) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await patientApi.update(activePatient._id, {
        name: form.name,
        age: form.age ? Number(form.age) : undefined,
        gender: form.gender,
        bloodGroup: form.bloodGroup,
        height: form.height ? Number(form.height) : undefined,
        weight: form.weight ? Number(form.weight) : undefined,
        address: form.address,
        medicalConditions: form.medicalConditions.split(',').map((s) => s.trim()).filter(Boolean),
        allergies: form.allergies.split(',').map((s) => s.trim()).filter(Boolean),
        emergencyContact: { name: form.emergencyName, phone: form.emergencyPhone },
      });
      toast.success('Profile updated!');
      refreshPatients();
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-2xl font-bold text-brand-700">
          {form.name.charAt(0) || <UserCircle className="h-8 w-8" />}
        </div>
        <div>
          <h1 className="page-title">Patient Profile</h1>
          <p className="page-desc">Manage health information for {activePatient.name}</p>
        </div>
      </div>

      <Card>
        <h2 className="section-title mb-1 flex items-center gap-2">
          <Phone className="h-4 w-4" /> Mobile Notifications
        </h2>
        <p className="muted mb-4 text-sm">
          Stock alerts and daily reports are sent to this number via SMS.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSavingPhone(true);
            try {
              await authApi.updateProfile({ phone: accountPhone });
              await refreshUser();
              toast.success('Mobile number saved!');
            } catch {
              toast.error('Failed to save mobile number');
            } finally {
              setSavingPhone(false);
            }
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="min-w-[200px] flex-1">
            <Label>Your Mobile Number</Label>
            <Input
              value={accountPhone}
              onChange={(e) => setAccountPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              required
            />
          </div>
          <Button type="submit" disabled={savingPhone}>
            {savingPhone ? <Spinner /> : 'Save Number'}
          </Button>
        </form>
      </Card>

      <Card>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Full Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <Label>Age</Label>
              <Input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
            </div>
            <div>
              <Label>Gender</Label>
              <select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <Label>Blood Group</Label>
              <Input value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} placeholder="e.g. B+" />
            </div>
            <div>
              <Label>Height (cm)</Label>
              <Input type="number" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} />
            </div>
            <div>
              <Label>Weight (kg)</Label>
              <Input type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <Label>Medical Conditions (comma separated)</Label>
            <Input value={form.medicalConditions} onChange={(e) => setForm({ ...form, medicalConditions: e.target.value })} placeholder="Diabetes, Hypertension" />
          </div>
          <div>
            <Label>Allergies (comma separated)</Label>
            <Input value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} placeholder="Penicillin, Sulfa" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Emergency Contact Name</Label>
              <Input value={form.emergencyName} onChange={(e) => setForm({ ...form, emergencyName: e.target.value })} />
            </div>
            <div>
              <Label>Emergency Contact Phone</Label>
              <Input value={form.emergencyPhone} onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })} />
            </div>
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? <Spinner /> : 'Save Profile'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
