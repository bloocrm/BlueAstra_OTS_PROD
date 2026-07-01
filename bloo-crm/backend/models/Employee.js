/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { encrypt, decrypt } = require('../utils/encryption');

const generateEmployeeId = () => `EMP-${uuidv4().split('-')[0].toUpperCase()}`;

// Auto-decrypt configured fields after reads
const decryptPlugin = (schema, options) => {
  const fields = options.decryptFields || [];
  const dec = (doc) => {
    if (!doc) return;
    fields.forEach(f => {
      if (doc[f]) { try { doc[f] = decrypt(doc[f]); } catch (e) { /* leave as-is */ } }
    });
  };
  schema.post('findOne', dec);
  schema.post('find', (docs) => Array.isArray(docs) && docs.forEach(dec));
};

const employeeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    employeeId: { type: String, unique: true, index: true, default: generateEmployeeId },

    // Basic info
    name: { type: String, required: true, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true, index: true },
    phone: { type: String, trim: true },
    department: { type: String, trim: true, index: true },
    jobTitle: String,
    manager: String,          // approver for this employee's requests
    backupEmployee: String,   // delegate if this employee (as approver) is unavailable
    dateOfJoining: Date,
    status: { type: String, enum: ['active', 'on-leave', 'terminated'], default: 'active', index: true },

    // PII — encrypted at rest (select:false so not returned by default)
    ssn: { type: String, set: v => v ? encrypt(v) : v, select: false },
    dateOfBirth: { type: String, set: v => v ? encrypt(v) : v, select: false },
    bankAccount: { type: String, set: v => v ? encrypt(v) : v, select: false },

    // Address
    address: {
      street: String, city: String, state: String, zipCode: String, country: String
    },
    emergencyContact: { name: String, phone: String, relationship: String },

    // Free-form
    notes: String
  },
  { timestamps: true, collection: 'employees' }
);

employeeSchema.plugin(decryptPlugin, { decryptFields: ['ssn', 'dateOfBirth', 'bankAccount'] });
employeeSchema.index({ userId: 1, status: 1 });

// Encrypt PII on findOneAndUpdate too
employeeSchema.pre('findOneAndUpdate', function (next) {
  const u = this.getUpdate() || {};
  ['ssn', 'dateOfBirth', 'bankAccount'].forEach(f => { if (u[f]) u[f] = encrypt(u[f]); });
  next();
});

// Strip PII from default JSON output
employeeSchema.methods.toJSON = function () {
  const o = this.toObject();
  delete o.ssn; delete o.dateOfBirth; delete o.bankAccount;
  return o;
};

module.exports = mongoose.model('Employee', employeeSchema);
