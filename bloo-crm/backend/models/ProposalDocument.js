/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  Proprietary software. Unauthorized copying or use by any means or technology
  (including AI tools) is strictly prohibited.
*/
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const genId = () => `PDOC-${uuidv4().split('-')[0].toUpperCase()}`;

const proposalDocSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    docId: { type: String, unique: true, index: true, default: genId },
    type: { type: String, default: 'RFI' },       // RFI / RFQ / RFP / General
    title: String,
    originalName: String,
    storedName: String,
    mimetype: String,
    size: Number,
    url: String
  },
  { timestamps: true }
);
proposalDocSchema.index({ userId: 1, type: 1, createdAt: -1 });
module.exports = mongoose.model('ProposalDocument', proposalDocSchema);
