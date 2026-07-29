const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const prisma = require('../utils/prisma');
const { signToken } = require('../utils/jwt');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true;
  }
  return false;
}

// POST /api/auth/login
router.post(
  '/login',
  [body('email').isEmail(), body('password').isString().notEmpty()],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { teacher: true, student: true, parent: true },
    });
    if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken({ id: user.id, role: user.role });
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.teacher || user.student || user.parent || null,
      },
    });
  }
);

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { teacher: true, student: { include: { class: true } }, parent: { include: { children: true } } },
  });
  const { passwordHash, ...safeUser } = user;
  res.json(safeUser);
});

// POST /api/auth/change-password
router.post(
  '/change-password',
  authenticate,
  [body('currentPassword').isString().notEmpty(), body('newPassword').isLength({ min: 6 })],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const ok = await bcrypt.compare(req.body.currentPassword, user.passwordHash);
    if (!ok) return res.status(400).json({ error: 'Current password is incorrect' });

    const passwordHash = await bcrypt.hash(req.body.newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    res.json({ message: 'Password updated' });
  }
);

// POST /api/auth/reset-password  (admin-triggered reset for another user)
router.post(
  '/reset-password',
  authenticate,
  [body('userId').isInt(), body('newPassword').isLength({ min: 6 })],
  async (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
    if (handleValidation(req, res)) return;

    const passwordHash = await bcrypt.hash(req.body.newPassword, 10);
    const user = await prisma.user.update({
      where: { id: Number(req.body.userId) },
      data: { passwordHash },
    });
    res.json({ message: `Password reset for ${user.email}` });
  }
);

module.exports = router;
