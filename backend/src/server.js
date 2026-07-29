require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const studentRoutes = require('./routes/students');
const teacherRoutes = require('./routes/teachers');
const classRoutes = require('./routes/classes');
const attendanceRoutes = require('./routes/attendance');
const gradeRoutes = require('./routes/grades');
const timetableRoutes = require('./routes/timetable');
const feeRoutes = require('./routes/fees');
const announcementRoutes = require('./routes/announcements');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 handler for unmatched API routes
app.use('/api', (req, res) => res.status(404).json({ error: 'Route not found' }));

// Central error handler (must stay before static/SPA fallback so API errors return JSON)
app.use('/api', (err, req, res, next) => {
  console.error(err);
  if (err.code === 'P2025') return res.status(404).json({ error: 'Record not found' });
  if (err.code === 'P2002') return res.status(409).json({ error: 'Unique constraint violation', meta: err.meta });
  res.status(500).json({ error: 'Internal server error' });
});

// Serve the built frontend (desktop app mode). FRONTEND_DIST is set by the
// Electron main process; falls back to ../frontend-dist for standalone use.
const frontendDist = process.env.FRONTEND_DIST || path.join(__dirname, '..', 'frontend-dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => console.log(`School System listening on port ${PORT}`));

module.exports = { app, server };
