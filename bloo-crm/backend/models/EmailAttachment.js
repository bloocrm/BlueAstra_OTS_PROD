const mongoose = require('mongoose');

const emailAttachmentSchema = new mongoose.Schema(
  {
    emailId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Email',
      required: true,
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
      required: true
    },
    filename: {
      type: String,
      required: true,
      trim: true
    },
    mimetype: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    provider: {
      type: String,
      enum: ['gmail', 'outlook', 'yahoo', 'zoho', 'imap'],
      required: true
    },
    externalId: String,
    attachmentId: String,
    storageType: {
      type: String,
      enum: ['local', 's3', 'gcs', 'azure'],
      default: 'local'
    },
    storagePath: String,
    storageUrl: String,
    downloadUrl: String,
    md5Hash: {
      type: String,
      index: true
    },
    virusScanStatus: {
      type: String,
      enum: ['pending', 'clean', 'infected', 'quarantined'],
      default: 'pending'
    },
    virusScanResult: String,
    isInline: {
      type: Boolean,
      default: false
    },
    contentId: String,
    contentDisposition: String,
    encoding: String,
    compressed: Boolean,
    compressedSize: Number,
    compressionRatio: Number,
    downloadCount: {
      type: Number,
      default: 0
    },
    lastDownloadedAt: Date,
    downloadedBy: [{
      userId: mongoose.Schema.Types.ObjectId,
      timestamp: Date
    }],
    accessControl: {
      isPublic: { type: Boolean, default: false },
      allowedUsers: [mongoose.Schema.Types.ObjectId],
      expiresAt: Date
    },
    metadata: {
      width: Number,
      height: Number,
      duration: Number,
      preview: String,
      tags: [String]
    },
    isArchived: {
      type: Boolean,
      default: false
    },
    archivedAt: Date,
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    deletedAt: Date
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtuals
emailAttachmentSchema.virtual('fileExtension').get(function() {
  if (!this.filename) return '';
  const parts = this.filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
});

emailAttachmentSchema.virtual('fileType').get(function() {
  const ext = this.fileExtension;
  const types = {
    'pdf': 'PDF Document',
    'doc': 'Word Document',
    'docx': 'Word Document',
    'xls': 'Excel Spreadsheet',
    'xlsx': 'Excel Spreadsheet',
    'ppt': 'PowerPoint Presentation',
    'pptx': 'PowerPoint Presentation',
    'txt': 'Text File',
    'csv': 'CSV Data',
    'jpg': 'Image',
    'jpeg': 'Image',
    'png': 'Image',
    'gif': 'Image',
    'zip': 'Compressed Archive',
    'rar': 'Compressed Archive',
    '7z': 'Compressed Archive',
    'mp3': 'Audio File',
    'mp4': 'Video File',
    'mov': 'Video File',
    'avi': 'Video File'
  };
  return types[ext] || 'File';
});

emailAttachmentSchema.virtual('sizeFormatted').get(function() {
  const bytes = this.size;
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
});

// Indexes
emailAttachmentSchema.index({ userId: 1, createdAt: -1 });
emailAttachmentSchema.index({ emailId: 1 });
emailAttachmentSchema.index({ md5Hash: 1 });
emailAttachmentSchema.index({ virusScanStatus: 1 });
emailAttachmentSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

module.exports = mongoose.model('EmailAttachment', emailAttachmentSchema);
