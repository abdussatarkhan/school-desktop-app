const express = require('express');
const prisma = require('../utils/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/classes
router.get('/', async (req, res) => {
  const classes = await prisma.class.findMany({
    include: {
      classTeacher: true,
      students: { select: { id: true, firstName: true, lastName: true } },
      subjects: { include: { subject: true, teacher: true } },
    },
    orderBy: [{ name: 'asc' }, { section: 'asc' }],
  });
  res.json(classes);
});

// GET /api/classes/:id
router.get('/:id', async (req, res) => {
  const cls = await prisma.class.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      classTeacher: true,
      students: true,
      subjects: { include: { subject: true, teacher: true } },
      timetable: { include: { subject: true, teacher: true } },
    },
  });
  if (!cls) return res.status(404).json({ error: 'Class not found' });
  res.json(cls);
});

// POST /api/classes -- Admin only
router.post('/', authorize('ADMIN'), async (req, res) => {
  const { name, section, teacherId } = req.body;
  try {
    const cls = await prisma.class.create({
      data: { name, section, teacherId: teacherId ? Number(teacherId) : undefined },
    });
    res.status(201).json(cls);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Class + section already exists' });
    throw err;
  }
});

// PUT /api/classes/:id -- Admin only
router.put('/:id', authorize('ADMIN'), async (req, res) => {
  const { name, section, teacherId } = req.body;
  const cls = await prisma.class.update({
    where: { id: Number(req.params.id) },
    data: { name, section, teacherId: teacherId !== undefined ? (teacherId ? Number(teacherId) : null) : undefined },
  });
  res.json(cls);
});

// DELETE /api/classes/:id -- Admin only
router.delete('/:id', authorize('ADMIN'), async (req, res) => {
  await prisma.class.delete({ where: { id: Number(req.params.id) } });
  res.json({ message: 'Class deleted' });
});

// POST /api/classes/:id/subjects -- Admin assigns a subject (+ optional teacher) to a class
router.post('/:id/subjects', authorize('ADMIN'), async (req, res) => {
  const classId = Number(req.params.id);
  const { subjectId, teacherId } = req.body;
  const link = await prisma.classSubject.upsert({
    where: { classId_subjectId: { classId, subjectId: Number(subjectId) } },
    update: { teacherId: teacherId ? Number(teacherId) : undefined },
    create: { classId, subjectId: Number(subjectId), teacherId: teacherId ? Number(teacherId) : undefined },
  });
  res.status(201).json(link);
});

// ---- Subjects (nested under the same router for simplicity) ----

// GET /api/classes/meta/subjects
router.get('/meta/subjects', async (req, res) => {
  const subjects = await prisma.subject.findMany({ orderBy: { name: 'asc' } });
  res.json(subjects);
});

// POST /api/classes/meta/subjects -- Admin only
router.post('/meta/subjects', authorize('ADMIN'), async (req, res) => {
  const { name, code } = req.body;
  const subject = await prisma.subject.create({ data: { name, code } });
  res.status(201).json(subject);
});

// DELETE /api/classes/meta/subjects/:id -- Admin only
router.delete('/meta/subjects/:id', authorize('ADMIN'), async (req, res) => {
  await prisma.subject.delete({ where: { id: Number(req.params.id) } });
  res.json({ message: 'Subject deleted' });
});

module.exports = router;
