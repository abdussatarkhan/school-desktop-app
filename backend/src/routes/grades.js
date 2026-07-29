const express = require('express');
const PDFDocument = require('pdfkit');
const prisma = require('../utils/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// POST /api/grades/exams -- Teacher/Admin creates an exam for a class+subject
router.post('/exams', authorize('TEACHER', 'ADMIN'), async (req, res) => {
  const { name, classId, subjectId, maxMarks, date } = req.body;
  const exam = await prisma.exam.create({
    data: {
      name,
      classId: Number(classId),
      subjectId: Number(subjectId),
      teacherId: req.user.teacherId || null,
      maxMarks: maxMarks ? Number(maxMarks) : 100,
      date: date ? new Date(date) : new Date(),
    },
  });
  res.status(201).json(exam);
});

// GET /api/grades/exams?classId=
router.get('/exams', async (req, res) => {
  const where = req.query.classId ? { classId: Number(req.query.classId) } : {};
  const exams = await prisma.exam.findMany({
    where,
    include: { subject: true, class: true },
    orderBy: { date: 'desc' },
  });
  res.json(exams);
});

// POST /api/grades/exams/:examId/entries -- Teacher enters grades for many students at once
// body: { entries: [{ studentId, marks, remarks }] }
router.post('/exams/:examId/entries', authorize('TEACHER', 'ADMIN'), async (req, res) => {
  const examId = Number(req.params.examId);
  const { entries } = req.body;
  if (!Array.isArray(entries) || !entries.length) {
    return res.status(400).json({ error: 'entries[] is required' });
  }

  const results = await prisma.$transaction(
    entries.map((e) =>
      prisma.gradeEntry.upsert({
        where: { examId_studentId: { examId, studentId: Number(e.studentId) } },
        update: { marks: Number(e.marks), remarks: e.remarks },
        create: { examId, studentId: Number(e.studentId), marks: Number(e.marks), remarks: e.remarks },
      })
    )
  );
  res.status(201).json(results);
});

function gradeLetter(pct) {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  return 'F';
}

async function buildReportCard(studentId) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      class: true,
      gradeEntries: { include: { exam: { include: { subject: true } } } },
    },
  });
  if (!student) return null;

  const bySubject = {};
  for (const g of student.gradeEntries) {
    const subj = g.exam.subject.name;
    if (!bySubject[subj]) bySubject[subj] = { totalMarks: 0, totalMax: 0, entries: [] };
    bySubject[subj].totalMarks += g.marks;
    bySubject[subj].totalMax += g.exam.maxMarks;
    bySubject[subj].entries.push({ exam: g.exam.name, marks: g.marks, maxMarks: g.exam.maxMarks });
  }

  const subjects = Object.entries(bySubject).map(([subject, v]) => {
    const pct = v.totalMax ? Math.round((v.totalMarks / v.totalMax) * 1000) / 10 : 0;
    return { subject, percentage: pct, grade: gradeLetter(pct), entries: v.entries };
  });

  const overallPct = subjects.length
    ? Math.round((subjects.reduce((s, x) => s + x.percentage, 0) / subjects.length) * 10) / 10
    : 0;
  const gpa = Math.round((overallPct / 20) * 100) / 100; // simple 5.0 scale approximation

  return {
    student: { id: student.id, name: `${student.firstName} ${student.lastName}`, class: student.class },
    subjects,
    overallPercentage: overallPct,
    gpa,
    overallGrade: gradeLetter(overallPct),
  };
}

// GET /api/grades/report-card/:studentId
router.get('/report-card/:studentId', async (req, res) => {
  const studentId = Number(req.params.studentId);
  if (req.user.role === 'STUDENT' && req.user.studentId !== studentId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (req.user.role === 'PARENT') {
    const child = await prisma.student.findFirst({ where: { id: studentId, parentId: req.user.parentId } });
    if (!child) return res.status(403).json({ error: 'Forbidden' });
  }
  const report = await buildReportCard(studentId);
  if (!report) return res.status(404).json({ error: 'Student not found' });
  res.json(report);
});

// GET /api/grades/report-card/:studentId/pdf -- Admin/Teacher: printable PDF
router.get('/report-card/:studentId/pdf', authorize('ADMIN', 'TEACHER'), async (req, res) => {
  const studentId = Number(req.params.studentId);
  const report = await buildReportCard(studentId);
  if (!report) return res.status(404).json({ error: 'Student not found' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=report-card-${studentId}.pdf`);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  doc.fontSize(20).text('Report Card', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Student: ${report.student.name}`);
  doc.text(`Class: ${report.student.class ? `${report.student.class.name} - ${report.student.class.section}` : 'N/A'}`);
  doc.moveDown();

  doc.fontSize(14).text('Subjects', { underline: true });
  doc.moveDown(0.5);
  report.subjects.forEach((s) => {
    doc.fontSize(11).text(`${s.subject}: ${s.percentage}%  (Grade ${s.grade})`);
  });

  doc.moveDown();
  doc.fontSize(13).text(`Overall Percentage: ${report.overallPercentage}%`);
  doc.text(`GPA: ${report.gpa}`);
  doc.text(`Overall Grade: ${report.overallGrade}`);

  doc.end();
});

module.exports = router;
