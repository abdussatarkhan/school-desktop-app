const express = require('express');
const prisma = require('../utils/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// POST /api/attendance -- Teacher marks attendance for a class on a date
// body: { classId, date, records: [{ studentId, status }] }
router.post('/', authorize('TEACHER', 'ADMIN'), async (req, res) => {
  const { date, records } = req.body;
  if (!Array.isArray(records) || !records.length) {
    return res.status(400).json({ error: 'records[] is required' });
  }
  const day = new Date(date);

  const results = await prisma.$transaction(
    records.map((r) =>
      prisma.attendance.upsert({
        where: { studentId_date: { studentId: Number(r.studentId), date: day } },
        update: { status: r.status, markedById: req.user.teacherId },
        create: {
          studentId: Number(r.studentId),
          date: day,
          status: r.status,
          markedById: req.user.teacherId,
        },
      })
    )
  );
  res.status(201).json(results);
});

// GET /api/attendance/class/:classId?date=YYYY-MM-DD -- attendance sheet for a class on a date
router.get('/class/:classId', authorize('TEACHER', 'ADMIN'), async (req, res) => {
  const classId = Number(req.params.classId);
  const date = req.query.date ? new Date(req.query.date) : new Date();
  const dayStart = new Date(date.setHours(0, 0, 0, 0));
  const dayEnd = new Date(date.setHours(23, 59, 59, 999));

  const students = await prisma.student.findMany({ where: { classId } });
  const attendances = await prisma.attendance.findMany({
    where: { studentId: { in: students.map((s) => s.id) }, date: { gte: dayStart, lte: dayEnd } },
  });
  const byStudent = Object.fromEntries(attendances.map((a) => [a.studentId, a]));

  res.json(
    students.map((s) => ({
      studentId: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      status: byStudent[s.id]?.status || null,
    }))
  );
});

// GET /api/attendance/student/:studentId -- history for one student (self/parent/teacher/admin)
router.get('/student/:studentId', async (req, res) => {
  const studentId = Number(req.params.studentId);
  if (req.user.role === 'STUDENT' && req.user.studentId !== studentId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (req.user.role === 'PARENT') {
    const child = await prisma.student.findFirst({ where: { id: studentId, parentId: req.user.parentId } });
    if (!child) return res.status(403).json({ error: 'Forbidden' });
  }

  const attendances = await prisma.attendance.findMany({
    where: { studentId },
    orderBy: { date: 'desc' },
    take: 90,
  });
  const total = attendances.length;
  const present = attendances.filter((a) => a.status === 'PRESENT').length;
  res.json({
    attendances,
    stats: { total, present, percentage: total ? Math.round((present / total) * 1000) / 10 : 0 },
  });
});

// GET /api/attendance/reports/class/:classId -- Admin analytics (attendance % per student over a range)
router.get('/reports/class/:classId', authorize('ADMIN'), async (req, res) => {
  const classId = Number(req.params.classId);
  const students = await prisma.student.findMany({ where: { classId }, include: { attendances: true } });
  const report = students.map((s) => {
    const total = s.attendances.length;
    const present = s.attendances.filter((a) => a.status === 'PRESENT').length;
    return {
      studentId: s.id,
      name: `${s.firstName} ${s.lastName}`,
      total,
      present,
      percentage: total ? Math.round((present / total) * 1000) / 10 : 0,
    };
  });
  res.json(report);
});

module.exports = router;
