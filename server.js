const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://filemanager:Rupam123@file.ceado4y.mongodb.net/filemanagerDB?retryWrites=true&w=majority&appName=FILE';

// Connect to MongoDB with improved error handling
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
}).then(async () => {
  console.log('Connected to MongoDB Atlas');

  // Seed Default Admin User
  const User = require('./models/User');
  const adminEmail = 'Rupam@admin.com';
  const adminExists = await User.findOne({ email: adminEmail });

  if (!adminExists) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Rupam@123', salt);
    const newAdmin = new User({
      name: 'Rupam',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      status: 'approved'
    });
    await newAdmin.save();
    console.log('Default Admin seeded → Email: Rupam@admin.com | Password: Rupam@123');
  }
}).catch(err => {
  console.error('MongoDB Connection Error:', err.message);
  process.exit(1);
});

// Routes
const authRoutes = require('./routes/auth');
const fileRoutes = require('./routes/files');

app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);

// Catch-all: serve index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
