# FileManager Web Application

A full-stack file manager web application built with Express, MongoDB, and GridFS storage. Fully responsive design for mobile, tablet, and desktop devices.

## 🎯 Features

✅ **User Authentication**
- User registration with admin approval workflow
- Secure login with password hashing (bcryptjs)
- Role-based access control (Admin/User)

✅ **File Management**
- Create folders and upload files
- MongoDB GridFS for serverless file storage (works on Vercel)
- File preview and download functionality
- Search and organize files by name

✅ **Admin Dashboard**
- User management and approval system
- Statistics dashboard (files, storage, users)
- User activity monitoring
- Bulk operations

✅ **Responsive Design**
- Mobile-first responsive layout (≤599px)
- Tablet optimized (600px - 767px)
- Desktop friendly (≥768px)
- Hamburger menu for mobile navigation

✅ **Database Optimization**
- Indexed MongoDB queries for performance
- Connection pooling and retry logic
- Automatic health checks
- Lean queries for better performance

## 🏗️ Tech Stack

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Backend:** Node.js, Express.js
- **Database:** MongoDB Atlas (Cloud)
- **Storage:** MongoDB GridFS
- **Deployment:** Vercel
- **Package Manager:** npm

## 🚀 Deployment to Vercel (Quick Start)

### Prerequisites
- GitHub account with the repository pushed
- MongoDB Atlas account (free tier available)
- Vercel account

### Step-by-Step Deployment

**Step 1: Ensure code is pushed to GitHub**
```bash
git push origin main
```

**Step 2: Deploy on Vercel**
1. Go to https://vercel.com
2. Click "New Project"
3. Select "Import Git Repository"
4. Choose your GitHub repository
5. Configure settings:
   - **Framework Preset:** Other
   - **Root Directory:** ./ (current)
   - **Build Command:** `echo 'Build complete'`
   - **Output Directory:** Leave blank (N/A)
   - **Install Command:** `npm install`

**Step 3: Add Environment Variables**
In Vercel Project Settings → Environment Variables, add:

| Key | Value |
|-----|-------|
| `MONGODB_URI` | `mongodb+srv://filemanager:Rupam123@file.ceado4y.mongodb.net/filemanagerDB?retryWrites=true&w=majority&appName=FILE` |
| `NODE_ENV` | `production` |

**Step 4: Deploy**
Click "Deploy" button and wait for completion ✅

**Your app is now live!** 🎉

---

## 📋 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/users` - Get all users (Admin only)
- `PUT /api/auth/users/:id/status` - Update user status (Admin only)
- `DELETE /api/auth/users/:id` - Delete user (Admin only)

### Files
- `GET /api/files` - Get all files
- `POST /api/files/folder` - Create folder
- `POST /api/files/upload` - Upload file
- `PUT /api/files/rename/:id` - Rename file/folder
- `DELETE /api/files/:id` - Delete file
- `GET /api/files/download/:id` - Download file

### Health
- `GET /api/health` - Check database status

---

## 🔐 Default Credentials

| Field | Value |
|-------|-------|
| Email | `Rupam@admin.com` |
| Password | `Rupam@123` |
| Role | Admin |

---

## 🖥️ Local Development

### Prerequisites
- Node.js 18+
- MongoDB Atlas free account

### Setup

1. **Clone and install**
```bash
git clone https://github.com/rupambairagya44-max/filemanager-vercel.git
cd filemanager-vercel
npm install
```

2. **Create .env file**
```env
MONGODB_URI=mongodb+srv://filemanager:Rupam123@file.ceado4y.mongodb.net/filemanagerDB?retryWrites=true&w=majority&appName=FILE
PORT=3000
NODE_ENV=development
```

3. **Run locally**
```bash
npm start
# or
npm run dev
```

4. **Open browser**
```
http://localhost:3000
```

---

## 📱 Responsive Breakpoints

| Device | Width | Layout |
|--------|-------|--------|
| Mobile | ≤ 599px | Single column, hamburger menu |
| Tablet | 600-767px | 2-column grid, optimized spacing |
| Desktop | ≥ 768px | Full sidebar, multi-column grid |

---

## ⚙️ Performance Optimizations

✅ MongoDB indexes on email, parentId, ownerId
✅ Lean queries for read operations
✅ Connection pooling (5-10 connections)
✅ Auto-retry with exponential backoff
✅ Request timeouts: 10 seconds
✅ Health check endpoint for monitoring

---

## 🔧 Troubleshooting

### Login timeout
- Verify MongoDB connection string in .env
- Check internet connectivity
- Restart the server

### Files not uploading
- Ensure valid file format
- Check MongoDB quota not exceeded
- Verify user is authenticated

### 503 Database Error
- This is temporary, auto-retry is enabled
- Wait a few seconds and try again
- Check MongoDB Atlas dashboard

### App won't start
- Run `npm install` to ensure dependencies
- Check Node.js version (18+)
- Verify .env file has MONGODB_URI

---

## 📚 Documentation

- Framework Preset: **Other**
- Root Directory: **./**
- Build Command: **echo 'Build complete'**
- Install Command: **npm install**
- Output Directory: **N/A**

---

## 🎨 Recent Updates

### Latest Commits
- ✅ Optimized MongoDB queries with indexing
- ✅ Added database health checks
- ✅ Improved error handling and timeouts
- ✅ Fixed data fetching with auto-retry
- ✅ Added responsive mobile design
- ✅ Enhanced button spacing for mobile
- ✅ SSL/HTTPS ready for Vercel

---

## 📄 License

MIT License - Open source project

## 👨‍💻 Author

Rupam - [GitHub](https://github.com/rupambairagya44-max)

---

**Happy File Managing!** 🎉

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
