# AutoPips — Deployment Guide

## Quick summary

| Environment | Database    | File storage     | Hosting  |
|-------------|-------------|------------------|----------|
| Local dev   | SQLite      | Local disk       | `npm start` |
| Production  | Neon (PG)   | Firebase Storage | Vercel   |

---

## Step 1 — Get a PostgreSQL database (Neon — free)

1. Go to <https://neon.tech> → Sign up for free
2. Create a new project → copy the **Connection string** (starts with `postgres://…`)
3. Set it as `DATABASE_URL` in Vercel and in your local `.env` for the migration

---

## Step 2 — Run the schema migration

```bash
# Install deps first if needed
npm install

# Set DATABASE_URL then run:
node db/migrate-pg.js
```

---

## Step 3 — Get Firebase Storage credentials

1. Open <https://console.firebase.google.com> → Select **autopips-4ab61**
2. Go to **Project Settings → Service Accounts**
3. Click **"Generate new private key"** → Download the JSON file
4. Open the JSON file, copy its entire contents, and **minify it to one line**
   (paste into <https://www.jsonformatter.org/json-minify>)
5. That one-line string goes into `FIREBASE_SERVICE_ACCOUNT_JSON`

> **Never commit this key to source control.** Add it only via Vercel env vars.

---

## Step 4A — Deploy to Firebase Hosting (recommended — you already have Firebase set up)

```bash
# Login to Firebase
firebase login

# From the autopips-node directory:
firebase init
# Choose: Hosting + Functions
# Project: autopips-4ab61
# Functions language: JavaScript
# Public directory: public
# Single-page app: No

# Set environment variables for the function:
firebase functions:config:set \
  app.database_url="postgres://..." \
  app.session_secret="your-secret" \
  app.firebase_service_account_json='{"type":"service_account",...}' \
  app.firebase_storage_bucket="autopips-4ab61.firebasestorage.app" \
  app.admin_path="/mgmt-x7k2" \
  app.app_url="https://autopips-4ab61.web.app" \
  app.node_env="production"

# Deploy
firebase deploy
```

After deploy your app is live at **https://autopips-4ab61.web.app**

> **Note on env vars for Firebase Functions**: the `functions:config:set` command above sets
> Firebase runtime config. To use standard `process.env` instead (simpler), create a `.env.production`
> file in the project root (not committed) and Firebase will load it automatically on deploy.

---

## Step 4B — Deploy to Vercel (no GitHub required)

```bash
# Install Vercel CLI globally (if not done yet)
npm install -g vercel

# From the autopips-node directory:
vercel

# Follow the prompts:
#   Project name: autopips
#   Framework: Other
#   Root directory: ./
#   Build command: (leave blank)
#   Output directory: (leave blank)
```

---

## Step 5 — Set environment variables in Vercel

In the Vercel dashboard (or `vercel env add`), set:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Neon connection string |
| `SESSION_SECRET` | Any long random string |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | The minified service-account JSON |
| `FIREBASE_STORAGE_BUCKET` | `autopips-4ab61.firebasestorage.app` |
| `ADMIN_PATH` | A secret path, e.g. `/mgmt-x7k2` |
| `APP_URL` | Your Vercel URL, e.g. `https://autopips.vercel.app` |
| `NODE_ENV` | `production` |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | Your SMTP provider |

Then redeploy: `vercel --prod`

---

## Local development (no changes needed)

```bash
cp .env.example .env
# Leave DATABASE_URL and FIREBASE_* empty
npm start
# App runs on http://localhost:3000 with SQLite + local disk storage
```

---

## Firebase Storage security rules

In the Firebase Console → Storage → Rules, set:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Only the server (Admin SDK) can write; nobody can read directly
    match /{allPaths=**} {
      allow read: if false;
      allow write: if false;
    }
  }
}
```

All reads go through the server, which serves public URLs after `file.makePublic()`.
