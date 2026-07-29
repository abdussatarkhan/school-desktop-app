import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Select, Modal, Spinner, ErrorBanner } from '../components/ui';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Timetable() {
  const { user } = useAuth();
  const isAdminOrTeacher = user.role === 'ADMIN' || user.role === 'TEACHER';
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classId, setClassId] = useState('');
  const [slots, setSlots] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAdminOrTeacher) {
      api.get('/classes').then((res) => {
        setClasses(res.data);
        if (res.data.length) setClassId(String(res.data[0].id));
      });
      api.get('/classes/meta/subjects').then((res) => setSubjects(res.data));
      api.get('/teachers').then((res) => setTeachers(res.data));
    }
  }, []);

  function loadSlots() {
    if (isAdminOrTeacher && classId) {
      api.get(`/timetable/class/${classId}`).then((res) => setSlots(res.data));
    } else if (!isAdminOrTeacher) {
      api.get('/timetable/me').then((res) => setSlots(res.data));
    }
  }
  useEffect(loadSlots, [classId]);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    const form = new FormData(e.target);
    try {
      await api.post('/timetable', {
        classId,
        subjectId: form.get('subjectId'),
        teacherId: form.get('teacherId') || undefined,
        dayOfWeek: form.get('dayOfWeek'),
        startTime: form.get('startTime'),
        endTime: form.get('endTime'),
      });
      setShowAdd(false);
      loadSlots();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add slot');
    }
  }

  async function handleDelete(id) {
    await api.delete(`/timetable/${id}`);
    loadSlots();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">{isAdminOrTeacher ? 'Timetable' : 'My Timetable'}</h1>
        {isAdminOrTeacher && <Button onClick={() => setShowAdd(true)}>+ Add Slot</Button>}
      </div>

      {isAdminOrTeacher && (
        <Select label="Class" value={classId} onChange={(e) => setClassId(e.target.value)} className="w-48">
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name} - {c.section}</option>
          ))}
        </Select>
      )}

      {!slots ? (
        <Spinner />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {DAYS.map((day, idx) => {
            const daySlots = slots.filter((s) => s.dayOfWeek === idx).sort((a, b) => a.startTime.localeCompare(b.startTime));
            if (!daySlots.length) return null;
            return (
              <Card key={day}>
                <p className="font-semibold text-slate-700 mb-2">{day}</p>
                <ul className="space-y-2">
                  {daySlots.map((s) => (
                    <li key={s.id} className="flex items-center justify-between text-sm">
                      <span>
                        {s.startTime}–{s.endTime}: <strong>{s.subject.name}</strong>
                        {s.teacher && ` (${s.teacher.firstName})`}
                        {s.class && ` — ${s.class.name} ${s.class.section}`}
                      </span>
                      {isAdminOrTeacher && (
                        <button className="text-red-500 text-xs hover:underline" onClick={() => handleDelete(s.id)}>
                          Remove
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Timetable Slot">
        <ErrorBanner message={error} />
        <form onSubmit={handleAdd} className="space-y-3">
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
          <Select name="dayOfWeek" label="Day" required>
            {DAYS.map((d, idx) => (
              <option key={d} value={idx}>{d}</option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-slate-600 font-medium mb-1 block">Start time</span>
              <input type="time" name="startTime" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600 font-medium mb-1 block">End time</span>
              <input type="time" name="endTime" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </label>
          </div>
          <Button type="submit" className="w-full">Add Slot</Button>
        </form>
      </Modal>
    </div>
  );
}
