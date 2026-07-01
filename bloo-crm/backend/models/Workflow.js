/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
const mongoose = require('mongoose');

const workflowSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // Workflow Information
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: String,
    type: {
      type: String,
      enum: ['automated', 'manual', 'email_sequence', 'ai_driven', 'event_triggered'],
      default: 'manual'
    },

    // Status
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'completed', 'archived'],
      default: 'draft',
      index: true
    },

    // Triggers & Conditions
    triggers: [
      {
        type: String,
        enum: ['client_created', 'lead_qualified', 'payment_received', 'anniversary', 'lifecycle_event', 'manual', 'time_based']
      }
    ],
    conditions: [
      {
        field: String,
        operator: String, // equals, contains, greater_than, less_than, in, between
        value: mongoose.Schema.Types.Mixed
      }
    ],

    // Steps / Actions
    steps: [
      {
        stepNumber: Number,
        action: {
          type: String,
          enum: ['send_email', 'send_sms', 'create_task', 'update_field', 'create_communication', 'ai_generate_email', 'call_webhook']
        },
        templateId: mongoose.Schema.Types.ObjectId,
        emailTemplate: String,
        emailSubject: String,
        emailBody: String,
        smsMessage: String,
        taskTitle: String,
        taskDescription: String,
        taskDueDate: Date,
        fieldToUpdate: String,
        fieldValue: mongoose.Schema.Types.Mixed,
        delay: Number, // milliseconds
        condition: {
          field: String,
          operator: String,
          value: mongoose.Schema.Types.Mixed
        },
        aiPrompt: String, // For AI-driven steps
        webhookUrl: String,
        active: { type: Boolean, default: true }
      }
    ],

    // AI Settings (for AI-driven workflows)
    aiSettings: {
      model: String, // e.g., 'gpt-4', 'claude'
      temperature: Number,
      maxTokens: Number,
      systemPrompt: String
    },

    // Target Audience
    targetEntity: {
      type: String,
      enum: ['clients', 'leads', 'both'],
      default: 'clients'
    },
    targetClients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client'
      }
    ],
    targetLeads: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead'
      }
    ],

    // Execution Tracking
    executionHistory: [
      {
        entityId: mongoose.Schema.Types.ObjectId,
        entityType: String, // 'Client' or 'Lead'
        startedAt: Date,
        completedAt: Date,
        status: String, // 'in_progress', 'completed', 'failed'
        stepsCompleted: Number,
        failureReason: String,
        results: mongoose.Schema.Types.Mixed
      }
    ],

    // Schedule
    schedule: {
      isScheduled: Boolean,
      frequency: String, // once, daily, weekly, monthly
      daysOfWeek: [Number],
      time: String, // HH:mm format
      timezone: String,
      startDate: Date,
      endDate: Date
    },

    // Performance Metrics
    metrics: {
      totalExecutions: { type: Number, default: 0 },
      successfulExecutions: { type: Number, default: 0 },
      failedExecutions: { type: Number, default: 0 },
      engagementRate: Number,
      conversionRate: Number,
      lastExecutedAt: Date
    },

    // Notes & Tags
    tags: [String],
    notes: String,
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
    collection: 'workflows'
  }
);

// Indexes
workflowSchema.index({ userId: 1, status: 1 });
workflowSchema.index({ type: 1 });
workflowSchema.index({ 'metrics.lastExecutedAt': -1 });
workflowSchema.index({ name: 'text', description: 'text' });

// Pre-save middleware
workflowSchema.pre('save', function (next) {
  if (this.name) this.name = this.name.trim();
  next();
});

// Instance methods
workflowSchema.methods.recordExecution = function (entityId, entityType, status, results = null) {
  this.executionHistory.push({
    entityId,
    entityType,
    startedAt: new Date(),
    completedAt: status === 'failed' ? null : new Date(),
    status,
    stepsCompleted: status === 'completed' ? this.steps.length : 0,
    results
  });

  // Update metrics
  this.metrics.totalExecutions += 1;
  if (status === 'completed') {
    this.metrics.successfulExecutions += 1;
    this.metrics.lastExecutedAt = new Date();
  } else if (status === 'failed') {
    this.metrics.failedExecutions += 1;
  }

  return this.save();
};

workflowSchema.methods.getSuccessRate = function () {
  if (this.metrics.totalExecutions === 0) return 0;
  return Math.round((this.metrics.successfulExecutions / this.metrics.totalExecutions) * 100);
};

// Static methods
workflowSchema.statics.findByUser = function (userId, filters = {}) {
  return this.find({ userId, deletedAt: null, ...filters });
};

workflowSchema.statics.findActive = function (userId) {
  return this.find({ userId, status: 'active', deletedAt: null });
};

workflowSchema.statics.findByType = function (userId, type) {
  return this.find({ userId, type, status: 'active', deletedAt: null });
};

module.exports = mongoose.model('Workflow', workflowSchema);
