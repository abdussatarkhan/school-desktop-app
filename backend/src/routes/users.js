const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const prisma = require('../utils/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, authorize('ADMIN'));

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true;
  }
  return false;
}

// GET /api/users?role=TEACHER
router.get('/', async (req, res) => {
  const where = req.query.role ? { role: req.query.role } : {};
  const users = await prisma.user.findMany({
    where,
    select: {
      id: true, email: true, role: true, isActive: true, createdAt: true,
      teacher: true, student: true, parent: true,
    },
    orderBy: { id: 'desc' },
  });
  res.json(users);
});

// POST /api/users  -- create a user of any role, plus its profile row
router.post(
  '/',
  [
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('role').isIn(['ADMIN', 'TEACHER', 'STUDENT', 'PARENT']),
    body('firstName').optional().isString(),
    body('lastName').optional().isString(),
  ],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    const { email, password, role, firstName, lastName, phone, dob, classId, guardianName, guardianPhone, parentId } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        ...(role === 'TEACHER' && {
          teacher: { create: { firstName, lastName, phone } },
        }),
        ...(role === 'PARENT' && {
          parent: { create: { firstName, lastName, phone } },
        }),
        ...(role === 'STUDENT' && {
          student: {
            create: {
              firstName,
              lastName,
              dob: dob ? new Date(dob) : new Date(),
              contact: phone,
              guardianName,
              guardianPhone,
              classId: classId ? Number(classId) : undefined,
              parentId: parentId ? Number(parentId) : undefined,
            },
          },
        }),
      },
      include: { teacher: true, student: true, parent: true },
    });

    const { passwordHash: _omit, ...safeUser } = user;
    res.status(201).json(safeUser);
  }
);

// PUT /api/users/:id  -- update role status / basic profile fields
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { isActive, firstName, lastName, phone } = req.body;

  const user = await prisma.user.findUnique({
    where: { id },
    include: { teacher: true, student: true, parent: true },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (typeof isActive === 'boolean') {
    await prisma.user.update({ where: { id }, data: { isActive } });
  }

  if (user.role === 'TEACHER' && user.teacher && (firstName || lastName || phone)) {
    await prisma.teacher.update({
      where: { id: user.teacher.id },
      data: { firstName, lastName, phone },
    });
  }
  if (user.role === 'STUDENT' && user.student && (firstName || lastName || phone)) {
    await prisma.student.update({
      where: { id: user.student.id },
      data: { firstName, lastName, contact: phone },
    });
  }
  if (user.role === 'PARENT' && user.parent && (firstName || lastName || phone)) {
    await prisma.parent.update({
      where: { id: user.parent.id },
      data: { firstName, lastName, phone },
    });
  }

  res.json({ message: 'User updated' });
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  await prisma.user.delete({ where: { id } });
  res.json({ message: 'User deleted' });
});

module.exports = router;
