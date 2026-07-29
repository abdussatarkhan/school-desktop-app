import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Select, Table, Spinner, Badge } from '../components/ui';

const STATUS_OPTIONS = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
const STATUS_COLOR = { PRESENT: 'green', ABSENT: 'red', LATE: 'amber', EXCUSED: 'blue' };

function TeacherAdminView() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [sheet, setSheet] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/classes').then((res) => {
      setClasses(res.data);
      if (res.data.length) setClassId(String(res.data[0].id));
    });
  }, []);

  useEffect(() => {
    if (!classId) return;
    api.get(`/attendance/class/${classId}`, { params: { date } }).then((res) => setSheet(res.data));
  }, [classId, date]);

  function setStatus(studentId, status) {
    setSheet((prev) => prev.map((s) => (s.studentId === studentId ? { ...s, status } : s)));
    setSaved(false);
  }

  async function handleSave() {
    await api.post('/attendance', {
      classId,
      date,
      records: sheet.map((s) => ({ studentId: s.studentId, status: s.status || 'PRESENT' })),
    });
    setSaved(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <Select label="Class" value={classId} onChange={(e) => setClassId(e.target.value)} className="w-48">
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name} - {c.section}</option>
          ))}
        </Select>
        <label className="block text-sm">
          <span className="text-slate-600 font-medium mb-1 block">Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </label>
        <Button onClick={handleSave} disabled={!sheet}>Save Attendance</Button>
        {saved && <span className="text-emerald-600 text-sm">Saved!</span>}
      </div>

      <Card>
        {!sheet ? (
          <Spinner />
        ) : (
          <Table
            columns={['Student', 'Status']}
            rows={sheet}
            renderRow={(s) => (
              <>
                <td className="py-2 pr-4 font-medium text-slate-700">{s.firstName} {s.lastName}</td>
                <td className="py-2 pr-4">
                  <div className="flex gap-1">
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setStatus(s.studentId, opt)}
                        className={`px-2 py-1 rounded-md text-xs font-medium border ${
                          s.status === opt ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-300 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </td>
              </>
            )}
          />
        )}
      </Card>
    </div>
  );
}

function SelfOrParentView() {
  const { user } = useAuth();
  const [children, setChildren] = useState([]);
  const [studentId, setStudentId] = useState(user.studentId);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (user.role === 'PARENT') {
      api.get('/students').then((res) => {
        setChildren(res.data);
        if (res.data.length) setStudentId(res.data[0].id);
      });
    }
  }, []);

  useEffect(() => {
    if (studentId) api.get(`/attendance/student/${studentId}`).then((res) => setData(res.data));
  }, [studentId]);

  return (
    <div className="space-y-4">
      {user.role === 'PARENT' && (
        <Select label="Child" value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-64">
          {children.map((c) => (
            <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
          ))}
        </Select>
      )}
      {!data ? (
        <Spinner />
      ) : (
        <>
          <Card>
            <p className="text-sm text-slate-500">Overall Attendance Rate</p>
            <p className="text-3xl font-bold text-slate-800">{data.stats.percentage}%</p>
            <p className="text-xs text-slate-400">{data.stats.present} present out of {data.stats.total} recorded days</p>
          </Card>
          <Card>
            <Table
              columns={['Date', 'Status']}
              rows={data.attendances}
              renderRow={(a) => (
                <>
                  <td className="py-2 pr-4">{new Date(a.date).toDateString()}</td>
                  <td className="py-2 pr-4"><Badge color={STATUS_COLOR[a.status]}>{a.status}</Badge></td>
                </>
              )}
            />
          </Card>
        </>
      )}
    </div>
  );
}

export default function Attendance() {
  const { user } = useAuth();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">
        {user.role === 'STUDENT' ? 'My Attendance' : 'Attendance'}
      </h1>
      {user.role === 'TEACHER' || user.role === 'ADMIN' ? <TeacherAdminView /> : <SelfOrParentView />}
    </div>
  );
}
