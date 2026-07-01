/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    // Request Identification
    requestId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    // User Information
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    userEmail: String,
    userName: String,

    // Request Details
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      required: true,
      index: true
    },
    path: {
      type: String,
      required: true,
      index: true
    },
    query: mongoose.Schema.Types.Mixed,
    body: mongoose.Schema.Types.Mixed, // Sanitized, no passwords/tokens

    // Response Details
    statusCode: {
      type: Number,
      required: true,
      index: true
    },
    responseTime: Number, // milliseconds
    success: Boolean,

    // Error Information (if applicable)
    errorCode: String,
    errorMessage: String,

    // Network Information
    ipAddress: {
      type: String,
      required: true,
      index: true
    },
    userAgent: String,
    referer: String,

    // Entity Affected
    entityType: String, // e.g., 'Client', 'Lead', 'Communication'
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true
    },
    action: {
      type: String,
      enum: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT'],
      index: true
    },

    // Change Tracking (for updates)
    changesBefore: mongoose.Schema.Types.Mixed,
    changesAfter: mongoose.Schema.Types.Mixed,
    fieldsChanged: [String],

    // Security Events
    securityEvent: Boolean,
    securityLevel: {
      type: String,
      enum: ['info', 'warning', 'critical']
    },
    securityDetails: mongoose.Schema.Types.Mixed,

    // Metadata
    dataClassification: {
      type: String,
      enum: ['public', 'internal', 'confidential', 'restricted'],
      default: 'confidential'
    },
    complianceRelevant: Boolean,

    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
      // Auto-delete after 90 days (for GDPR compliance)
      expires: 7776000 // 90 days in seconds
    }
  },
  {
    collection: 'auditlogs',
    timestamps: false
  }
);

// Compound indexes for common queries
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ ipAddress: 1, timestamp: -1 });
auditLogSchema.index({ statusCode: 1, timestamp: -1 });
auditLogSchema.index({ securityEvent: 1, timestamp: -1 });

// Static methods for querying
auditLogSchema.statics.findByUser = function (userId, limit = 100) {
  return this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit);
};

auditLogSchema.statics.findByEntity = function (entityType, entityId) {
  return this.find({ entityType, entityId })
    .sort({ timestamp: -1 });
};

auditLogSchema.statics.findSecurityEvents = function (limit = 100) {
  return this.find({ securityEvent: true })
    .sort({ timestamp: -1 })
    .limit(limit);
};

auditLogSchema.statics.findByIP = function (ipAddress, limit = 50) {
  return this.find({ ipAddress })
    .sort({ timestamp: -1 })
    .limit(limit);
};

auditLogSchema.statics.findFailedRequests = function (userId, limit = 50) {
  return this.find({ userId, success: false })
    .sort({ timestamp: -1 })
    .limit(limit);
};

auditLogSchema.statics.findDataAccess = function (entityType, entityId) {
  return this.find({
    entityType,
    entityId,
    action: 'READ'
  }).sort({ timestamp: -1 });
};

auditLogSchema.statics.getActivityReport = function (startDate, endDate, userId = null) {
  const match = {
    timestamp: { $gte: startDate, $lte: endDate }
  };
  if (userId) match.userId = userId;

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        users: { $addToSet: '$userId' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
