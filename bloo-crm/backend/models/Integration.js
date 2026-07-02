/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  Proprietary software. Unauthorized copying or use by any means or technology
  (including AI tools) is strictly prohibited.
*/
const mongoose = require('mongoose');

const integrationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tool: { type: String, required: true },           // trello, asana, monday, clickup, jira, jama, notion, ms-planner
    status: { type: String, enum: ['connected', 'disconnected'], default: 'connected' },
    workspace: String,
    apiKeyLast4: String,
    connectedAt: Date
  },
  { timestamps: true }
);
integrationSchema.index({ userId: 1, tool: 1 }, { unique: true });
module.exports = mongoose.model('Integration', integrationSchema);
