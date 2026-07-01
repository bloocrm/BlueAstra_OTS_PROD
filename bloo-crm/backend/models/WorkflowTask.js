const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const generateTaskId = () => `WF-${uuidv4().split('-')[0].toUpperCase()}`;

const workflowTaskSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    taskId: { type: String, unique: true, index: true, default: generateTaskId },

    title: { type: String, required: true, trim: true },
    description: String,
    dueDate: Date,

    // Assignment (tied to an Employee)
    assignedToName: String,       // the intended assignee (employee)
    assignedToRef: String,        // EMP- id
    currentAssignee: String,      // where it landed (employee, or backup if delegated)
    notifiedEmail: String,        // email the notification actually went to
    delegated: { type: Boolean, default: false },
    delegatedTo: String,
    delegationReason: String,
    emailSent: { type: Boolean, default: false },

    status: { type: String, enum: ['open', 'in-progress', 'done'], default: 'open', index: true }
  },
  { timestamps: true }
);

workflowTaskSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('WorkflowTask', workflowTaskSchema);
