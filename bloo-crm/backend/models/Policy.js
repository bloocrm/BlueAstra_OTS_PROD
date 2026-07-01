const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const generatePolicyId = () => `POL-${uuidv4().split('-')[0].toUpperCase()}`;

const policySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    policyId: { type: String, unique: true, index: true, default: generatePolicyId },
    title: { type: String, required: true, trim: true, index: true },
    category: { type: String, trim: true },
    content: { type: String, default: '' },
    version: { type: Number, default: 1 },
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
    lastPublishedAt: Date,
    lastPublishedTo: Number   // recipient count on last publish
  },
  { timestamps: true }
);

policySchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('Policy', policySchema);
