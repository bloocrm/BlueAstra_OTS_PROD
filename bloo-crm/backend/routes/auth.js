/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   AUTHENTICATION ROUTES
   ===================================================== */

const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const router = express.Router();

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, name: user.name },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Register route
router.post(
  '/register',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('company').optional()
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, email, password, phone, company } = req.body;

      // Check if user already exists
      let user = await User.findOne({ email });
      if (user) {
        return res.status(409).json({
          error: 'User already exists',
          message: 'An account with this email already exists'
        });
      }

      // Create new user
      user = new User({
        name,
        email,
        password,
        phone,
        company,
        plan: 'basic',
        subscriptionStatus: 'active'
      });

      await user.save();

      // Generate token
      const token = generateToken(user);

      res.status(201).json({
        message: 'User registered successfully',
        data: {
          user: user.toJSON(),
          token
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        error: 'Registration failed',
        message: error.message
      });
    }
  }
);

// Login route
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        });
      }

      // Check if account is active
      if (!user.isActive) {
        return res.status(403).json({
          error: 'Account inactive',
          message: 'Your account has been suspended'
        });
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        // Increment login attempts
        user.loginAttempts += 1;
        if (user.loginAttempts >= 5) {
          user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
        }
        await user.save();

        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        });
      }

      // Reset login attempts on successful login
      user.loginAttempts = 0;
      user.lockUntil = undefined;
      user.lastLogin = new Date();
      await user.save();

      // Generate token
      const token = generateToken(user);

      res.json({
        message: 'Login successful',
        data: {
          user: user.toJSON(),
          token
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        error: 'Login failed',
        message: error.message
      });
    }
  }
);

// Logout route
router.post('/logout', (req, res) => {
  res.json({
    message: 'Logout successful'
  });
});

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User profile retrieved',
      data: user.toJSON()
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// Refresh token
router.post('/refresh-token', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', {
      ignoreExpiration: true
    });

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newToken = generateToken(user);

    res.json({
      message: 'Token refreshed successfully',
      data: { token: newToken }
    });
  } catch (error) {
    res.status(401).json({ error: 'Token refresh failed' });
  }
});

module.exports = router;
