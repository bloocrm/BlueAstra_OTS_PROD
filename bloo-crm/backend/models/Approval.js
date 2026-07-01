/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const generateApprovalId = () => `APR-${uuidv4().split('-')[0].toUpperCase()}`;

const approvalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    approvalId: { type: String, unique: true, index: true, default: generateApprovalId },

    type: {
      type: String,
      enum: ['expense', 'purchase', 'travel', 'hiring', 'promotion', 'policy-exception'],
      default: 'expense',
      index: true
    },
    title: { type: String, required: true, trim: true },
    requestedBy: String,
    amount: Number,
    currency: { type: String, default: 'USD' },
    details: String,

    // Approval routing (same delegation model as leave)
    manager: String,
    currentApprover: String,
    delegated: { type: Boolean, default: false },
    delegatedTo: String,
    delegationReason: String,

    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    decisionNote: String,
    decidedBy: String,
    decidedAt: Date
  },
  { timestamps: true }
);

approvalSchema.index({ userId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Approval', approvalSchema);
