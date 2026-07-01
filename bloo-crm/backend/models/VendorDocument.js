/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const generateDocId = () => `VDOC-${uuidv4().split('-')[0].toUpperCase()}`;

const DOC_TYPES = [
  'Onboarding Forms', 'Personal Vendor Details', 'Compliance Policies Agreement',
  'Pricing Agreement', 'Contact Points', 'Performance Score', 'Payment History',
  'Operational Service Agreement', 'Service Level Agreement', 'Design Document',
  'Technical Design Document', 'Business Agreement', 'Milestone Charts',
  'Invoice Document', 'Purchase Order Document', 'Business Continuity Plans',
  'Disaster Recovery Plans', 'Certifications', 'RFI/RFQ Document',
  'Vendor Product Catalogue', 'Other'
];

const vendorDocSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    docId: { type: String, unique: true, index: true, default: generateDocId },
    vendorRef: { type: String, index: true },   // VEN- id
    vendorName: String,
    docType: { type: String, default: 'Other' },
    originalName: String,
    storedName: String,
    mimetype: String,
    size: Number,
    url: String
  },
  { timestamps: true }
);

vendorDocSchema.index({ userId: 1, vendorRef: 1, createdAt: -1 });

module.exports = mongoose.model('VendorDocument', vendorDocSchema);
module.exports.DOC_TYPES = DOC_TYPES;
