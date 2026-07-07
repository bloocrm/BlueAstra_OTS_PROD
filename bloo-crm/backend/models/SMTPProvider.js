/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
const mongoose = require('mongoose');
const crypto = require('crypto');

const smtpProviderSchema = new mongoose.Schema(
  {
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
    providerType: {
      type: String,
      enum: ['amazon-ses', 'postmark', 'mailgun', 'smtp2go', 'custom-smtp'],
      required: true,
      index: true
    },
    displayName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    // Amazon SES Credentials
    amazon: {
      accessKey: String,
      secretKey: String,
      sesRegion: String,
      verified: { type: Boolean, default: false },
      fromEmail: String,
      dailyQuota: Number,
      maxSendRate: Number
    },

    // Postmark Credentials
    postmark: {
      accountToken: String,
      serverToken: String,
      serverId: String,
      verified: { type: Boolean, default: false },
      dailyQuota: Number
    },

    // Mailgun Credentials
    mailgun: {
      apiKey: String,
      domain: String,
      region: {
        type: String,
        enum: ['us', 'eu'],
        default: 'us'
      },
      verified: { type: Boolean, default: false },
      publicValidationKey: String
    },

    // SMTP2Go Credentials
    smtp2go: {
      apiKey: String,
      verified: { type: Boolean, default: false },
      dailyQuota: Number
    },

    // Custom SMTP
    customSmtp: {
      host: String,
      port: Number,
      secure: Boolean,
      username: String,
      password: String,
      fromEmail: String,
      fromName: String,
      verified: { type: Boolean, default: false }
    },

    // SSO Authentication
    sso: {
      enabled: { type: Boolean, default: false },
      provider: {
        type: String,
        enum: ['google', 'microsoft', 'apple', 'github', 'oauth2'],
        default: null
      },
      clientId: String,
      clientSecret: String,
      redirectUri: String,
      accessToken: String,
      refreshToken: String,
      tokenExpiresAt: Date,
      verified: { type: Boolean, default: false },
      userId: String,
      userEmail: String
    },

    // General Settings
    isPrimary: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    testEmailSent: Date,
    testEmailResult: String,

    // Usage Statistics
    stats: {
      emailsSent: { type: Number, default: 0 },
      emailsFailed: { type: Number, default: 0 },
      lastEmailTime: Date,
      totalAttempts: { type: Number, default: 0 }
    },

    // Rate Limiting
    rateLimit: {
      requestsPerMinute: Number,
      requestsPerDay: Number,
      currentDayRequests: { type: Number, default: 0 },
      dayResetTime: Date
    },

    // Error Tracking (renamed from reserved Mongoose path 'errors')
    errorLog: [{
      timestamp: Date,
      error: String,
      code: String,
      message: String
    }],

    // Encryption & Security
    encryptedCredentials: {
      amazon: String,
      postmark: String,
      mailgun: String,
      smtp2go: String,
      customSmtp: String,
      sso: String
    },

    // Webhook Configuration
    webhooks: {
      bounceUrl: String,
      complaintUrl: String,
      deliveryUrl: String,
      openUrl: String,
      clickUrl: String,
      spamUrl: String
    },

    // Metadata
    metadata: {
      setupDate: Date,
      lastModified: Date,
      testsPassed: [String],
      testsFailed: [String],
      notes: String,
      tags: [String]
    },

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

// Virtual for provider display name
smtpProviderSchema.virtual('providerDisplayName').get(function() {
  const names = {
    'amazon-ses': 'Amazon SES',
    'postmark': 'Postmark',
    'mailgun': 'Mailgun',
    'smtp2go': 'SMTP2Go',
    'custom-smtp': 'Custom SMTP'
  };
  return names[this.providerType];
});

// Encrypt credentials before saving
smtpProviderSchema.pre('save', function(next) {
  const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';

  const encryptField = (data) => {
    if (!data) return null;
    const cipher = crypto.createCipher('aes-256-cbc', encryptionKey);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  };

  if (this.amazon && (this.amazon.accessKey || this.amazon.secretKey)) {
    this.encryptedCredentials.amazon = encryptField({
      accessKey: this.amazon.accessKey,
      secretKey: this.amazon.secretKey
    });
    this.amazon.accessKey = undefined;
    this.amazon.secretKey = undefined;
  }

  if (this.postmark && (this.postmark.accountToken || this.postmark.serverToken)) {
    this.encryptedCredentials.postmark = encryptField({
      accountToken: this.postmark.accountToken,
      serverToken: this.postmark.serverToken
    });
    this.postmark.accountToken = undefined;
    this.postmark.serverToken = undefined;
  }

  if (this.mailgun && this.mailgun.apiKey) {
    this.encryptedCredentials.mailgun = encryptField({
      apiKey: this.mailgun.apiKey
    });
    this.mailgun.apiKey = undefined;
  }

  if (this.smtp2go && this.smtp2go.apiKey) {
    this.encryptedCredentials.smtp2go = encryptField({
      apiKey: this.smtp2go.apiKey
    });
    this.smtp2go.apiKey = undefined;
  }

  if (this.customSmtp && (this.customSmtp.password || this.customSmtp.username)) {
    this.encryptedCredentials.customSmtp = encryptField({
      username: this.customSmtp.username,
      password: this.customSmtp.password
    });
    this.customSmtp.password = undefined;
  }

  if (this.sso && (this.sso.clientSecret || this.sso.accessToken)) {
    this.encryptedCredentials.sso = encryptField({
      clientSecret: this.sso.clientSecret,
      accessToken: this.sso.accessToken,
      refreshToken: this.sso.refreshToken
    });
    this.sso.clientSecret = undefined;
    this.sso.accessToken = undefined;
    this.sso.refreshToken = undefined;
  }

  next();
});

// Methods to decrypt credentials
smtpProviderSchema.methods.getAmazonCredentials = function() {
  if (!this.encryptedCredentials.amazon) return null;
  const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
  const decipher = crypto.createDecipher('aes-256-cbc', encryptionKey);
  let decrypted = decipher.update(this.encryptedCredentials.amazon, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
};

smtpProviderSchema.methods.getPostmarkCredentials = function() {
  if (!this.encryptedCredentials.postmark) return null;
  const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
  const decipher = crypto.createDecipher('aes-256-cbc', encryptionKey);
  let decrypted = decipher.update(this.encryptedCredentials.postmark, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
};

smtpProviderSchema.methods.getMailgunCredentials = function() {
  if (!this.encryptedCredentials.mailgun) return null;
  const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
  const decipher = crypto.createDecipher('aes-256-cbc', encryptionKey);
  let decrypted = decipher.update(this.encryptedCredentials.mailgun, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
};

smtpProviderSchema.methods.getSMTP2GoCredentials = function() {
  if (!this.encryptedCredentials.smtp2go) return null;
  const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
  const decipher = crypto.createDecipher('aes-256-cbc', encryptionKey);
  let decrypted = decipher.update(this.encryptedCredentials.smtp2go, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
};

smtpProviderSchema.methods.getCustomSMTPCredentials = function() {
  if (!this.encryptedCredentials.customSmtp) return null;
  const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
  const decipher = crypto.createDecipher('aes-256-cbc', encryptionKey);
  let decrypted = decipher.update(this.encryptedCredentials.customSmtp, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
};

smtpProviderSchema.methods.getSSOCredentials = function() {
  if (!this.encryptedCredentials.sso) return null;
  const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
  const decipher = crypto.createDecipher('aes-256-cbc', encryptionKey);
  let decrypted = decipher.update(this.encryptedCredentials.sso, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
};

// Indexes
smtpProviderSchema.index({ userId: 1, isActive: 1 });
smtpProviderSchema.index({ userId: 1, providerType: 1 });
smtpProviderSchema.index({ accountId: 1 });
smtpProviderSchema.index({ email: 1 });
smtpProviderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SMTPProvider', smtpProviderSchema);
