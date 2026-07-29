const express = require('express');
const prisma = require('../utils/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/dashboard -- returns role-specific summary stats
router.get('/', async (req, res) => {
  const { role } = req.user;

  if (role === 'ADMIN') {
    const [studentCount, teacherCount, classCount, invoices, attendances] = await Promise.all([
      prisma.student.count(),
      prisma.teacher.count(),
      prisma.class.count(),
      prisma.invoice.findMany(),
      prisma.attendance.findMany({ where: { date: { gte: new Date(Date.now() - 30 * 86400000) } } }),
    ]);
    const totalDue = invoices.reduce((s, i) => s + i.amountDue, 0);
    const totalCollected = invoices.reduce((s, i) => s + i.amountPaid, 0);
    const present = attendances.filter((a) => a.status === 'PRESENT').length;
    const attendancePct = attendances.length ? Math.round((present / attendances.length) * 1000) / 10 : 0;

    return res.json({
      studentCount,
      teacherCount,
      classCount,
      feeCollection: { totalDue, totalCollected, collectionRate: totalDue ? Math.round((totalCollected / totalDue) * 1000) / 10 : 0 },
      attendanceRate30d: attendancePct,
    });
  }

  if (role === 'TEACHER') {
    const classes = await prisma.class.findMany({ where: { teacherId: req.user.teacherId } });
    const assignments = await prisma.classSubject.findMany({ where: { teacherId: req.user.teacherId }, include: { class: true, subject: true } });
    const exams = await prisma.exam.count({ where: { teacherId: req.user.teacherId } });
    return res.json({ classesAsHomeroom: classes, subjectAssignments: assignments, examsCreated: exams });
  }

  if (role === 'STUDENT') {
    const student = await prisma.student.findUnique({ where: { id: req.user.studentId } });
    const attendances = await prisma.attendance.findMany({ where: { studentId: req.user.studentId } });
    const present = attendances.filter((a) => a.status === 'PRESENT').length;
    const gradeEntries = await prisma.gradeEntry.findMany({ where: { studentId: req.user.studentId }, include: { exam: true } });
    const avgPct = gradeEntries.length
      ? Math.round((gradeEntries.reduce((s, g) => s + (g.marks / g.exam.maxMarks) * 100, 0) / gradeEntries.length) * 10) / 10
      : 0;
    const invoices = await prisma.invoice.findMany({ where: { studentId: req.user.studentId } });
    const dueTotal = invoices.reduce((s, i) => s + (i.amountDue - i.amountPaid), 0);

    return res.json({
      attendanceRate: attendances.length ? Math.round((present / attendances.length) * 1000) / 10 : 0,
      averageGradePercentage: avgPct,
      feesOutstanding: dueTotal,
      classId: student?.classId,
    });
  }

  if (role === 'PARENT') {
    const children = await prisma.student.findMany({ where: { parentId: req.user.parentId } });
    const childStats = await Promise.all(
      children.map(async (c) => {
        const attendances = await prisma.attendance.findMany({ where: { studentId: c.id } });
        const present = attendances.filter((a) => a.status === 'PRESENT').length;
        const invoices = await prisma.invoice.findMany({ where: { studentId: c.id } });
        const dueTotal = invoices.reduce((s, i) => s + (i.amountDue - i.amountPaid), 0);
        return {
          studentId: c.id,
          name: `${c.firstName} ${c.lastName}`,
          attendanceRate: attendances.length ? Math.round((present / attendances.length) * 1000) / 10 : 0,
          feesOutstanding: dueTotal,
        };
      })
    );
    return res.json({ children: childStats });
  }

  res.json({});
});

module.exports = router;
