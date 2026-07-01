/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const generateLeaveId = () => `LV-${uuidv4().split('-')[0].toUpperCase()}`;

const leaveSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    leaveId: { type: String, unique: true, index: true, default: generateLeaveId },

    employeeName: { type: String, required: true, trim: true, index: true },
    employeeRef: String,          // employeeId (EMP-...) if picked from records
    leaveType: { type: String, default: 'Annual' },
    startDate: Date,
    endDate: Date,
    days: Number,
    reason: String,

    // Approval routing
    manager: String,              // the intended approver
    currentApprover: String,      // where it actually sits (manager, or backup if delegated)
    delegatedTo: String,          // backup name, if routed to backup
    delegated: { type: Boolean, default: false },
    delegationReason: String,

    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    decisionNote: String,
    decidedBy: String,
    decidedAt: Date
  },
  { timestamps: true }
);

leaveSchema.index({ userId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('LeaveApplication', leaveSchema);
