import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_BY_ROLE = {
  ADMIN: [
    { to: '/', label: 'Dashboard', end: true },
    { to: '/students', label: 'Students' },
    { to: '/teachers', label: 'Teachers' },
    { to: '/classes', label: 'Classes & Subjects' },
    { to: '/attendance', label: 'Attendance' },
    { to: '/grades', label: 'Grades & Exams' },
    { to: '/timetable', label: 'Timetable' },
    { to: '/fees', label: 'Fees' },
    { to: '/announcements', label: 'Announcements' },
    { to: '/users', label: 'User Management' },
  ],
  TEACHER: [
    { to: '/', label: 'Dashboard', end: true },
    { to: '/students', label: 'Students' },
    { to: '/attendance', label: 'Attendance' },
    { to: '/grades', label: 'Grades & Exams' },
    { to: '/timetable', label: 'Timetable' },
    { to: '/announcements', label: 'Announcements' },
  ],
  STUDENT: [
    { to: '/', label: 'Dashboard', end: true },
    { to: '/attendance', label: 'My Attendance' },
    { to: '/grades', label: 'My Grades' },
    { to: '/timetable', label: 'My Timetable' },
    { to: '/fees', label: 'My Fees' },
    { to: '/announcements', label: 'Announcements' },
  ],
  PARENT: [
    { to: '/', label: 'Dashboard', end: true },
    { to: '/students', label: 'My Children' },
    { to: '/attendance', label: 'Attendance' },
    { to: '/grades', label: 'Grades' },
    { to: '/fees', label: 'Fees' },
    { to: '/announcements', label: 'Announcements' },
  ],
};

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const nav = NAV_BY_ROLE[user?.role] || [];

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-slate-800">
          <p className="font-bold text-lg leading-tight">School System</p>
          <p className="text-xs text-slate-400 mt-1">{user?.role}</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-slate-800">
          <p className="text-xs text-slate-400 px-3 mb-2 truncate">{user?.email}</p>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
