/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
const mongoose = require('mongoose');

const communicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // Communication Type
    type: {
      type: String,
      enum: ['email', 'phone', 'meeting', 'message', 'sms'],
      required: true,
      index: true
    },

    // Subject & Content
    subject: {
      type: String,
      required: true,
      trim: true
    },
    content: {
      type: String,
      required: true
    },

    // Related Entities
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      index: true
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      index: true
    },

    // Communication Details
    fromEmail: String,
    toEmail: String,
    ccEmail: [String],
    bccEmail: [String],
    fromPhone: String,
    toPhone: String,
    meetingDate: Date,
    meetingDuration: Number,
    meetingLocation: String,

    // Status & Tracking
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'sent', 'failed', 'completed'],
      default: 'draft',
      index: true
    },
    sentAt: Date,
    readAt: Date,
    respondedAt: Date,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },

    // Outcome
    outcome: String,
    followUpRequired: Boolean,
    followUpDate: Date,

    // Attachments
    attachments: [
      {
        name: String,
        type: String,
        url: String,
        size: Number
      }
    ],

    // Audit Fields
    createdBy: {
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
    collection: 'communications'
  }
);

// Indexes
communicationSchema.index({ userId: 1, type: 1 });
communicationSchema.index({ userId: 1, status: 1 });
communicationSchema.index({ clientId: 1 });
communicationSchema.index({ leadId: 1 });
communicationSchema.index({ sentAt: -1 });
communicationSchema.index({ subject: 'text', content: 'text' });

// Pre-save middleware
communicationSchema.pre('save', function (next) {
  if (this.subject) this.subject = this.subject.trim();
  if (this.toEmail) this.toEmail = this.toEmail.toLowerCase().trim();
  if (this.fromEmail) this.fromEmail = this.fromEmail.toLowerCase().trim();
  next();
});

// Static methods
communicationSchema.statics.findByUser = function (userId, filters = {}) {
  return this.find({ userId, deletedAt: null, ...filters }).sort({ createdAt: -1 });
};

communicationSchema.statics.findByClient = function (userId, clientId) {
  return this.find({ userId, clientId, deletedAt: null }).sort({ createdAt: -1 });
};

communicationSchema.statics.findByLead = function (userId, leadId) {
  return this.find({ userId, leadId, deletedAt: null }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('Communication', communicationSchema);
