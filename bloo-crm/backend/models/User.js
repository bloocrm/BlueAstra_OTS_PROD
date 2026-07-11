/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      // Linear-time pattern (no nested quantifiers → no catastrophic backtracking / ReDoS);
      // also accepts modern TLDs of any length (.info, .online, .tech, …).
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email']
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    company: {
      type: String,
      trim: true
    },
    plan: {
      type: String,
      enum: ['basic', 'swift-ai-plus', 'rocket-ai-plus'],
      default: 'basic'
    },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'trial'],
      default: 'active'
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly'
    },
    planStartDate: {
      type: Date,
      default: Date.now
    },
    planExpiryDate: {
      type: Date
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    emailVerificationToken: String,       // sha256 hash of the single-use link token
    emailVerificationExpires: Date,
    isActive: {
      type: Boolean,
      default: true
    },

    // ---- Sub-user access control ----
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'admin'
    },
    parentUserId: {                 // set for members: the admin who owns/manages them
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    permissions: {                  // sections a member may access (admins have all)
      type: [String],
      default: []
    },

    notes: String,
    metadata: mongoose.Schema.Types.Mixed,
    lastLogin: Date,
    loginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: Date,

    // ---- Password reset ----
    resetPasswordToken: { type: String, select: false },   // sha256 hash of the emailed token
    resetPasswordExpires: { type: Date, select: false },

    // ---- Profile photo (small resized data URL) ----
    avatar: { type: String },

    // ---- Billing: member must pay for the plan chosen by their admin ----
    paymentPending: { type: Boolean, default: false },

    // ---- Multi-Factor Authentication ----
    mfaEnabled: { type: Boolean, default: false },
    mfaMethod: { type: String, enum: ['totp', 'yubikey', 'rsa', null], default: null },
    mfaSecret: { type: String, select: false },          // active TOTP secret (base32)
    mfaPendingSecret: { type: String, select: false },   // during enrollment, before verification
    mfaBackupCodes: { type: [String], select: false, default: [] }  // sha256-hashed one-time codes
  },
  {
    timestamps: true
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcryptjs.genSalt(10);
    this.password = await bcryptjs.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcryptjs.compare(enteredPassword, this.password);
};

// Method to get public user data (without password)
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.loginAttempts;
  delete obj.lockUntil;
  return obj;
};

// Index for email lookups
userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);
