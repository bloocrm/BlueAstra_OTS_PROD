/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  Proprietary software. Unauthorized copying or use by any means or technology
  (including AI tools) is strictly prohibited.
*/
/* =====================================================
   PAYMENT ATTEMPT — captures a checkout attempt that could not be started
   (the payment link/gateway failed). Stores whatever details we have so we can
   follow up with a recovery email and understand why the payment didn't work.
   ===================================================== */
const mongoose = require('mongoose');

const paymentAttemptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    name: String,
    email: { type: String, index: true },
    phone: String,
    plan: String,
    billingCycle: String,
    amount: Number,
    currency: { type: String, default: 'USD' },
    paymentMethod: String,       // stripe | razorpay | instamojo | payu | ...
    stage: { type: String, default: 'initiation-failed' },
    errorMessage: String,
    recoveryEmailSent: { type: Boolean, default: false },
    recoveryEmailSentAt: Date
  },
  { timestamps: true, collection: 'paymentattempts' }
);

paymentAttemptSchema.index({ createdAt: -1 });

module.exports = mongoose.model('PaymentAttempt', paymentAttemptSchema);
