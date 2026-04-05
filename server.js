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

// Mongoose connection options - OPTIMIZED for Vercel serverless
const mongoOptions = {
  serverSelectionTimeoutMS: 5000,      // Shorter timeout for serverless
  socketTimeoutMS: 45000,              // Socket timeout
  connectTimeoutMS: 5000,              // Connection timeout
  retryWrites: true,
  w: 'majority',
  maxPoolSize: 1,                      // Minimal connections for serverless
  minPoolSize: 0,                      // No minimum for serverless
  maxIdleTimeMS: 10000,                // Close idle connections quickly
  waitQueueTimeoutMS: 5000,            // Wait for connection from pool
  serverMonitoringMode: 'poll',        // Better for serverless
  heartbeatFrequencyMS: 30000          // Slower health checks for serverless
};

// Connect to MongoDB with improved error handling and retry logic
let connectionAttempts = 0;
const maxConnectionAttempts = 3;

const connectDB = async () => {
  try {
    connectionAttempts++;
    console.log(`MongoDB Connection Attempt #${connectionAttempts}/${maxConnectionAttempts}...`);
    
    await mongoose.connect(MONGODB_URI, mongoOptions);
    console.log('✓ Connected to MongoDB Atlas Successfully');
    connectionAttempts = 0; // Reset on success
    
    // Seed Default Admin User (only on first connection)
    const User = require('./models/User');
    const adminEmail = 'Rupam@admin.com';
    
    try {
      const adminExists = await User.findOne({ email: adminEmail }).timeout(3000);
      
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
        console.log('✓ Default Admin seeded → Email: Rupam@admin.com | Password: Rupam@123');
      }
    } catch (seedErr) {
      console.warn('⚠ Warning seeding admin:', seedErr.message);
      // Continue even if seeding fails
    }
    
  } catch (err) {
    console.error(`✗ MongoDB Connection Error (Attempt ${connectionAttempts}/${maxConnectionAttempts}):`, err.message);
    
    if (connectionAttempts < maxConnectionAttempts) {
      const delay = 2000 * connectionAttempts; // 2s, 4s, 6s
      console.log(`Retrying in ${delay}ms...`);
      setTimeout(connectDB, delay);
    } else {
      console.error('✗ Max connection attempts reached.');
      console.log('⚠️  App will attempt to connect lazily on first request.');
      // Don't exit on Vercel - allow lazy connection
    }
  }
};

// Connect on startup
connectDB();

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('✓ Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('✗ MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠ Mongoose disconnected from MongoDB');
});

process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

// Routes
const authRoutes = require('./routes/auth');
const fileRoutes = require('./routes/files');

app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  const status = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    readyState: mongoose.connection.readyState,
    uptime: process.uptime()
  };
  
  if (status.database === 'connected') {
    res.status(200).json(status);
  } else {
    res.status(503).json(status);
  }
});

// Catch-all: serve index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server - immediately for Vercel serverless
let server;
const startServer = () => {
  if (!server) {
    server = app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`Database state: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...'}`);
    });
  }
};

// Start server immediately (don't wait for DB on Vercel)
startServer();

// Also attempt to connect to DB
connectDB();

// Handle server errors
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
