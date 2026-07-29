// Generates backend/prisma/template.db: a fresh SQLite database with all
// migrations applied and demo data seeded. This file is bundled into the
// desktop installer and copied to each user's machine on first launch
// (see electron/main.js -> ensureDatabase()).
//
// Run with: npm run build:template-db  (from the project root)
// Requires internet access the first time (to fetch Prisma's SQLite engine).

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const backendDir = path.join(__dirname, '..');
const templatePath = path.join(backendDir, 'prisma', 'template.db');
const migrationsDir = path.join(backendDir, 'prisma', 'migrations');

if (fs.existsSync(templatePath)) fs.unlinkSync(templatePath);

const env = { ...process.env, DATABASE_URL: `file:${templatePath}` };

console.log('Generating Prisma client...');
execSync('npx prisma generate', { cwd: backendDir, stdio: 'inherit', env });

if (!fs.existsSync(migrationsDir) || fs.readdirSync(migrationsDir).length === 0) {
  console.log('No migrations found yet — creating the initial migration...');
  execSync('npx prisma migrate dev --name init --skip-generate', {
    cwd: backendDir,
    stdio: 'inherit',
    env,
  });
} else {
  console.log('Applying existing migrations...');
  execSync('npx prisma migrate deploy', { cwd: backendDir, stdio: 'inherit', env });
}

console.log('Seeding demo data...');
execSync('node prisma/seed.js', { cwd: backendDir, stdio: 'inherit', env });

console.log('Template database ready at', templatePath);
