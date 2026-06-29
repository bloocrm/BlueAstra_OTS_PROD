const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { encrypt, decrypt } = require('../utils/encryption');

// Generate a unique, human-readable client identifier (e.g. CLT-3F9A2B1C)
const generateClientId = () => `CLT-${uuidv4().split('-')[0].toUpperCase()}`;

// Plugin to auto-decrypt on retrieve
const decryptPlugin = (schema, options) => {
  const decryptFields = options.decryptFields || [];

  schema.post('findOne', function (doc) {
    if (!doc) return;
    decryptFields.forEach(field => {
      if (doc[field]) {
        try {
          doc[field] = decrypt(doc[field]);
        } catch (error) {
          console.error(`Failed to decrypt field ${field}:`, error.message);
        }
      }
    });
  });

  schema.post('find', function (docs) {
    docs.forEach(doc => {
      decryptFields.forEach(field => {
        if (doc[field]) {
          try {
            doc[field] = decrypt(doc[field]);
          } catch (error) {
            console.error(`Failed to decrypt field ${field}:`, error.message);
          }
        }
      });
    });
  });
};

const clientSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // Unique, stable client identifier (generated, never reused)
    clientId: {
      type: String,
      unique: true,
      index: true,
      default: generateClientId
    },

    // Basic Information
    name: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    company: String,
    jobTitle: String,

    // PII - Encrypted
    ssn: {
      type: String,
      set: (value) => value ? encrypt(value) : null,
      select: false
    },
    driverLicense: {
      type: String,
      set: (value) => value ? encrypt(value) : null,
      select: false
    },
    passport: {
      type: String,
      set: (value) => value ? encrypt(value) : null,
      select: false
    },

    // Family Information
    spouseName: String,
    childrenNames: [String],

    // Beneficiary Information
    beneficiaries: [
      {
        name: String,
        relationship: String,
        contactInfo: String,
        percentage: Number
      }
    ],

    // Insurance Details - Encrypted
    insuranceDetails: {
      type: String,
      set: (value) => value ? encrypt(value) : null,
      select: false
    },

    // Investment Accounts - Encrypted
    investmentAccounts: [
      {
        accountType: String,
        accountNumber: {
          type: String,
          set: (value) => value ? encrypt(value) : null
        },
        balance: Number,
        institution: String,
        lastUpdated: Date
      }
    ],

    // Address Information
    homeAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    officeAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },

    // Professional Contacts
    accountants: [
      {
        name: String,
        email: String,
        phone: String,
        firm: String
      }
    ],
    attorneys: [
      {
        name: String,
        email: String,
        phone: String,
        firm: String
      }
    ],

    // Document Storage
    documents: [
      {
        name: String,
        type: String,
        fileUrl: String,
        uploadedAt: { type: Date, default: Date.now },
        description: String
      }
    ],

    // Financial Information
    annualIncome: {
      type: String,
      set: (value) => value ? encrypt(value) : null,
      select: false
    },
    netWorth: {
      type: String,
      set: (value) => value ? encrypt(value) : null,
      select: false
    },
    investmentPreference: String,

    // Status & Metadata
    status: {
      type: String,
      enum: ['active', 'inactive', 'prospect', 'archived'],
      default: 'active',
      index: true
    },
    riskProfile: String,
    communicationPreference: {
      email: { type: Boolean, default: true },
      phone: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      mail: { type: Boolean, default: false }
    },

    // Audit Fields
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    deletedAt: Date,
    deletedBy: mongoose.Schema.Types.ObjectId,

    // Notes & Tags
    notes: String,
    tags: [String],
    customFields: mongoose.Schema.Types.Mixed
  },
  {
    timestamps: true,
    collection: 'clients'
  }
);

// Apply decryption plugin
clientSchema.plugin(decryptPlugin, {
  decryptFields: ['ssn', 'driverLicense', 'passport', 'insuranceDetails', 'annualIncome', 'netWorth']
});

// Indexes
clientSchema.index({ userId: 1, status: 1 });
clientSchema.index({ email: 1, userId: 1 }, { unique: true, sparse: true });
clientSchema.index({ name: 'text', email: 'text', tags: 'text' });

// Pre-save middleware
clientSchema.pre('save', function (next) {
  if (this.name) this.name = this.name.trim();
  if (this.email) this.email = this.email.toLowerCase().trim();
  if (this.phone) this.phone = this.phone.trim();
  next();
});

// Pre-findOneAndUpdate middleware
clientSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update.ssn) update.ssn = encrypt(update.ssn);
  if (update.driverLicense) update.driverLicense = encrypt(update.driverLicense);
  if (update.passport) update.passport = encrypt(update.passport);
  if (update.insuranceDetails) update.insuranceDetails = encrypt(update.insuranceDetails);
  if (update.annualIncome) update.annualIncome = encrypt(update.annualIncome);
  if (update.netWorth) update.netWorth = encrypt(update.netWorth);
  next();
});

// Instance methods
clientSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.ssn;
  delete obj.driverLicense;
  delete obj.passport;
  delete obj.insuranceDetails;
  delete obj.annualIncome;
  delete obj.netWorth;
  return obj;
};

clientSchema.methods.getUnencryptedData = function () {
  return {
    ssn: this.ssn,
    driverLicense: this.driverLicense,
    passport: this.passport,
    insuranceDetails: this.insuranceDetails,
    annualIncome: this.annualIncome,
    netWorth: this.netWorth
  };
};

// Static methods
clientSchema.statics.findByUser = function (userId, filters = {}) {
  return this.find({ userId, deletedAt: null, ...filters });
};

clientSchema.statics.findActiveByUser = function (userId) {
  return this.find({ userId, status: 'active', deletedAt: null });
};

module.exports = mongoose.model('Client', clientSchema);
