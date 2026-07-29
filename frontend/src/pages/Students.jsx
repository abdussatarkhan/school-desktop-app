import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Input, Select, Table, Modal, Spinner, ErrorBanner, Badge } from '../components/ui';

export default function Students() {
  const { user } = useAuth();
  const [students, setStudents] = useState(null);
  const [classes, setClasses] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  function load() {
    api.get('/students').then((res) => setStudents(res.data));
  }

  useEffect(() => {
    load();
    if (user.role === 'ADMIN' || user.role === 'TEACHER') {
      api.get('/classes').then((res) => setClasses(res.data));
    }
  }, []);

  async function openProfile(id) {
    const res = await api.get(`/students/${id}/profile`);
    setProfile(res.data);
  }

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    const form = new FormData(e.target);
    try {
      await api.post('/users', {
        email: form.get('email'),
        password: form.get('password'),
        role: 'STUDENT',
        firstName: form.get('firstName'),
        lastName: form.get('lastName'),
        dob: form.get('dob'),
        phone: form.get('contact'),
        guardianName: form.get('guardianName'),
        guardianPhone: form.get('guardianPhone'),
        classId: form.get('classId') || undefined,
      });
      setShowAdd(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add student');
    }
  }

  if (!students) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">{user.role === 'PARENT' ? 'My Children' : 'Students'}</h1>
        {user.role === 'ADMIN' && <Button onClick={() => setShowAdd(true)}>+ Add Student</Button>}
      </div>

      <Card>
        <Table
          columns={['Name', 'Class', 'Contact', 'Email', '']}
          rows={students}
          renderRow={(s) => (
            <>
              <td className="py-2 pr-4 font-medium text-slate-700">{s.firstName} {s.lastName}</td>
              <td className="py-2 pr-4">{s.class ? <Badge color="blue">{s.class.name} {s.class.section}</Badge> : <span className="text-slate-400">Unassigned</span>}</td>
              <td className="py-2 pr-4">{s.contact || '—'}</td>
              <td className="py-2 pr-4 text-slate-500">{s.user?.email}</td>
              <td className="py-2 pr-4">
                <button className="text-brand-600 hover:underline text-sm" onClick={() => openProfile(s.id)}>
                  View Profile
                </button>
              </td>
            </>
          )}
        />
      </Card>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Student">
        <ErrorBanner message={error} />
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input name="firstName" label="First name" required />
            <Input name="lastName" label="Last name" required />
          </div>
          <Input name="email" type="email" label="Login email" required />
          <Input name="password" type="password" label="Temporary password" required minLength={6} />
          <Input name="dob" type="date" label="Date of birth" required />
          <Input name="contact" label="Contact number" />
          <div className="grid grid-cols-2 gap-3">
            <Input name="guardianName" label="Guardian name" />
            <Input name="guardianPhone" label="Guardian phone" />
          </div>
          <Select name="classId" label="Class">
            <option value="">Unassigned</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name} - {c.section}</option>
            ))}
          </Select>
          <Button type="submit" className="w-full">Create Student</Button>
        </form>
      </Modal>

      <Modal open={!!profile} onClose={() => setProfile(null)} title="Student Profile">
        {profile && (
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-semibold text-lg">{profile.firstName} {profile.lastName}</p>
              <p className="text-slate-500">{profile.user?.email}</p>
              {profile.class && <Badge color="blue">{profile.class.name} {profile.class.section}</Badge>}
            </div>
            <div>
              <p className="font-medium text-slate-600 mb-1">Recent Attendance</p>
              <p className="text-slate-500">
                {profile.attendances.filter((a) => a.status === 'PRESENT').length} present / {profile.attendances.length} recorded days
              </p>
            </div>
            <div>
              <p className="font-medium text-slate-600 mb-1">Recent Grades</p>
              {profile.gradeEntries.length === 0 && <p className="text-slate-400">No grades recorded yet.</p>}
              <ul className="space-y-1">
                {profile.gradeEntries.slice(0, 8).map((g) => (
                  <li key={g.id} className="flex justify-between">
                    <span>{g.exam.subject.name} — {g.exam.name}</span>
                    <span className="font-medium">{g.marks}/{g.exam.maxMarks}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium text-slate-600 mb-1">Fees</p>
              {profile.invoices.length === 0 && <p className="text-slate-400">No invoices.</p>}
              <ul className="space-y-1">
                {profile.invoices.map((inv) => (
                  <li key={inv.id} className="flex justify-between">
                    <span>{inv.feeStructure.title}</span>
                    <Badge color={inv.status === 'PAID' ? 'green' : inv.status === 'PARTIAL' ? 'amber' : 'red'}>{inv.status}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
