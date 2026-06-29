const mongoose = require('mongoose');

const emailSchema = new mongoose.Schema(
  {
    messageId: {
      type: String,
      required: true,
      unique: true,
      sparse: true
    },
    externalId: {
      type: String,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmailAccount',
      required: true,
      index: true
    },
    from: {
      email: String,
      name: String
    },
    to: [{
      email: String,
      name: String
    }],
    cc: [{
      email: String,
      name: String
    }],
    bcc: [{
      email: String,
      name: String
    }],
    subject: {
      type: String,
      trim: true,
      index: true
    },
    body: {
      type: String,
      trim: true
    },
    bodyHtml: {
      type: String
    },
    bodyPlain: {
      type: String
    },
    attachments: [{
      filename: String,
      mimetype: String,
      size: Number,
      attachmentId: String,
      storageUrl: String,
      downloadUrl: String
    }],
    labels: [{
      type: String,
      index: true
    }],
    folder: {
      type: String,
      enum: ['inbox', 'sent', 'drafts', 'trash', 'spam', 'archive', 'custom'],
      default: 'inbox',
      index: true
    },
    customFolder: String,
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    isStarred: {
      type: Boolean,
      default: false,
      index: true
    },
    isSpam: {
      type: Boolean,
      default: false
    },
    isDraft: {
      type: Boolean,
      default: false
    },
    receivedDate: {
      type: Date,
      index: true
    },
    sentDate: {
      type: Date
    },
    threadId: {
      type: String,
      index: true
    },
    inReplyTo: String,
    references: [String],
    hasAttachments: {
      type: Boolean,
      default: false
    },
    size: Number,
    headers: mongoose.Schema.Types.Mixed,
    provider: {
      type: String,
      enum: ['gmail', 'outlook', 'yahoo', 'zoho', 'imap'],
      required: true
    },
    syncedAt: {
      type: Date,
      default: Date.now
    },
    deletedAt: Date,
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for snippet
emailSchema.virtual('snippet').get(function() {
  const text = this.bodyPlain || this.body || '';
  return text.substring(0, 100) + (text.length > 100 ? '...' : '');
});

// Indexes for common queries
emailSchema.index({ userId: 1, folder: 1, receivedDate: -1 });
emailSchema.index({ userId: 1, isRead: 1, folder: 1 });
emailSchema.index({ userId: 1, isStarred: 1 });
emailSchema.index({ userId: 1, createdAt: -1 });
emailSchema.index({ userId: 1, 'from.email': 1 });
emailSchema.index({ subject: 'text', bodyPlain: 'text' });

module.exports = mongoose.model('Email', emailSchema);
