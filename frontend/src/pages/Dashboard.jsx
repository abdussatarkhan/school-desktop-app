import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Spinner, StatCard, Card } from '../components/ui';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/dashboard').then((res) => setData(res.data));
  }, []);

  if (!data) return <Spinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}</h1>
        <p className="text-slate-500 text-sm">Here's what's happening in your school today.</p>
      </div>

      {user.role === 'ADMIN' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Students" value={data.studentCount} />
            <StatCard label="Teachers" value={data.teacherCount} />
            <StatCard label="Classes" value={data.classCount} />
            <StatCard label="Attendance (30d)" value={`${data.attendanceRate30d}%`} />
          </div>
          <Card>
            <p className="font-semibold text-slate-700 mb-3">Fee Collection</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-slate-500">Total Due</p>
                <p className="text-xl font-semibold">{data.feeCollection.totalDue.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Collected</p>
                <p className="text-xl font-semibold text-emerald-600">{data.feeCollection.totalCollected.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Collection Rate</p>
                <p className="text-xl font-semibold">{data.feeCollection.collectionRate}%</p>
              </div>
            </div>
          </Card>
        </>
      )}

      {user.role === 'TEACHER' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard label="Homeroom Classes" value={data.classesAsHomeroom.length} />
            <StatCard label="Subject Assignments" value={data.subjectAssignments.length} />
            <StatCard label="Exams Created" value={data.examsCreated} />
          </div>
          <Card>
            <p className="font-semibold text-slate-700 mb-3">Your Subject Assignments</p>
            <ul className="text-sm space-y-1">
              {data.subjectAssignments.map((a) => (
                <li key={a.id} className="text-slate-600">
                  {a.subject.name} — {a.class.name} {a.class.section}
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}

      {user.role === 'STUDENT' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard label="Attendance Rate" value={`${data.attendanceRate}%`} />
          <StatCard label="Average Grade" value={`${data.averageGradePercentage}%`} />
          <StatCard label="Fees Outstanding" value={data.feesOutstanding.toLocaleString()} />
        </div>
      )}

      {user.role === 'PARENT' && (
        <div className="space-y-4">
          {data.children.map((c) => (
            <Card key={c.studentId}>
              <p className="font-semibold text-slate-700 mb-2">{c.name}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Attendance Rate</p>
                  <p className="text-lg font-semibold">{c.attendanceRate}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Fees Outstanding</p>
                  <p className="text-lg font-semibold">{c.feesOutstanding.toLocaleString()}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
