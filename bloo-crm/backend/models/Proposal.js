/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  Proprietary software. Unauthorized copying or use by any means or technology
  (including AI tools) is strictly prohibited.
*/
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const genId = () => `PRO-${uuidv4().split('-')[0].toUpperCase()}`;

const proposalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    proposalId: { type: String, unique: true, index: true, default: genId },
    type: { type: String, enum: ['RFI', 'RFQ', 'RFP'], default: 'RFI', index: true },
    industry: { type: String, default: 'Wealth Management' },
    title: { type: String, required: true, trim: true },
    content: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'final'], default: 'draft' },
    createdBy: { type: String, default: 'AI' },
    assignedEmployee: String   // Rocket AI+: employee mapped to this proposal's activities

  },
  { timestamps: true }
);
proposalSchema.index({ userId: 1, type: 1, createdAt: -1 });
module.exports = mongoose.model('Proposal', proposalSchema);
