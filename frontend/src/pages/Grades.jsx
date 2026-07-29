import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Input, Select, Table, Modal, Spinner, ErrorBanner, Badge } from '../components/ui';

function TeacherAdminGrades() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [exams, setExams] = useState(null);
  const [showCreateExam, setShowCreateExam] = useState(false);
  const [gradeExam, setGradeExam] = useState(null);
  const [students, setStudents] = useState([]);
  const [marksMap, setMarksMap] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/classes').then((res) => {
      setClasses(res.data);
      if (res.data.length) setClassId(String(res.data[0].id));
    });
    api.get('/classes/meta/subjects').then((res) => setSubjects(res.data));
  }, []);

  function loadExams() {
    if (classId) api.get('/grades/exams', { params: { classId } }).then((res) => setExams(res.data));
  }
  useEffect(loadExams, [classId]);

  async function handleCreateExam(e) {
    e.preventDefault();
    setError('');
    const form = new FormData(e.target);
    try {
      await api.post('/grades/exams', {
        name: form.get('name'),
        classId,
        subjectId: form.get('subjectId'),
        maxMarks: form.get('maxMarks'),
      });
      setShowCreateExam(false);
      loadExams();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create exam');
    }
  }

  async function openGradeEntry(exam) {
    setGradeExam(exam);
    const res = await api.get('/students', { params: { classId } });
    setStudents(res.data);
    setMarksMap({});
  }

  async function handleSaveGrades() {
    const entries = students.map((s) => ({ studentId: s.id, marks: Number(marksMap[s.id] || 0) }));
    await api.post(`/grades/exams/${gradeExam.id}/entries`, { entries });
    setGradeExam(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end justify-between">
        <Select label="Class" value={classId} onChange={(e) => setClassId(e.target.value)} className="w-48">
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name} - {c.section}</option>
          ))}
        </Select>
        <Button onClick={() => setShowCreateExam(true)}>+ Create Exam</Button>
      </div>

      <Card>
        {!exams ? (
          <Spinner />
        ) : (
          <Table
            columns={['Exam', 'Subject', 'Max Marks', 'Date', '']}
            rows={exams}
            renderRow={(ex) => (
              <>
                <td className="py-2 pr-4 font-medium text-slate-700">{ex.name}</td>
                <td className="py-2 pr-4">{ex.subject.name}</td>
                <td className="py-2 pr-4">{ex.maxMarks}</td>
                <td className="py-2 pr-4">{new Date(ex.date).toDateString()}</td>
                <td className="py-2 pr-4">
                  <button className="text-brand-600 hover:underline text-sm" onClick={() => openGradeEntry(ex)}>
                    Enter Grades
                  </button>
                </td>
              </>
            )}
          />
        )}
      </Card>

      <Modal open={showCreateExam} onClose={() => setShowCreateExam(false)} title="Create Exam">
        <ErrorBanner message={error} />
        <form onSubmit={handleCreateExam} className="space-y-3">
          <Input name="name" label="Exam name (e.g. Midterm 2026)" required />
          <Select name="subjectId" label="Subject" required>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
          <Input name="maxMarks" type="number" label="Max marks" defaultValue={100} required />
          <Button type="submit" className="w-full">Create Exam</Button>
        </form>
      </Modal>

      <Modal open={!!gradeExam} onClose={() => setGradeExam(null)} title={`Enter Grades — ${gradeExam?.name}`}>
        <div className="space-y-2">
          {students.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3">
              <span className="text-sm">{s.firstName} {s.lastName}</span>
              <input
                type="number"
                className="w-24 border border-slate-300 rounded-lg px-2 py-1 text-sm"
                placeholder={`/ ${gradeExam?.maxMarks}`}
                value={marksMap[s.id] || ''}
                onChange={(e) => setMarksMap({ ...marksMap, [s.id]: e.target.value })}
              />
            </div>
          ))}
          <Button onClick={handleSaveGrades} className="w-full mt-3">Save Grades</Button>
        </div>
      </Modal>
    </div>
  );
}

function ReportCardView({ studentId, canDownload }) {
  const [report, setReport] = useState(null);

  useEffect(() => {
    if (studentId) api.get(`/grades/report-card/${studentId}`).then((res) => setReport(res.data));
  }, [studentId]);

  if (!report) return <Spinner />;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-semibold text-lg text-slate-800">{report.student.name}</p>
          {report.student.class && <Badge color="blue">{report.student.class.name} {report.student.class.section}</Badge>}
        </div>
        {canDownload && (
          <a href={`/api/grades/report-card/${studentId}/pdf`} target="_blank" rel="noreferrer">
            <Button variant="secondary">Download PDF</Button>
          </a>
        )}
      </div>
      <Table
        columns={['Subject', 'Percentage', 'Grade']}
        rows={report.subjects}
        renderRow={(s) => (
          <>
            <td className="py-2 pr-4">{s.subject}</td>
            <td className="py-2 pr-4">{s.percentage}%</td>
            <td className="py-2 pr-4"><Badge color="blue">{s.grade}</Badge></td>
          </>
        )}
      />
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs text-slate-500">Overall %</p>
          <p className="text-xl font-semibold">{report.overallPercentage}%</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">GPA</p>
          <p className="text-xl font-semibold">{report.gpa}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Grade</p>
          <p className="text-xl font-semibold">{report.overallGrade}</p>
        </div>
      </div>
    </Card>
  );
}

export default function Grades() {
  const { user } = useAuth();
  const [children, setChildren] = useState([]);
  const [studentId, setStudentId] = useState(user.studentId);

  useEffect(() => {
    if (user.role === 'PARENT') {
      api.get('/students').then((res) => {
        setChildren(res.data);
        if (res.data.length) setStudentId(res.data[0].id);
      });
    }
  }, []);

  if (user.role === 'TEACHER' || user.role === 'ADMIN') {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-800">Grades &amp; Exams</h1>
        <TeacherAdminGrades />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">{user.role === 'STUDENT' ? 'My Grades' : 'Grades'}</h1>
      {user.role === 'PARENT' && (
        <Select label="Child" value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-64">
          {children.map((c) => (
            <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
          ))}
        </Select>
      )}
      <ReportCardView studentId={studentId} canDownload={false} />
    </div>
  );
}
