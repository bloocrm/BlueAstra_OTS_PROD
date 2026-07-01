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
