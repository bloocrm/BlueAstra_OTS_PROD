/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const generateOnbId = () => `ONB-${uuidv4().split('-')[0].toUpperCase()}`;

const DEFAULT_TASKS = [
  'Orientation scheduling',
  'Training assignments',
  'Welcome email',
  'New hire paperwork',
  'Equipment allocation',
  'Email creation'
];

const onboardingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    onboardingId: { type: String, unique: true, index: true, default: generateOnbId },
    employeeName: { type: String, required: true, trim: true, index: true },
    employeeRef: String,
    employeeEmail: String,
    startDate: Date,
    checklist: [{ task: String, done: { type: Boolean, default: false }, doneAt: Date }],
    welcomeEmailSent: { type: Boolean, default: false },
    status: { type: String, enum: ['in-progress', 'completed'], default: 'in-progress', index: true }
  },
  { timestamps: true }
);

onboardingSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Onboarding', onboardingSchema);
module.exports.DEFAULT_TASKS = DEFAULT_TASKS;
