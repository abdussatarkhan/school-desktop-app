const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function hash(pw) {
  return bcrypt.hash(pw, 10);
}

async function main() {
  console.log('Seeding database...');

  // ---- Admin ----
  const adminPass = await hash('Admin@123');
  await prisma.user.create({
    data: { email: 'admin@school.test', passwordHash: adminPass, role: 'ADMIN' },
  });

  // ---- Subjects ----
  const subjectNames = ['Mathematics', 'English', 'Science', 'Social Studies', 'Computer Science'];
  const subjects = [];
  for (const name of subjectNames) {
    subjects.push(await prisma.subject.create({ data: { name, code: name.slice(0, 3).toUpperCase() } }));
  }

  // ---- Teachers ----
  const teacherSeed = [
    { first: 'Fatima', last: 'Khan' },
    { first: 'Ahmed', last: 'Raza' },
    { first: 'Sara', last: 'Malik' },
  ];
  const teachers = [];
  for (const t of teacherSeed) {
    const pw = await hash('Teacher@123');
    const user = await prisma.user.create({
      data: {
        email: `${t.first.toLowerCase()}.${t.last.toLowerCase()}@school.test`,
        passwordHash: pw,
        role: 'TEACHER',
        teacher: { create: { firstName: t.first, lastName: t.last, phone: '0300-0000000' } },
      },
      include: { teacher: true },
    });
    teachers.push(user.teacher);
  }

  // ---- Classes ----
  const cls8A = await prisma.class.create({ data: { name: 'Grade 8', section: 'A', teacherId: teachers[0].id } });
  const cls9A = await prisma.class.create({ data: { name: 'Grade 9', section: 'A', teacherId: teachers[1].id } });

  // ---- Assign subjects/teachers to classes ----
  for (const subj of subjects) {
    await prisma.classSubject.create({
      data: { classId: cls8A.id, subjectId: subj.id, teacherId: teachers[Math.floor(Math.random() * teachers.length)].id },
    });
    await prisma.classSubject.create({
      data: { classId: cls9A.id, subjectId: subj.id, teacherId: teachers[Math.floor(Math.random() * teachers.length)].id },
    });
  }

  // ---- Timetable (a few slots per class) ----
  const days = [1, 2, 3, 4, 5]; // Mon-Fri
  for (const day of days) {
    await prisma.timetableSlot.create({
      data: {
        classId: cls8A.id,
        subjectId: subjects[0].id,
        teacherId: teachers[0].id,
        dayOfWeek: day,
        startTime: '08:00',
        endTime: '08:45',
      },
    });
    await prisma.timetableSlot.create({
      data: {
        classId: cls8A.id,
        subjectId: subjects[1].id,
        teacherId: teachers[1].id,
        dayOfWeek: day,
        startTime: '08:45',
        endTime: '09:30',
      },
    });
  }

  // ---- Parents + Students ----
  const studentSeed = [
    { first: 'Ali', last: 'Hassan', cls: cls8A },
    { first: 'Zainab', last: 'Ahmed', cls: cls8A },
    { first: 'Bilal', last: 'Iqbal', cls: cls8A },
    { first: 'Ayesha', last: 'Tariq', cls: cls9A },
    { first: 'Usman', last: 'Farooq', cls: cls9A },
  ];

  const students = [];
  for (const s of studentSeed) {
    const parentPw = await hash('Parent@123');
    const parentUser = await prisma.user.create({
      data: {
        email: `parent.${s.first.toLowerCase()}@school.test`,
        passwordHash: parentPw,
        role: 'PARENT',
        parent: { create: { firstName: `${s.last} Sr.`, lastName: s.last, phone: '0321-1111111' } },
      },
      include: { parent: true },
    });

    const studentPw = await hash('Student@123');
    const studentUser = await prisma.user.create({
      data: {
        email: `${s.first.toLowerCase()}.${s.last.toLowerCase()}@school.test`,
        passwordHash: studentPw,
        role: 'STUDENT',
        student: {
          create: {
            firstName: s.first,
            lastName: s.last,
            dob: new Date(2011, 3, 15),
            contact: '0333-2222222',
            guardianName: `${s.last} Sr.`,
            guardianPhone: '0321-1111111',
            classId: s.cls.id,
            parentId: parentUser.parent.id,
          },
        },
      },
      include: { student: true },
    });
    students.push(studentUser.student);
  }

  // ---- Attendance (last 10 school days) ----
  for (const student of students) {
    for (let i = 0; i < 10; i++) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - i);
      const status = Math.random() > 0.15 ? 'PRESENT' : 'ABSENT';
      await prisma.attendance.create({
        data: { studentId: student.id, date, status, markedById: teachers[0].id },
      });
    }
  }

  // ---- Exams + Grades ----
  const midterm = await prisma.exam.create({
    data: { name: 'Midterm 2026', classId: cls8A.id, subjectId: subjects[0].id, teacherId: teachers[0].id, maxMarks: 100 },
  });
  for (const student of students.filter((s) => s.classId === cls8A.id)) {
    await prisma.gradeEntry.create({
      data: { examId: midterm.id, studentId: student.id, marks: 60 + Math.floor(Math.random() * 40) },
    });
  }

  // ---- Fee structure + invoices ----
  const feeStructure8A = await prisma.feeStructure.create({
    data: { classId: cls8A.id, title: 'Tuition Fee - Term 1', amount: 15000, dueDate: new Date(2026, 8, 1) },
  });
  for (const student of students.filter((s) => s.classId === cls8A.id)) {
    await prisma.invoice.create({
      data: { studentId: student.id, feeStructureId: feeStructure8A.id, amountDue: 15000, amountPaid: 0 },
    });
  }

  // ---- Announcement ----
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  await prisma.announcement.create({
    data: { title: 'Welcome to Term 1, 2026!', body: 'School reopens August 1st. Please check your timetables.', scope: 'SCHOOL', postedById: admin.id },
  });

  console.log('Seed complete.');
  console.log('---------------------------------------------');
  console.log('Login credentials (all use the shown password):');
  console.log('  Admin:   admin@school.test / Admin@123');
  console.log('  Teacher: fatima.khan@school.test / Teacher@123');
  console.log('  Student: ali.hassan@school.test / Student@123');
  console.log('  Parent:  parent.ali@school.test / Parent@123');
  console.log('---------------------------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
