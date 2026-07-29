const express = require('express');
const prisma = require('../utils/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/announcements -- school-wide + (own class, if student/parent)
router.get('/', async (req, res) => {
  let classId = null;
  if (req.user.role === 'STUDENT') {
    const student = await prisma.student.findUnique({ where: { id: req.user.studentId } });
    classId = student?.classId || null;
  }
  if (req.user.role === 'PARENT') {
    const kids = await prisma.student.findMany({ where: { parentId: req.user.parentId } });
    classId = kids[0]?.classId || null; // simple default; extend to multi-child if needed
  }

  const announcements = await prisma.announcement.findMany({
    where: {
      OR: [{ scope: 'SCHOOL' }, ...(classId ? [{ scope: 'CLASS', classId }] : [])],
    },
    include: { postedBy: { select: { email: true, role: true } }, class: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(announcements);
});

// POST /api/announcements -- Admin (school-wide) / Teacher (own class)
router.post('/', authorize('ADMIN', 'TEACHER'), async (req, res) => {
  const { title, body, scope, classId } = req.body;
  if (scope === 'CLASS' && !classId) return res.status(400).json({ error: 'classId is required for CLASS scope' });
  if (req.user.role === 'TEACHER' && scope === 'SCHOOL') {
    return res.status(403).json({ error: 'Teachers can only post class-scoped announcements' });
  }

  const announcement = await prisma.announcement.create({
    data: { title, body, scope, classId: classId ? Number(classId) : null, postedById: req.user.id },
  });

  // fan out simple in-app notifications
  let targetUserIds = [];
  if (scope === 'SCHOOL') {
    const users = await prisma.user.findMany({ select: { id: true } });
    targetUserIds = users.map((u) => u.id);
  } else {
    const students = await prisma.student.findMany({ where: { classId: Number(classId) }, select: { userId: true, parentId: true } });
    targetUserIds = students.map((s) => s.userId);
  }
  if (targetUserIds.length) {
    await prisma.notification.createMany({
      data: targetUserIds.map((userId) => ({ userId, message: `New announcement: ${title}` })),
    });
  }

  res.status(201).json(announcement);
});

// DELETE /api/announcements/:id
router.delete('/:id', authorize('ADMIN', 'TEACHER'), async (req, res) => {
  await prisma.announcement.delete({ where: { id: Number(req.params.id) } });
  res.json({ message: 'Announcement deleted' });
});

// GET /api/announcements/notifications/me
router.get('/notifications/me', async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });
  res.json(notifications);
});

// POST /api/announcements/notifications/:id/read
router.post('/notifications/:id/read', async (req, res) => {
  await prisma.notification.update({ where: { id: Number(req.params.id) }, data: { isRead: true } });
  res.json({ message: 'Marked as read' });
});

module.exports = router;
