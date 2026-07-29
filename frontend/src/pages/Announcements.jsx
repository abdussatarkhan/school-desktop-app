import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Input, Select, Modal, Spinner, ErrorBanner, Badge } from '../components/ui';

export default function Announcements() {
  const { user } = useAuth();
  const canPost = user.role === 'ADMIN' || user.role === 'TEACHER';
  const [announcements, setAnnouncements] = useState(null);
  const [classes, setClasses] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [scope, setScope] = useState('SCHOOL');
  const [error, setError] = useState('');

  function load() {
    api.get('/announcements').then((res) => setAnnouncements(res.data));
  }
  useEffect(() => {
    load();
    if (canPost) api.get('/classes').then((res) => setClasses(res.data));
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    const form = new FormData(e.target);
    try {
      await api.post('/announcements', {
        title: form.get('title'),
        body: form.get('body'),
        scope,
        classId: scope === 'CLASS' ? form.get('classId') : undefined,
      });
      setShowAdd(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to post announcement');
    }
  }

  if (!announcements) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Announcements</h1>
        {canPost && <Button onClick={() => setShowAdd(true)}>+ New Announcement</Button>}
      </div>

      <div className="space-y-3">
        {announcements.length === 0 && <p className="text-slate-400 text-sm">No announcements yet.</p>}
        {announcements.map((a) => (
          <Card key={a.id}>
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold text-slate-800">{a.title}</p>
              <Badge color={a.scope === 'SCHOOL' ? 'blue' : 'slate'}>
                {a.scope === 'SCHOOL' ? 'School-wide' : `${a.class?.name} ${a.class?.section}`}
              </Badge>
            </div>
            <p className="text-sm text-slate-600">{a.body}</p>
            <p className="text-xs text-slate-400 mt-2">
              {a.postedBy.email} &middot; {new Date(a.createdAt).toLocaleString()}
            </p>
          </Card>
        ))}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Announcement">
        <ErrorBanner message={error} />
        <form onSubmit={handleAdd} className="space-y-3">
          <Input name="title" label="Title" required />
          <label className="block text-sm">
            <span className="text-slate-600 font-medium mb-1 block">Message</span>
            <textarea name="body" required rows={4} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </label>
          <Select label="Scope" value={scope} onChange={(e) => setScope(e.target.value)}>
            {user.role === 'ADMIN' && <option value="SCHOOL">School-wide</option>}
            <option value="CLASS">Specific class</option>
          </Select>
          {scope === 'CLASS' && (
            <Select name="classId" label="Class" required>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name} - {c.section}</option>
              ))}
            </Select>
          )}
          <Button type="submit" className="w-full">Post Announcement</Button>
        </form>
      </Modal>
    </div>
  );
}
