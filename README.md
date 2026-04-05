# File Manager — Vercel Deployment Guide

## 🚀 Deploy to Vercel (Step by Step)

### Login Credentials
- **Email:** `Rupam@admin.com`
- **Password:** `Rupam@123`

---

## Step 1 — Install Dependencies Locally (optional test)
```bash
npm install
node server.js
```
Open http://localhost:3000

---

## Step 2 — Push to GitHub

```bash
git init
git add .
git commit -m "File Manager - Vercel Ready"
```

Go to https://github.com → New Repository → create it, then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

---

## Step 3 — Deploy on Vercel

1. Go to https://vercel.com and sign in with GitHub
2. Click **"New Project"**
3. Import your GitHub repository
4. Set **Framework Preset** → **Other**
5. Add **Environment Variable**:

| Key | Value |
|-----|-------|
| `MONGODB_URI` | `mongodb+srv://filemanager:Rupam123@file.ceado4y.mongodb.net/filemanagerDB?retryWrites=true&w=majority&appName=FILE` |

6. Click **Deploy** ✅

---

## Step 4 — Fix MongoDB Atlas Network Access

1. Go to https://cloud.mongodb.com
2. **Network Access** → **Add IP Address**
3. Select **"Allow Access from Anywhere"** → `0.0.0.0/0`
4. Click **Confirm**

---

## What Changed from Original

| Feature | Original | This Version |
|---------|----------|-------------|
| File Storage | Local disk (`/uploads`) | MongoDB GridFS (cloud) |
| Works on Vercel | ❌ No | ✅ Yes |
| MongoDB connection | Local fallback | Atlas only |
| File upload | multer disk | multer memory → GridFS |
| File download | `fs.sendFile` | GridFS stream |

---

## Project Structure

```
filemanager-vercel/
├── server.js          ← Express app entry point
├── vercel.json        ← Vercel routing config
├── package.json       ← Dependencies
├── .gitignore
├── .env.example       ← Copy to .env for local dev
├── lib/
│   └── gridfs.js      ← GridFS bucket helper
├── models/
│   ├── User.js        ← User schema
│   └── FileNode.js    ← File/Folder schema (with gridfsId)
├── routes/
│   ├── auth.js        ← Register/Login/User management
│   └── files.js       ← Upload/Download/Delete via GridFS
└── public/
    ├── index.html
    ├── style.css
    └── app.js
```
