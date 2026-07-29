const express = require('express');
const prisma = require('../utils/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/teachers
router.get('/', async (req, res) => {
  const teachers = await prisma.teacher.findMany({
    include: {
      user: { select: { email: true, isActive: true } },
      subjectAssignments: { include: { subject: true, class: true } },
      classesAsTeacher: true,
    },
    orderBy: { id: 'desc' },
  });
  res.json(teachers);
});

// GET /api/teachers/:id
router.get('/:id', async (req, res) => {
  const teacher = await prisma.teacher.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      user: { select: { email: true } },
      subjectAssignments: { include: { subject: true, class: true } },
      classesAsTeacher: true,
      timetableSlots: { include: { class: true, subject: true } },
    },
  });
  if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
  res.json(teacher);
});

// PUT /api/teachers/:id -- Admin only
router.put('/:id', authorize('ADMIN'), async (req, res) => {
  const { firstName, lastName, phone } = req.body;
  const teacher = await prisma.teacher.update({
    where: { id: Number(req.params.id) },
    data: { firstName, lastName, phone },
  });
  res.json(teacher);
});

// DELETE /api/teachers/:id -- Admin only (cascades to user)
router.delete('/:id', authorize('ADMIN'), async (req, res) => {
  const teacher = await prisma.teacher.findUnique({ where: { id: Number(req.params.id) } });
  if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
  await prisma.user.delete({ where: { id: teacher.userId } });
  res.json({ message: 'Teacher deleted' });
});

// POST /api/teachers/:id/assign -- Admin assigns a teacher to a class+subject
router.post('/:id/assign', authorize('ADMIN'), async (req, res) => {
  const teacherId = Number(req.params.id);
  const { classId, subjectId } = req.body;

  const link = await prisma.classSubject.upsert({
    where: { classId_subjectId: { classId: Number(classId), subjectId: Number(subjectId) } },
    update: { teacherId },
    create: { classId: Number(classId), subjectId: Number(subjectId), teacherId },
  });
  res.json(link);
});

module.exports = router;
