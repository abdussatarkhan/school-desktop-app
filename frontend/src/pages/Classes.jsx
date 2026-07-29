import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Input, Select, Table, Modal, Spinner, ErrorBanner, Badge } from '../components/ui';

export default function Classes() {
  const { user } = useAuth();
  const isAdmin = user.role === 'ADMIN';
  const [classes, setClasses] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [showAddClass, setShowAddClass] = useState(false);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [assignFor, setAssignFor] = useState(null); // class object
  const [error, setError] = useState('');

  function load() {
    api.get('/classes').then((res) => setClasses(res.data));
    api.get('/classes/meta/subjects').then((res) => setSubjects(res.data));
  }
  useEffect(() => {
    load();
    if (isAdmin) api.get('/teachers').then((res) => setTeachers(res.data));
  }, []);

  async function handleAddClass(e) {
    e.preventDefault();
    setError('');
    const form = new FormData(e.target);
    try {
      await api.post('/classes', {
        name: form.get('name'),
        section: form.get('section'),
        teacherId: form.get('teacherId') || undefined,
      });
      setShowAddClass(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create class');
    }
  }

  async function handleAddSubject(e) {
    e.preventDefault();
    setError('');
    const form = new FormData(e.target);
    try {
      await api.post('/classes/meta/subjects', { name: form.get('name'), code: form.get('code') });
      setShowAddSubject(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create subject');
    }
  }

  async function handleAssign(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    await api.post(`/classes/${assignFor.id}/subjects`, {
      subjectId: form.get('subjectId'),
      teacherId: form.get('teacherId') || undefined,
    });
    setAssignFor(null);
    load();
  }

  if (!classes) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Classes &amp; Subjects</h1>
        {isAdmin && (
          <div className="space-x-2">
            <Button variant="secondary" onClick={() => setShowAddSubject(true)}>+ Subject</Button>
            <Button onClick={() => setShowAddClass(true)}>+ Class</Button>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {classes.map((c) => (
          <Card key={c.id}>
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-slate-800">{c.name} - {c.section}</p>
              {isAdmin && (
                <button className="text-brand-600 text-sm hover:underline" onClick={() => setAssignFor(c)}>
                  + Assign Subject
                </button>
              )}
            </div>
            <p className="text-sm text-slate-500 mb-2">
              Homeroom teacher: {c.classTeacher ? `${c.classTeacher.firstName} ${c.classTeacher.lastName}` : 'Unassigned'}
            </p>
            <p className="text-sm text-slate-500 mb-2">{c.students.length} students enrolled</p>
            <div className="flex flex-wrap gap-1">
              {c.subjects.map((s) => (
                <Badge key={s.id} color="blue">
                  {s.subject.name}{s.teacher ? ` (${s.teacher.firstName})` : ''}
                </Badge>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={showAddClass} onClose={() => setShowAddClass(false)} title="Add Class">
        <ErrorBanner message={error} />
        <form onSubmit={handleAddClass} className="space-y-3">
          <Input name="name" label="Class name (e.g. Grade 8)" required />
          <Input name="section" label="Section (e.g. A)" required />
          <Select name="teacherId" label="Homeroom teacher">
            <option value="">Unassigned</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
            ))}
          </Select>
          <Button type="submit" className="w-full">Create Class</Button>
        </form>
      </Modal>

      <Modal open={showAddSubject} onClose={() => setShowAddSubject(false)} title="Add Subject">
        <ErrorBanner message={error} />
        <form onSubmit={handleAddSubject} className="space-y-3">
          <Input name="name" label="Subject name" required />
          <Input name="code" label="Subject code" />
          <Button type="submit" className="w-full">Create Subject</Button>
        </form>
      </Modal>

      <Modal open={!!assignFor} onClose={() => setAssignFor(null)} title={`Assign Subject to ${assignFor?.name} ${assignFor?.section}`}>
        <form onSubmit={handleAssign} className="space-y-3">
          <Select name="subjectId" label="Subject" required>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
          <Select name="teacherId" label="Teacher">
            <option value="">Unassigned</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
            ))}
          </Select>
          <Button type="submit" className="w-full">Assign</Button>
        </form>
      </Modal>
    </div>
  );
}
