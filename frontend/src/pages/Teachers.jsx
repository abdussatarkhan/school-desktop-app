import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Input, Table, Modal, Spinner, ErrorBanner, Badge } from '../components/ui';

export default function Teachers() {
  const { user } = useAuth();
  const [teachers, setTeachers] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState('');

  function load() {
    api.get('/teachers').then((res) => setTeachers(res.data));
  }
  useEffect(load, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    const form = new FormData(e.target);
    try {
      await api.post('/users', {
        email: form.get('email'),
        password: form.get('password'),
        role: 'TEACHER',
        firstName: form.get('firstName'),
        lastName: form.get('lastName'),
        phone: form.get('phone'),
      });
      setShowAdd(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add teacher');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this teacher account? This cannot be undone.')) return;
    await api.delete(`/teachers/${id}`);
    load();
  }

  if (!teachers) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Teachers</h1>
        {user.role === 'ADMIN' && <Button onClick={() => setShowAdd(true)}>+ Add Teacher</Button>}
      </div>

      <Card>
        <Table
          columns={['Name', 'Email', 'Subjects Taught', 'Homeroom', '']}
          rows={teachers}
          renderRow={(t) => (
            <>
              <td className="py-2 pr-4 font-medium text-slate-700">{t.firstName} {t.lastName}</td>
              <td className="py-2 pr-4 text-slate-500">{t.user?.email}</td>
              <td className="py-2 pr-4 space-x-1">
                {t.subjectAssignments.map((a) => (
                  <Badge key={a.id} color="blue">{a.subject.name}</Badge>
                ))}
              </td>
              <td className="py-2 pr-4">
                {t.classesAsTeacher.map((c) => (
                  <Badge key={c.id} color="slate">{c.name} {c.section}</Badge>
                ))}
              </td>
              <td className="py-2 pr-4">
                {user.role === 'ADMIN' && (
                  <button className="text-red-600 hover:underline text-sm" onClick={() => handleDelete(t.id)}>
                    Remove
                  </button>
                )}
              </td>
            </>
          )}
        />
      </Card>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Teacher">
        <ErrorBanner message={error} />
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input name="firstName" label="First name" required />
            <Input name="lastName" label="Last name" required />
          </div>
          <Input name="email" type="email" label="Login email" required />
          <Input name="password" type="password" label="Temporary password" required minLength={6} />
          <Input name="phone" label="Phone" />
          <Button type="submit" className="w-full">Create Teacher</Button>
        </form>
      </Modal>
    </div>
  );
}
