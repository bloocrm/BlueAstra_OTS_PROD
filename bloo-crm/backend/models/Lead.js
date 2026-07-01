/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // Basic Information
    name: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    company: String,
    jobTitle: String,

    // Lead Status & Classification
    status: {
      type: String,
      enum: ['new', 'qualified', 'interested', 'negotiating', 'converted', 'lost'],
      default: 'new',
      index: true
    },
    source: {
      type: String,
      enum: ['website', 'referral', 'email', 'phone', 'event', 'social', 'other'],
      trim: true
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },

    // Financial Information
    investmentAmount: Number,
    budget: Number,
    estimatedValue: Number,
    currency: { type: String, default: 'USD' },

    // Lead Details
    description: String,
    industry: String,
    businessType: String,
    companySize: String,
    location: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },

    // Follow-up Information
    lastContactedAt: Date,
    nextFollowUpAt: Date,
    followUpNotes: String,
    conversationHistory: [
      {
        date: Date,
        type: String,
        message: String,
        outcome: String
      }
    ],

    // Relationship to Client (if applicable)
    relatedClientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client'
    },

    // Conversion Information
    convertedAt: Date,
    convertedToClientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client'
    },

    // Audit Fields
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    deletedAt: Date,

    // Tags & Notes
    tags: [String],
    notes: String,
    customFields: mongoose.Schema.Types.Mixed
  },
  {
    timestamps: true,
    collection: 'leads'
  }
);

// Indexes
leadSchema.index({ userId: 1, status: 1 });
leadSchema.index({ email: 1, userId: 1 }, { unique: true, sparse: true });
leadSchema.index({ score: -1 });
leadSchema.index({ name: 'text', email: 'text', tags: 'text' });

// Pre-save middleware
leadSchema.pre('save', function (next) {
  if (this.name) this.name = this.name.trim();
  if (this.email) this.email = this.email.toLowerCase().trim();
  if (this.phone) this.phone = this.phone.trim();
  next();
});

// Static methods
leadSchema.statics.findByUser = function (userId, filters = {}) {
  return this.find({ userId, deletedAt: null, ...filters });
};

leadSchema.statics.findActiveByUser = function (userId) {
  return this.find({ userId, status: { $ne: 'lost' }, deletedAt: null });
};

leadSchema.statics.findByStatus = function (userId, status) {
  return this.find({ userId, status, deletedAt: null });
};

module.exports = mongoose.model('Lead', leadSchema);
