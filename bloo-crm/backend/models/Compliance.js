/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
const mongoose = require('mongoose');

const complianceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // Compliance Framework
    framework: {
      type: String,
      enum: [
        'SOC2', 'ISO27001', 'GDPR', 'CCPA', 'HIPAA', 'PCI-DSS',
        'SEC', 'FINRA', 'FATCA', 'CRS', 'SOX', 'MiFID',
        'ASIC', 'RBI', 'AFM', 'FCA', 'BaFin', 'CNB'
      ],
      required: true,
      index: true
    },

    // Compliance Requirement
    requirement: {
      type: String,
      required: true,
      trim: true
    },
    description: String,

    // Scope
    applicableRegions: [
      {
        type: String,
        enum: ['Americas', 'EMEA', 'APAC', 'AUS/NZ', 'Global']
      }
    ],
    applicableCountries: [String],

    // Status Tracking
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'non_compliant', 'exempt'],
      default: 'not_started',
      index: true
    },
    complianceLevel: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },

    // Dates
    startDate: Date,
    targetCompletionDate: Date,
    actualCompletionDate: Date,
    lastVerifiedDate: Date,
    nextReviewDate: Date,

    // Documentation
    documentationUrl: String,
    attachments: [
      {
        name: String,
        type: String,
        url: String,
        uploadedAt: Date
      }
    ],

    // Verification & Audit
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verificationNotes: String,
    auditTrail: [
      {
        action: String,
        changedBy: mongoose.Schema.Types.ObjectId,
        changedAt: Date,
        details: String
      }
    ],

    // Risk Assessment
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    riskMitigation: String,
    remediationRequired: Boolean,
    remediationDeadline: Date,

    // Related Information
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      index: true
    },
    relatedCompliances: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Compliance'
      }
    ],

    // Notes & Metadata
    notes: String,
    tags: [String],
    customFields: mongoose.Schema.Types.Mixed,

    // Audit Fields
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    deletedAt: Date
  },
  {
    timestamps: true,
    collection: 'compliances'
  }
);

// Indexes
complianceSchema.index({ userId: 1, framework: 1 });
complianceSchema.index({ userId: 1, status: 1 });
complianceSchema.index({ riskLevel: 1 });
complianceSchema.index({ nextReviewDate: 1 });
complianceSchema.index({ clientId: 1 });
complianceSchema.index({ framework: 'text', requirement: 'text' });

// Pre-save middleware
complianceSchema.pre('save', function (next) {
  if (this.requirement) this.requirement = this.requirement.trim();
  next();
});

// Instance methods
complianceSchema.methods.updateStatus = function (newStatus, notes) {
  this.status = newStatus;
  if (newStatus === 'completed') {
    this.actualCompletionDate = new Date();
    this.complianceLevel = 100;
  }
  this.auditTrail.push({
    action: 'status_updated',
    changedAt: new Date(),
    details: notes
  });
  return this.save();
};

complianceSchema.methods.isOverdue = function () {
  if (!this.targetCompletionDate) return false;
  return new Date() > this.targetCompletionDate && this.status !== 'completed';
};

complianceSchema.methods.needsReview = function () {
  if (!this.nextReviewDate) return false;
  return new Date() >= this.nextReviewDate;
};

// Static methods
complianceSchema.statics.findByUser = function (userId, filters = {}) {
  return this.find({ userId, deletedAt: null, ...filters });
};

complianceSchema.statics.findByFramework = function (userId, framework) {
  return this.find({ userId, framework, deletedAt: null });
};

complianceSchema.statics.findByRegion = function (userId, region) {
  return this.find({ userId, applicableRegions: region, deletedAt: null });
};

complianceSchema.statics.findAtRisk = function (userId) {
  return this.find({
    userId,
    riskLevel: { $in: ['high', 'critical'] },
    deletedAt: null
  });
};

complianceSchema.statics.findIncomplete = function (userId) {
  return this.find({
    userId,
    status: { $ne: 'completed' },
    deletedAt: null
  }).sort({ nextReviewDate: 1 });
};

complianceSchema.statics.getComplianceSummary = function (userId) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), deletedAt: null } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

module.exports = mongoose.model('Compliance', complianceSchema);
