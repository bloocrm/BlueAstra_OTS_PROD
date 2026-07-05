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
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const emailService = require('../utils/email-service');
const router = express.Router();

// Hash a reset token before storing/looking it up (never store the raw token)
const hashToken = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');

// Reset-email HTML
const resetEmailHTML = (name, url) => `
  <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;color:#16233a;">
    <div style="background:#2E86FF;color:#fff;padding:22px 24px;border-radius:12px 12px 0 0;">
      <h2 style="margin:0;">Bloo CRM — Password Reset</h2>
    </div>
    <div style="border:1px solid #e6ecf5;border-top:none;padding:26px 24px;border-radius:0 0 12px 12px;">
      <p>Hi ${name || 'there'},</p>
      <p>We received a request to reset the password for your Bloo CRM account. Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.</p>
      <p style="text-align:center;margin:26px 0;">
        <a href="${url}" style="background:#2E86FF;color:#fff;text-decoration:none;font-weight:700;padding:13px 26px;border-radius:10px;display:inline-block;">Reset my password</a>
      </p>
      <p style="font-size:13px;color:#6b7688;">If the button doesn't work, copy and paste this link into your browser:<br><a href="${url}" style="color:#2E86FF;word-break:break-all;">${url}</a></p>
      <p style="font-size:13px;color:#6b7688;">If you didn't request a password reset, you can safely ignore this email — your password will not change.</p>
    </div>
  </div>`;

// Confirmation email sent after the password is actually changed
const passwordChangedEmailHTML = (name) => `
  <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;color:#16233a;">
    <div style="background:#2E86FF;color:#fff;padding:22px 24px;border-radius:12px 12px 0 0;">
      <h2 style="margin:0;">Bloo CRM — Password Changed</h2>
    </div>
    <div style="border:1px solid #e6ecf5;border-top:none;padding:26px 24px;border-radius:0 0 12px 12px;">
      <p>Hi ${name || 'there'},</p>
      <p>This is a confirmation that the password for your Bloo CRM account was just changed.</p>
      <p>If you made this change, no further action is needed. If you did <strong>not</strong> change your password,
         please <a href="https://bloocrm.com/pages/forgot-password.html" style="color:#2E86FF;">reset it immediately</a>
         and contact <a href="mailto:support@bloocrm.com" style="color:#2E86FF;">support@bloocrm.com</a>.</p>
    </div>
  </div>`;

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

// ===================================================================
// PASSWORD RESET
// ===================================================================

// Step 1: request a reset link. Always returns a generic message so an
// attacker cannot use this endpoint to discover which emails are registered.
router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('A valid email is required')],
  async (req, res) => {
    const generic = { message: 'If an account with that email exists, a password reset link has been sent to it.' };
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ error: 'Please enter a valid email address.' });

      const email = String(req.body.email).toLowerCase().trim();
      const user = await User.findOne({ email });
      if (!user) return res.json(generic); // don't reveal non-existence

      // Generate a single-use, time-limited token: raw goes in the email, hash in the DB
      const rawToken = crypto.randomBytes(32).toString('hex');
      user.resetPasswordToken = hashToken(rawToken);
      user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save({ validateBeforeSave: false });

      const base = (process.env.APP_URL || 'https://bloocrm.com').replace(/\/+$/, '');
      const resetUrl = `${base}/pages/reset-password.html?token=${rawToken}&email=${encodeURIComponent(email)}`;
      console.log('🔑 Password reset requested for', email);

      try {
        await emailService.sendEmail({
          to: email,
          subject: 'Reset your Bloo CRM password',
          html: resetEmailHTML(user.name, resetUrl),
          text: `Reset your Bloo CRM password using this link (valid for 1 hour): ${resetUrl}\n\nIf you didn't request this, ignore this email.`
        });
      } catch (mailErr) {
        console.error('Reset email send failed:', mailErr.message);
      }

      const payload = { ...generic };
      // Only expose the link outside production (for local testing); never in prod.
      if (process.env.NODE_ENV !== 'production') payload.devResetUrl = resetUrl;
      return res.json(payload);
    } catch (error) {
      console.error('forgot-password error:', error);
      // Still return generic to avoid leaking anything
      return res.json(generic);
    }
  }
);

// Step 2 (optional): check whether a token is still valid before showing the form
router.get('/reset-password/validate', async (req, res) => {
  try {
    const token = String(req.query.token || '');
    const email = String(req.query.email || '').toLowerCase().trim();
    if (!token || !email) return res.json({ valid: false });
    const user = await User.findOne({
      email,
      resetPasswordToken: hashToken(token),
      resetPasswordExpires: { $gt: new Date() }
    });
    return res.json({ valid: !!user });
  } catch (error) {
    return res.json({ valid: false });
  }
});

// Step 3: set the new password
router.post(
  '/reset-password',
  [body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

      const token = String(req.body.token || '');
      const email = String(req.body.email || '').toLowerCase().trim();
      const password = String(req.body.password || '');
      if (!token || !email) return res.status(400).json({ error: 'Invalid reset request.' });

      const user = await User.findOne({
        email,
        resetPasswordToken: hashToken(token),
        resetPasswordExpires: { $gt: new Date() }
      }).select('+password');

      if (!user) {
        return res.status(400).json({ error: 'This password reset link is invalid or has expired. Please request a new one.' });
      }

      user.password = password;                 // hashed by the model's pre-save hook
      user.resetPasswordToken = undefined;      // single-use: invalidate immediately
      user.resetPasswordExpires = undefined;
      user.loginAttempts = 0;                   // also unlock the account
      user.lockUntil = undefined;
      await user.save({ validateBeforeSave: false });

      // Send a confirmation email that the password was changed (best-effort)
      try {
        await emailService.sendEmail({
          to: user.email,
          subject: 'Your Bloo CRM password was changed',
          html: passwordChangedEmailHTML(user.name),
          text: `Your Bloo CRM password was just changed. If this wasn't you, reset it at https://bloocrm.com/pages/forgot-password.html and contact support@bloocrm.com.`
        });
      } catch (mailErr) {
        console.error('Password-changed email failed:', mailErr.message);
      }

      return res.json({ message: 'Your password has been reset successfully. You can now log in with your new password.' });
    } catch (error) {
      console.error('reset-password error:', error);
      return res.status(500).json({ error: 'Could not reset your password. Please try again.' });
    }
  }
);

module.exports = router;
