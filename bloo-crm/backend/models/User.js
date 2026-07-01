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
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
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
    isActive: {
      type: Boolean,
      default: true
    },
    notes: String,
    metadata: mongoose.Schema.Types.Mixed,
    lastLogin: Date,
    loginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: Date
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
