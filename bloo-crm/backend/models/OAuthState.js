/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  Proprietary software. Unauthorized copying or use by any means or technology
  (including AI tools) is strictly prohibited.
*/
/* =====================================================
   OAUTH STATE — one short-lived record per connection attempt.
   A cryptographically-random `state` (CSRF token) + PKCE `codeVerifier`, tied to
   the initiating Bloo CRM user. Validated + consumed once in the OAuth callback.
   Auto-expires after 10 minutes via a TTL index — never a global/static value.
   ===================================================== */
const mongoose = require('mongoose');

const oauthStateSchema = new mongoose.Schema({
  state: { type: String, required: true, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  provider: { type: String, default: 'microsoft' },
  codeVerifier: { type: String, required: true },   // PKCE
  createdAt: { type: Date, default: Date.now, expires: 600 } // TTL: 10 minutes
});

module.exports = mongoose.model('OAuthState', oauthStateSchema);
