/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  Proprietary software. Unauthorized copying or use by any means or technology
  (including AI tools) is strictly prohibited.
*/
/* =====================================================
   MEETING CONNECTION — one meeting-provider connection per (userId, provider).
   Each advisor connects their OWN account (Teams/Zoom/Webex/Meet). Tokens are
   stored only as ciphertext (token-vault: KMS envelope or AES-256-GCM); refresh
   tokens never leave the server. Least-privilege scopes (meeting creation only).
   Strictly isolated by our authenticated userId + the provider account id.
   ===================================================== */
const mongoose = require('mongoose');

const meetingConnectionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: String, enum: ['microsoft', 'zoom', 'webex', 'google'], required: true },
    providerAccountId: { type: String, required: true },
    email: { type: String, required: true },
    tenantId: String,

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
    lastMeetingAt: Date
  },
  { timestamps: true, collection: 'meetingconnections' }
);

// One connection per advisor + provider.
meetingConnectionSchema.index({ userId: 1, provider: 1 }, { unique: true });

module.exports = mongoose.model('MeetingConnection', meetingConnectionSchema);
