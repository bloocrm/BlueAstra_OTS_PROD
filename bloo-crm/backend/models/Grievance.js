/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const generateGrievanceId = () => `GRV-${uuidv4().split('-')[0].toUpperCase()}`;

const grievanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    grievanceId: {
      type: String,
      unique: true,
      index: true,
      default: generateGrievanceId
    },
    name: { type: String, required: true, trim: true },
    problemType: { type: String, trim: true },   // type of problem
    section: { type: String, trim: true },        // which section it relates to
    description: { type: String, trim: true },
    status: {
      type: String,
      enum: ['open', 'in-progress', 'resolved'],
      default: 'open',
      index: true
    }
  },
  { timestamps: true }
);

grievanceSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Grievance', grievanceSchema);
