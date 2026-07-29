import { useEffect, useState } from 'react';
import api from '../api/client';
import { Button, Card, Select, Table, Spinner, Badge } from '../components/ui';

const ROLE_COLOR = { ADMIN: 'red', TEACHER: 'blue', STUDENT: 'green', PARENT: 'amber' };

export default function Users() {
  const [role, setRole] = useState('');
  const [users, setUsers] = useState(null);

  function load() {
    api.get('/users', { params: role ? { role } : {} }).then((res) => setUsers(res.data));
  }
  useEffect(load, [role]);

  async function toggleActive(u) {
    await api.put(`/users/${u.id}`, { isActive: !u.isActive });
    load();
  }

  async function handleDelete(u) {
    if (!confirm(`Delete user ${u.email}? This is permanent.`)) return;
    await api.delete(`/users/${u.id}`);
    load();
  }

  if (!users) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
        <Select value={role} onChange={(e) => setRole(e.target.value)} className="w-40">
          <option value="">All roles</option>
          <option value="ADMIN">Admin</option>
          <option value="TEACHER">Teacher</option>
          <option value="STUDENT">Student</option>
          <option value="PARENT">Parent</option>
        </Select>
      </div>
      <p className="text-sm text-slate-500">
        To create new accounts, use the Students, Teachers pages (for those roles), or add Admin/Parent accounts via the API directly.
      </p>
      <Card>
        <Table
          columns={['Email', 'Role', 'Status', '']}
          rows={users}
          renderRow={(u) => (
            <>
              <td className="py-2 pr-4 font-medium text-slate-700">{u.email}</td>
              <td className="py-2 pr-4"><Badge color={ROLE_COLOR[u.role]}>{u.role}</Badge></td>
              <td className="py-2 pr-4"><Badge color={u.isActive ? 'green' : 'slate'}>{u.isActive ? 'Active' : 'Disabled'}</Badge></td>
              <td className="py-2 pr-4 space-x-2">
                <button className="text-brand-600 hover:underline text-sm" onClick={() => toggleActive(u)}>
                  {u.isActive ? 'Disable' : 'Enable'}
                </button>
                <button className="text-red-600 hover:underline text-sm" onClick={() => handleDelete(u)}>
                  Delete
                </button>
              </td>
            </>
          )}
        />
      </Card>
    </div>
  );
}
