# Desktop App Build Guide

This turns the School Management System into a **standalone desktop app**
(Windows `.exe` and Mac `.dmg`). No hosting, no server, no internet needed
by the client — everything (app + database) runs locally on their machine.

You will end up with **two download links** (one per OS) to send the client.

---

## Why GitHub Actions (not building it yourself)

Real Mac installers can only be built on a real Mac (Apple requires it).
Rather than needing both a Windows and a Mac machine yourself, this project
is already set up so **GitHub builds both for you automatically**, for free,
using GitHub Actions. You just push code and wait ~10 minutes.

---

## One-time setup

### 1. Create a GitHub repo and push this project
```bash
git init
git add .
git commit -m "Desktop app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/school-desktop-app.git
git push -u origin main
```

### 2. Generate the first database migration (one time, needs internet)
This step needs to run once on a machine with normal internet access
(your laptop is fine) because it downloads Prisma's SQLite engine.

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
```

This creates a `backend/prisma/migrations/` folder. Commit it:
```bash
cd ..
git add backend/prisma/migrations
git commit -m "Add initial migration"
git push
```

*(You only need to do this once, ever — after this, migrations are already
in the repo and every future build reuses them.)*

---

## Build the installers

Every time you want to (re)build the app for the client:

```bash
git tag v1.0.0
git push origin v1.0.0
```

That's it. This triggers GitHub Actions, which:
1. Builds the frontend
2. Generates the demo database (with seeded accounts)
3. Packages a Windows `.exe` **and** a Mac `.dmg`
4. Publishes both as a GitHub Release

### Get the download links
1. Go to your repo on GitHub → **Releases** (right sidebar, or `github.com/YOUR_USERNAME/school-desktop-app/releases`).
2. Wait for the build to finish (check the **Actions** tab for progress, ~8–12 min).
3. Open the new release — you'll see two files:
   - `School Management System Setup 1.0.0.exe` (Windows)
   - `School Management System-1.0.0.dmg` (Mac)
4. Right-click each → **Copy link**. These are your two download links.

Send the client the link matching their OS (or both).

---

## What the client experiences

1. Downloads the file for their OS.
2. **Windows:** runs the `.exe`, clicks through the install wizard.
   **Mac:** opens the `.dmg`, drags the app into Applications.
3. Opens "School Management System" from their Start Menu / Applications.
4. The app opens as a normal desktop window — no browser, no internet
   required after install. Data is stored locally on their machine.
5. Demo login accounts are pre-seeded — check `backend/prisma/seed.js`
   for the exact credentials, or change them before shipping to the client.

---

## Important: unsigned app warnings

This build isn't code-signed (that requires paid Apple/Microsoft developer
certificates — $99/yr and ~$200-400/yr respectively). Because of that:

- **Windows:** SmartScreen will show "Windows protected your PC." The user
  clicks **More info → Run anyway**.
- **Mac:** Gatekeeper will block it the first time. The user right-clicks
  the app → **Open** → **Open** (only needed the first launch).

Tell the client about this in advance so it doesn't look broken. If this
matters for their business (e.g. a polished commercial product), the next
step would be purchasing a code-signing certificate — let me know if you
want help with that later.

---

## Updating the app later

Change the code, then repeat the tag step with a new version number:
```bash
git tag v1.0.1
git push origin v1.0.1
```
New installers will appear under a new GitHub Release. Note: this is a
**fresh reinstall**, not an auto-updater — each user re-downloads and
reinstalls to update. (Auto-update is possible later via `electron-updater`
if the client wants it.)

---

## Local testing (optional, before shipping)

To run the app on your own machine without building installers:
```bash
npm install
npm run build:frontend
npm run build:template-db
npx electron .
```
