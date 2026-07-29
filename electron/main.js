const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const isPackaged = app.isPackaged;
const PORT = 4321;

// Resolve paths differently in dev vs packaged app
const resourcesPath = isPackaged ? process.resourcesPath : path.join(__dirname, '..');
const backendDir = path.join(resourcesPath, 'backend');
const frontendDist = path.join(resourcesPath, 'frontend-dist');
const templateDb = path.join(resourcesPath, 'template.db');

function ensureDatabase() {
  const userDataDir = app.getPath('userData');
  if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });
  const dbPath = path.join(userDataDir, 'school.db');

  // First launch: seed the database from the pre-built template
  // (created at build time — see backend/scripts/build-template-db.js)
  if (!fs.existsSync(dbPath) && fs.existsSync(templateDb)) {
    fs.copyFileSync(templateDb, dbPath);
  }
  return dbPath;
}

function startBackend() {
  const dbPath = ensureDatabase();
  process.env.DATABASE_URL = `file:${dbPath}`;
  process.env.FRONTEND_DIST = frontendDist;
  process.env.PORT = String(PORT);
  process.env.CORS_ORIGIN = `http://localhost:${PORT}`;
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'desktop-local-secret-change-if-multiuser';

  // Require the Express server in-process. It exports { app, server } and
  // starts listening immediately (see backend/src/server.js).
  require(path.join(backendDir, 'src', 'server.js'));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'School Management System',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadURL(`http://localhost:${PORT}`);
}

app.whenReady().then(() => {
  try {
    startBackend();
  } catch (err) {
    dialog.showErrorBox('Startup Error', String(err && err.stack ? err.stack : err));
    app.quit();
    return;
  }
  // Give the server a brief moment to bind before loading the window.
  setTimeout(createWindow, 400);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
