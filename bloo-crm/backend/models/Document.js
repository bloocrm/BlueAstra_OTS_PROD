const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // Document Information
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: String,
    category: {
      type: String,
      enum: ['client_document', 'lead_document', 'insurance', 'investment', 'tax', 'legal', 'other'],
      default: 'other'
    },

    // File Details
    originalFileName: {
      type: String,
      required: true
    },
    mimeType: {
      type: String,
      required: true,
      enum: ['application/pdf', 'image/jpeg', 'image/png', 'application/msword',
             'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
             'text/plain', 'application/vnd.ms-excel',
             'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
    },
    fileSize: Number, // bytes
    storagePath: {
      type: String,
      required: true
    },
    fileHash: String, // SHA-256 for integrity verification

    // Related Entities
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      index: true
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      index: true
    },

    // Security & Compliance
    isEncrypted: {
      type: Boolean,
      default: true
    },
    encryptionVersion: String,
    accessLog: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        accessedAt: Date,
        action: String // 'view', 'download'
      }
    ],
    expiresAt: Date, // Document expiration date

    // Status
    status: {
      type: String,
      enum: ['active', 'archived', 'deleted_pending'],
      default: 'active',
      index: true
    },

    // Metadata
    tags: [String],
    customFields: mongoose.Schema.Types.Mixed,

    // Audit Fields
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    deletedAt: Date,
    deletedBy: mongoose.Schema.Types.ObjectId
  },
  {
    timestamps: true,
    collection: 'documents'
  }
);

// Indexes
documentSchema.index({ userId: 1, status: 1 });
documentSchema.index({ clientId: 1 });
documentSchema.index({ leadId: 1 });
documentSchema.index({ category: 1 });
documentSchema.index({ createdAt: -1 });
documentSchema.index({ name: 'text', description: 'text', tags: 'text' });

// Pre-save middleware
documentSchema.pre('save', function (next) {
  if (this.name) this.name = this.name.trim();
  next();
});

// Instance methods
documentSchema.methods.logAccess = function (userId, action = 'view') {
  this.accessLog.push({
    userId,
    accessedAt: new Date(),
    action
  });
  return this.save();
};

documentSchema.methods.isExpired = function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

// Static methods
documentSchema.statics.findByUser = function (userId, filters = {}) {
  return this.find({ userId, status: 'active', deletedAt: null, ...filters });
};

documentSchema.statics.findByClient = function (clientId) {
  return this.find({ clientId, status: 'active', deletedAt: null });
};

documentSchema.statics.findByLead = function (leadId) {
  return this.find({ leadId, status: 'active', deletedAt: null });
};

documentSchema.statics.findExpired = function () {
  return this.find({
    expiresAt: { $lt: new Date() },
    status: 'active'
  });
};

module.exports = mongoose.model('Document', documentSchema);
