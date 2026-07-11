/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  Proprietary software. Unauthorized copying or use by any means or technology
  (including AI tools) is strictly prohibited.
*/
/* =====================================================
   VISITOR — consent-based website visitor / analytics record
   Captures what the visitor consented to. On "Accept All" the full profile is
   stored; on "Necessary Only" only the security-essential minimum (IP + id).
   ===================================================== */
const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema(
  {
    // Anonymous, first-party identifier (e.g. anon_8f29c...)
    visitorId: { type: String, required: true, unique: true, index: true },

    // Consent
    consent: { type: String, enum: ['all', 'necessary', 'custom'], required: true, index: true },
    consentCategories: {
      necessary: { type: Boolean, default: true },   // always on
      analytics: { type: Boolean, default: false },
      personalization: { type: Boolean, default: false },
      marketing: { type: Boolean, default: false }
    },
    consentAt: { type: Date, default: Date.now },
    consentVersion: { type: String, default: '1.0' },

    // Security-essential (collected regardless of consent level)
    ipAddress: { type: String, index: true },
    userAgent: String,

    // Optional profile (only populated when analytics/personalization consented)
    location: {
      city: String,
      region: String,
      country: String,
      countryCode: String
    },
    device: String,          // Desktop | Mobile | Tablet
    browser: String,         // Chrome | Safari | Edge | Firefox …
    os: String,              // Windows 11 | macOS | Android …
    referralSource: String,  // Google | Direct | LinkedIn …
    landingPage: String,
    pagesViewed: { type: Number, default: 0 },
    sessionDurationSeconds: { type: Number, default: 0 },

    // Campaign attribution
    utmSource: String,
    utmMedium: String,
    utmCampaign: String,
    utmTerm: String,
    utmContent: String,

    // Visit lifecycle
    firstVisit: { type: Date, default: Date.now },
    lastVisit: { type: Date, default: Date.now },
    visitCount: { type: Number, default: 1 },
    returningVisitor: { type: Boolean, default: false },

    // Link to an identified CRM record once the visitor self-identifies
    identified: { type: Boolean, default: false },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    email: String
  },
  { timestamps: true, collection: 'visitors' }
);

visitorSchema.index({ createdAt: -1 });
visitorSchema.index({ utmCampaign: 1, createdAt: -1 });

module.exports = mongoose.model('Visitor', visitorSchema);
