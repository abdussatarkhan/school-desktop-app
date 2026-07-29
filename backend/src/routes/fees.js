const express = require('express');
const PDFDocument = require('pdfkit');
const prisma = require('../utils/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// POST /api/fees/structures -- Admin defines a fee structure for a class, and auto-generates invoices for its students
router.post('/structures', authorize('ADMIN'), async (req, res) => {
  const { classId, title, amount, dueDate } = req.body;
  const structure = await prisma.feeStructure.create({
    data: { classId: Number(classId), title, amount: Number(amount), dueDate: new Date(dueDate) },
  });

  const students = await prisma.student.findMany({ where: { classId: Number(classId) } });
  if (students.length) {
    await prisma.invoice.createMany({
      data: students.map((s) => ({
        studentId: s.id,
        feeStructureId: structure.id,
        amountDue: Number(amount),
      })),
    });
  }
  res.status(201).json(structure);
});

// GET /api/fees/structures?classId=
router.get('/structures', async (req, res) => {
  const where = req.query.classId ? { classId: Number(req.query.classId) } : {};
  const structures = await prisma.feeStructure.findMany({ where, include: { class: true }, orderBy: { dueDate: 'asc' } });
  res.json(structures);
});

// GET /api/fees/invoices -- Admin: all/by class. Parent: own children. Student: self.
router.get('/invoices', async (req, res) => {
  let where = {};
  if (req.user.role === 'STUDENT') where = { studentId: req.user.studentId };
  else if (req.user.role === 'PARENT') {
    const kids = await prisma.student.findMany({ where: { parentId: req.user.parentId }, select: { id: true } });
    where = { studentId: { in: kids.map((k) => k.id) } };
  } else if (req.query.classId) {
    const kids = await prisma.student.findMany({ where: { classId: Number(req.query.classId) }, select: { id: true } });
    where = { studentId: { in: kids.map((k) => k.id) } };
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: { student: true, feeStructure: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(invoices);
});

// POST /api/fees/invoices/:id/pay -- Admin records a payment
router.post('/invoices/:id/pay', authorize('ADMIN'), async (req, res) => {
  const id = Number(req.params.id);
  const { amount } = req.body;
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const amountPaid = invoice.amountPaid + Number(amount);
  const status = amountPaid >= invoice.amountDue ? 'PAID' : amountPaid > 0 ? 'PARTIAL' : 'UNPAID';

  const updated = await prisma.invoice.update({
    where: { id },
    data: { amountPaid, status, paidAt: status === 'PAID' ? new Date() : invoice.paidAt },
  });
  res.json(updated);
});

// GET /api/fees/invoices/:id/receipt.pdf
router.get('/invoices/:id/receipt.pdf', async (req, res) => {
  const id = Number(req.params.id);
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { student: true, feeStructure: { include: { class: true } } },
  });
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  if (req.user.role === 'STUDENT' && req.user.studentId !== invoice.studentId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=receipt-${id}.pdf`);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);
  doc.fontSize(20).text('Fee Invoice / Receipt', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Invoice #: ${invoice.id}`);
  doc.text(`Student: ${invoice.student.firstName} ${invoice.student.lastName}`);
  doc.text(`Class: ${invoice.feeStructure.class.name} - ${invoice.feeStructure.class.section}`);
  doc.text(`Fee: ${invoice.feeStructure.title}`);
  doc.moveDown();
  doc.text(`Amount Due: ${invoice.amountDue.toFixed(2)}`);
  doc.text(`Amount Paid: ${invoice.amountPaid.toFixed(2)}`);
  doc.text(`Status: ${invoice.status}`);
  doc.text(`Due Date: ${invoice.feeStructure.dueDate.toDateString()}`);
  doc.end();
});

module.exports = router;
