const { verifyToken } = require('../utils/jwt');
const prisma = require('../utils/prisma');

/**
 * Verifies the Bearer JWT and attaches `req.user` = { id, role, email }.
 * Also attaches req.user.profileId (Teacher/Student/Parent row id) for convenience.
 */
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing or invalid Authorization header' });

    const payload = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      include: { teacher: true, student: true, parent: true },
    });
    if (!user || !user.isActive) return res.status(401).json({ error: 'User not found or inactive' });

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      teacherId: user.teacher?.id ?? null,
      studentId: user.student?.id ?? null,
      parentId: user.parent?.id ?? null,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** Restricts a route to a set of roles, e.g. authorize('ADMIN', 'TEACHER') */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
