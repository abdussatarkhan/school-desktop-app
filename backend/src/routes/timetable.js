const express = require('express');
const prisma = require('../utils/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/timetable/class/:classId
router.get('/class/:classId', async (req, res) => {
  const slots = await prisma.timetableSlot.findMany({
    where: { classId: Number(req.params.classId) },
    include: { subject: true, teacher: true },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });
  res.json(slots);
});

// GET /api/timetable/teacher/:teacherId
router.get('/teacher/:teacherId', async (req, res) => {
  const slots = await prisma.timetableSlot.findMany({
    where: { teacherId: Number(req.params.teacherId) },
    include: { subject: true, class: true },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });
  res.json(slots);
});

// GET /api/timetable/me -- convenience for logged-in student/teacher
router.get('/me', async (req, res) => {
  if (req.user.role === 'TEACHER') {
    const slots = await prisma.timetableSlot.findMany({
      where: { teacherId: req.user.teacherId },
      include: { subject: true, class: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    return res.json(slots);
  }
  if (req.user.role === 'STUDENT') {
    const student = await prisma.student.findUnique({ where: { id: req.user.studentId } });
    const slots = await prisma.timetableSlot.findMany({
      where: { classId: student?.classId || -1 },
      include: { subject: true, teacher: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    return res.json(slots);
  }
  res.json([]);
});

// POST /api/timetable -- Admin/Teacher creates a slot
router.post('/', authorize('ADMIN', 'TEACHER'), async (req, res) => {
  const { classId, subjectId, teacherId, dayOfWeek, startTime, endTime } = req.body;
  const slot = await prisma.timetableSlot.create({
    data: {
      classId: Number(classId),
      subjectId: Number(subjectId),
      teacherId: teacherId ? Number(teacherId) : null,
      dayOfWeek: Number(dayOfWeek),
      startTime,
      endTime,
    },
  });
  res.status(201).json(slot);
});

// PUT /api/timetable/:id
router.put('/:id', authorize('ADMIN', 'TEACHER'), async (req, res) => {
  const { subjectId, teacherId, dayOfWeek, startTime, endTime } = req.body;
  const slot = await prisma.timetableSlot.update({
    where: { id: Number(req.params.id) },
    data: {
      subjectId: subjectId ? Number(subjectId) : undefined,
      teacherId: teacherId !== undefined ? (teacherId ? Number(teacherId) : null) : undefined,
      dayOfWeek: dayOfWeek !== undefined ? Number(dayOfWeek) : undefined,
      startTime,
      endTime,
    },
  });
  res.json(slot);
});

// DELETE /api/timetable/:id
router.delete('/:id', authorize('ADMIN', 'TEACHER'), async (req, res) => {
  await prisma.timetableSlot.delete({ where: { id: Number(req.params.id) } });
  res.json({ message: 'Slot deleted' });
});

module.exports = router;
