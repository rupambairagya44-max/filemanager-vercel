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

// Mongoose connection options - OPTIMIZED for timeout issues
const mongoOptions = {
  serverSelectionTimeoutMS: 10000,      // 10 seconds to select a server
  socketTimeoutMS: 60000,                // 60 seconds for socket operations
  connectTimeoutMS: 10000,               // 10 seconds to establish connection
  retryWrites: true,
  maxPoolSize: 10,                       // Connection pool size
  minPoolSize: 5,                        // Minimum connections
  maxIdleTimeMS: 30000,                  // Close idle connections
  waitQueueTimeoutMS: 10000,             // Wait for connection from pool
  serverMonitoringMode: 'auto',
  heartbeatFrequencyMS: 10000            // Health checks
};

// Connect to MongoDB with improved error handling and retry logic
let connectionAttempts = 0;
const maxConnectionAttempts = 5;

const connectDB = async () => {
  try {
    connectionAttempts++;
    console.log(`MongoDB Connection Attempt #${connectionAttempts}...`);
    
    await mongoose.connect(MONGODB_URI, mongoOptions);
    console.log('✓ Connected to MongoDB Atlas Successfully');
    connectionAttempts = 0; // Reset on success
    
    // Seed Default Admin User
    const User = require('./models/User');
    const adminEmail = 'Rupam@admin.com';
    
    try {
      const adminExists = await User.findOne({ email: adminEmail }).timeout(5000);
      
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
    }
    
  } catch (err) {
    console.error(`✗ MongoDB Connection Error (Attempt ${connectionAttempts}):`, err.message);
    
    if (connectionAttempts < maxConnectionAttempts) {
      const delay = Math.min(1000 * connectionAttempts, 5000); // Exponential backoff
      console.log(`Retrying in ${delay}ms...`);
      setTimeout(connectDB, delay);
    } else {
      console.error('✗ Max connection attempts reached. Exiting.');
      process.exit(1);
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

// Start Server - only after DB connection is ready
let server;
const checkDBAndStartServer = () => {
  if (mongoose.connection.readyState === 1) {
    // readyState 1 = connected
    server = app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Database: Connected and Ready`);
    });
  } else {
    // Retry in 1 second
    setTimeout(checkDBAndStartServer, 1000);
  }
};

checkDBAndStartServer();

// Handle server errors
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
