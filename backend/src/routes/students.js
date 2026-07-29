const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../utils/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true;
  }
  return false;
}

// GET /api/students  -- Admin/Teacher: all (optionally by class). Parent: own children. Student: self only.
router.get('/', async (req, res) => {
  let where = {};
  if (req.user.role === 'PARENT') {
    where = { parentId: req.user.parentId };
  } else if (req.user.role === 'STUDENT') {
    where = { id: req.user.studentId };
  } else if (req.query.classId) {
    where = { classId: Number(req.query.classId) };
  }

  const students = await prisma.student.findMany({
    where,
    include: { class: true, user: { select: { email: true, isActive: true } } },
    orderBy: { id: 'desc' },
  });
  res.json(students);
});

// GET /api/students/:id/profile -- full academic history
router.get('/:id/profile', async (req, res) => {
  const id = Number(req.params.id);

  if (req.user.role === 'STUDENT' && req.user.studentId !== id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (req.user.role === 'PARENT') {
    const child = await prisma.student.findFirst({ where: { id, parentId: req.user.parentId } });
    if (!child) return res.status(403).json({ error: 'Forbidden' });
  }

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      class: true,
      user: { select: { email: true } },
      attendances: { orderBy: { date: 'desc' }, take: 60 },
      gradeEntries: { include: { exam: { include: { subject: true } } }, orderBy: { createdAt: 'desc' } },
      invoices: { include: { feeStructure: true } },
    },
  });
  if (!student) return res.status(404).json({ error: 'Student not found' });
  res.json(student);
});

// POST /api/students -- Admin only (creating student without a login; use /api/users for full account)
router.post(
  '/',
  authorize('ADMIN'),
  [body('firstName').notEmpty(), body('lastName').notEmpty(), body('dob').isISO8601()],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    return res.status(400).json({
      error: 'Use POST /api/users with role=STUDENT to create a student account (it creates the login + profile together).',
    });
  }
);

// PUT /api/students/:id -- Admin (any field) / Teacher (limited: class assignment)
router.put('/:id', authorize('ADMIN', 'TEACHER'), async (req, res) => {
  const id = Number(req.params.id);
  const { firstName, lastName, dob, contact, guardianName, guardianPhone, classId, parentId } = req.body;

  const data = { firstName, lastName, contact, guardianName, guardianPhone };
  if (dob) data.dob = new Date(dob);
  if (classId !== undefined) data.classId = classId ? Number(classId) : null;
  if (req.user.role === 'ADMIN' && parentId !== undefined) data.parentId = parentId ? Number(parentId) : null;

  const student = await prisma.student.update({ where: { id }, data });
  res.json(student);
});

// DELETE /api/students/:id -- Admin only (cascades to user)
router.delete('/:id', authorize('ADMIN'), async (req, res) => {
  const id = Number(req.params.id);
  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) return res.status(404).json({ error: 'Student not found' });
  await prisma.user.delete({ where: { id: student.userId } });
  res.json({ message: 'Student deleted' });
});

module.exports = router;
