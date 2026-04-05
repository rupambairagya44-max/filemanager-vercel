const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');

// Helper: Check DB connection
const checkDB = () => {
  if (mongoose.connection.readyState !== 1) {
    throw new Error('Database is not connected');
  }
};

// Register User
router.post('/register', async (req, res) => {
  try {
    checkDB();
    const { name, email, password } = req.body;
    
    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    let user = await User.findOne({ email })
      .timeout(10000)
      .exec();
      
    if (user) return res.status(400).json({ error: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      name,
      email,
      password: hashedPassword,
      role: 'user',
      status: 'pending'
    });

    await user.save();
    res.json({ message: 'Registration successful. Waiting for admin approval.' });
  } catch (err) {
    console.error('Registration Error:', err.message);
    
    if (err.message.includes('not connected')) {
      return res.status(503).json({ error: 'Database is not connected. Please try again.' });
    }
    
    if (err.name === 'MongooseError' || err.message.includes('timeout')) {
      return res.status(503).json({ error: 'Database connection timeout. Please try again.' });
    }
    
    res.status(500).json({ error: 'Registration failed. Please try again later.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    checkDB();
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email })
      .timeout(10000)
      .exec();
      
    if (!user) return res.status(400).json({ error: 'Invalid Credentials' });

    if (user.status === 'pending')  return res.status(403).json({ error: 'Account is pending admin approval' });
    if (user.status === 'rejected') return res.status(403).json({ error: 'Account has been rejected' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid Credentials' });

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (err) {
    console.error('Login Error:', err.message);
    
    if (err.message.includes('not connected')) {
      return res.status(503).json({ error: 'Database is not connected. Please try again.' });
    }
    
    if (err.name === 'MongooseError' || err.message.includes('timeout')) {
      return res.status(503).json({ error: 'Database connection timeout. Please try again.' });
    }
    
    res.status(500).json({ error: 'Login failed. Please try again later.' });
  }
});

// Get all users (Admin only)
router.get('/users', async (req, res) => {
  try {
    checkDB();
    
    const users = await User.find()
      .select('-password')
      .lean()
      .timeout(10000)
      .exec();
      
    res.json(users);
  } catch (err) {
    console.error('Users fetch error:', err.message);
    
    if (err.message.includes('not connected')) {
      return res.status(503).json({ error: 'Database is not connected. Please try again.' });
    }
    
    if (err.message.includes('timeout')) {
      return res.status(503).json({ error: 'Database timeout. Please try again.' });
    }
    
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user status (Admin only)
router.put('/users/:id/status', async (req, res) => {
  try {
    checkDB();
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).timeout(10000);
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({ message: 'User status updated', user });
  } catch (err) {
    console.error('Status update error:', err.message);
    
    if (err.message.includes('not connected')) {
      return res.status(503).json({ error: 'Database is not connected. Please try again.' });
    }
    
    if (err.message.includes('timeout')) {
      return res.status(503).json({ error: 'Database timeout. Please try again.' });
    }
    
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Delete user (Admin only)
router.delete('/users/:id', async (req, res) => {
  try {
    checkDB();
    
    const user = await User.findByIdAndDelete(req.params.id).timeout(10000);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err.message);
    
    if (err.message.includes('not connected')) {
      return res.status(503).json({ error: 'Database is not connected. Please try again.' });
    }
    
    if (err.message.includes('timeout')) {
      return res.status(503).json({ error: 'Database timeout. Please try again.' });
    }
    
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
