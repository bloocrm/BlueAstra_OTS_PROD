/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const generateVendorId = () => `VEN-${uuidv4().split('-')[0].toUpperCase()}`;

const quarterly = () => ({ q1: { type: Number, default: 0 }, q2: { type: Number, default: 0 }, q3: { type: Number, default: 0 }, q4: { type: Number, default: 0 } });

const vendorSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vendorId: { type: String, unique: true, index: true, default: generateVendorId },

    name: { type: String, required: true, trim: true, index: true },
    category: String,
    contactName: String,
    contactEmail: String,
    contactPhone: String,
    status: { type: String, enum: ['active', 'inactive', 'on-hold'], default: 'active', index: true },

    // Revenue this vendor generates from Blue Astra, per quarter
    revenue: quarterly(),
    // KPI: performance score per quarter (0-100)
    performance: quarterly(),
    // KRI: risk index per quarter (0-100, higher = riskier)
    risk: quarterly(),

    notes: String
  },
  { timestamps: true }
);

vendorSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Vendor', vendorSchema);
