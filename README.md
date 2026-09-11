# EduAdmin — Desktop School Management & Student Administration System

<div align="center">

[![Daily Streak](https://img.shields.io/badge/Daily%20Streak-Active%20%F0%9F%94%A5-brightgreen?style=flat-square&logo=github)](https://github.com/abdussatarkhan)
[![Software Portfolio](https://img.shields.io/badge/Portfolio-Software%20Engineering%20%26%20Systems-0e75b6?style=flat-square&logo=github)](https://github.com/abdussatarkhan)
[![Author: Abdussatar](https://img.shields.io/badge/Author-Abdussatar-24292e?style=flat-square&logo=github)](https://github.com/abdussatarkhan)

</div>

[![CI](https://github.com/abdussatarkhan/school-desktop-app/actions/workflows/ci.yml/badge.svg)](https://github.com/abdussatarkhan/school-desktop-app/actions)
[![Electron](https://img.shields.io/badge/Electron-Desktop_Framework-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React_18-Vite_Frontend-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express_Backend-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)

> **A modern desktop school information and administration system engineered with Electron, React (Vite), Node.js/Express, and Prisma ORM — streamlining student admissions, enrollment records, classroom attendance, fee challan generation, and academic gradebook report cards.**

---

## 🏛️ System Architecture

```mermaid
graph TD
    Desktop[Electron Native Desktop Shell] --> Frontend[React 18 / Vite Administrative UI]
    Frontend --> BackendAPI[Node.js / Express REST Server]
    BackendAPI --> Prisma[Prisma ORM Data Access Layer]
    Prisma --> DB[(Local Relational Database: SQLite / PostgreSQL)]
    BackendAPI --> FeeBilling[Fee Challan & Invoicing Engine]
    BackendAPI --> Attendance[Daily Attendance & Gradebook Service]
```

---

## 🌟 Key Features & Capabilities

- **🖥️ Cross-Platform Electron Desktop Shell**: Native desktop application with optimized IPC communication between the React administrative user interface and the local Node.js Express server.
- **🎓 Student Information & Admissions**: Complete student demographic records, registration numbering, class section allocations, and guardian contact details.
- **💵 Fee Invoicing & Challan Generation**: Automated monthly fee voucher generation, scholarship deductions, fine calculation, and payment status tracking.
- **📊 Attendance & Academic Gradebook**: Daily period-wise attendance logging, exam term grade recordings, and printable academic student report cards.

---

## 🚀 Quickstart & Setup

### Prerequisites
- [Node.js 18+](https://nodejs.org/en/download/)
- npm or yarn

### 1. Clone the Repository
```bash
git clone https://github.com/abdussatarkhan/school-desktop-app.git
cd school-desktop-app
```

### 2. Install Dependencies & Build
```bash
# Install root workspace dependencies
npm install

# Setup backend and Prisma database
cd backend
npm install
npm run db:generate
cd ..

# Setup frontend dependencies
cd frontend
npm install
cd ..

# Launch the desktop application in development mode
npm run dev
```

For building production desktop binaries (.exe / .dmg / AppImage), refer to [`DESKTOP_BUILD_GUIDE.md`](DESKTOP_BUILD_GUIDE.md).

---

## 🖥️ Application & Operational Interface

<p align="center">
  <img src="screenshots/01_dashboard_preview.png" alt="EduAdmin School Administration Console Preview" width="95%" />
</p>

> [!TIP]
> You can also explore [`dashboard.html`](dashboard.html) directly in any modern browser for a standalone interface walkthrough.

---

## 🗺️ Roadmap & Upcoming Enhancements

- [x] Electron + React 18 desktop architecture with Prisma ORM
- [x] Student admission and class enrollment directory
- [x] Fee voucher calculation and receipt generation
- [ ] Automated SMS notification dispatch to parents upon absence
- [ ] Biometric fingerprint scanner hardware integration
- [ ] Teacher payroll and staff leave management module

---

## 👨‍💻 Author & Contact

Built and maintained by **Abdussatar** ([@abdussatarkhan](https://github.com/abdussatarkhan)).  
For technical discussions, collaboration, or queries, feel free to reach out via [LinkedIn](https://www.linkedin.com/in/abdus-satar-5150813b5/) or [GitHub](https://github.com/abdussatarkhan).

---

## 📜 License

This project is licensed under the **MIT License** — see the LICENSE file for details.

---

<div align="center">

### 👨‍💻 Maintained by [Abdussatar (@abdussatarkhan)](https://github.com/abdussatarkhan)
Part of the **[Abdussatar Software Engineering & Systems Portfolio](https://github.com/abdussatarkhan)**.

⭐ If you find this project valuable, consider dropping a star! ⭐

</div>
