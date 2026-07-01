const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const generatePerfId = () => `PERF-${uuidv4().split('-')[0].toUpperCase()}`;

const performanceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    perfId: { type: String, unique: true, index: true, default: generatePerfId },

    employeeName: { type: String, required: true, trim: true, index: true },
    employeeRef: String,
    type: {
      type: String,
      enum: ['goal', 'annual-review', 'quarterly-review', 'manager-feedback', 'peer-feedback', 'promotion', 'compensation'],
      default: 'goal',
      index: true
    },
    title: { type: String, trim: true },
    period: String,               // e.g. "Q3 2026" or "2026"
    reviewer: String,
    rating: Number,               // 1-5 (reviews/feedback)
    kpis: [{ name: String, target: String, actual: String }],
    notes: String,
    status: { type: String, enum: ['draft', 'submitted', 'completed'], default: 'submitted', index: true }
  },
  { timestamps: true }
);

performanceSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Performance', performanceSchema);
