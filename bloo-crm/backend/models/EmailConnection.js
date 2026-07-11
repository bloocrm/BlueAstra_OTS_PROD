/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  Proprietary software. Unauthorized copying or use by any means or technology
  (including AI tools) is strictly prohibited.
*/
/* =====================================================
   EMAIL CONNECTION — one mailbox connection per (userId, provider, email).
   Tokens are stored ONLY as ciphertext (AES-256-GCM, KMS-envelope when configured
   — see utils/token-vault). Refresh tokens never leave the server. Each connection
   is strictly isolated by our own authenticated userId + provider account/tenant.
   ===================================================== */
const mongoose = require('mongoose');

const emailConnectionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: String, enum: ['microsoft'], required: true },
    providerAccountId: { type: String, required: true },   // Graph user object id (oid)
    email: { type: String, required: true },
    tenantId: String,

    // Ciphertext only — never plaintext. Access token is optional (refreshed on demand).
    encryptedAccessToken: { type: String },
    encryptedRefreshToken: { type: String },
    tokenExpiresAt: { type: Date },

    scopes: [String],

    connectionStatus: {
      type: String,
      enum: ['connected', 'expired', 'revoked', 'error'],
      default: 'connected',
      index: true
    },
    lastError: String,
    lastSyncAt: Date
  },
  { timestamps: true, collection: 'emailconnections' }
);

// One connection per user + provider + mailbox.
emailConnectionSchema.index({ userId: 1, provider: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('EmailConnection', emailConnectionSchema);
