/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
const mongoose = require('mongoose');
const crypto = require('crypto');

const emailAccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    provider: {
      type: String,
      enum: ['gmail', 'outlook', 'yahoo', 'zoho', 'imap'],
      required: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    displayName: String,
    accessToken: {
      type: String,
      select: false
    },
    refreshToken: {
      type: String,
      select: false
    },
    tokenExpiresAt: Date,
    encryptedTokens: {
      accessToken: String,
      refreshToken: String
    },
    syncToken: String,
    historyId: String,
    lastSyncTime: {
      type: Date,
      index: true
    },
    syncStatus: {
      type: String,
      enum: ['idle', 'syncing', 'error'],
      default: 'idle'
    },
    syncError: String,
    imapConfig: {
      host: String,
      port: Number,
      secure: Boolean,
      username: String,
      password: String
    },
    signature: String,
    autoSignature: {
      type: Boolean,
      default: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    folders: [{
      name: String,
      folderId: String,
      messageCount: Number,
      unreadCount: Number
    }],
    settings: {
      autoRefresh: { type: Boolean, default: true },
      autoRefreshInterval: { type: Number, default: 5 },
      downloadAttachments: { type: Boolean, default: false },
      maxAttachmentSize: { type: Number, default: 25 },
      allowedMimeTypes: [String]
    },
    connectionDetails: {
      connectedAt: Date,
      lastActivity: Date,
      failedAttempts: { type: Number, default: 0 },
      lockedUntil: Date
    },
    quotaUsage: {
      used: Number,
      total: Number,
      percentUsed: Number
    },
    metadata: mongoose.Schema.Types.Mixed,
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

// Encrypt tokens before saving
emailAccountSchema.pre('save', function(next) {
  if (this.accessToken || this.refreshToken) {
    const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';

    if (this.accessToken) {
      const cipher = crypto.createCipher('aes-256-cbc', encryptionKey);
      let encrypted = cipher.update(this.accessToken, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      this.encryptedTokens.accessToken = encrypted;
      this.accessToken = undefined;
    }

    if (this.refreshToken) {
      const cipher = crypto.createCipher('aes-256-cbc', encryptionKey);
      let encrypted = cipher.update(this.refreshToken, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      this.encryptedTokens.refreshToken = encrypted;
      this.refreshToken = undefined;
    }
  }
  next();
});

// Decrypt tokens when retrieved
emailAccountSchema.methods.getAccessToken = function() {
  if (!this.encryptedTokens?.accessToken) return null;

  const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
  const decipher = crypto.createDecipher('aes-256-cbc', encryptionKey);
  let decrypted = decipher.update(this.encryptedTokens.accessToken, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

emailAccountSchema.methods.getRefreshToken = function() {
  if (!this.encryptedTokens?.refreshToken) return null;

  const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
  const decipher = crypto.createDecipher('aes-256-cbc', encryptionKey);
  let decrypted = decipher.update(this.encryptedTokens.refreshToken, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

// Indexes for efficient queries
emailAccountSchema.index({ userId: 1, isActive: 1 });
emailAccountSchema.index({ userId: 1, provider: 1 });
emailAccountSchema.index({ email: 1 });
emailAccountSchema.index({ lastSyncTime: 1 });

module.exports = mongoose.model('EmailAccount', emailAccountSchema);
