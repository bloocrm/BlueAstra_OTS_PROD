/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
const mongoose = require('mongoose');
const crypto = require('crypto');

// Unique, human-readable payment-receipt number, e.g. BLOO-20260711-K3QF8A7C.
// Combines the date + a base36 ms-timestamp tail + random hex — collision-safe.
function generateReceiptNumber() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const seq = Date.now().toString(36).toUpperCase().slice(-5);
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `BLOO-${ymd}-${seq}${rand}`;
}

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    plan: {
      type: String,
      enum: ['basic', 'swift-ai-plus', 'rocket-ai-plus'],
      required: true
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR'
    },
    status: {
      type: String,
      enum: ['initiated', 'pending', 'completed', 'failed', 'cancelled'],
      default: 'initiated',
      index: true
    },
    paymentMethod: {
      type: String,
      enum: ['razorpay_upi', 'razorpay_card', 'razorpay_wallet', 'razorpay_netbanking', 'paypal', 'other'],
      required: true
    },
    razorpayOrderId: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    razorpayPaymentId: String,
    paypalTransactionId: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    customerDetails: {
      name: String,
      email: String,
      phone: String,
      billingAddress: {
        street: String,
        city: String,
        state: String,
        country: String,
        zipCode: String
      }
    },
    description: String,
    notes: String,
    errorMessage: String,
    errorCode: String,
    completedAt: Date,
    expiryDate: Date,
    // Unique payment-receipt number, issued once the payment succeeds.
    receiptNumber: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    receiptUrl: String,
    invoiceUrl: String,
    metadata: mongoose.Schema.Types.Mixed,
    webhookVerified: {
      type: Boolean,
      default: false
    },
    otpVerified: {
      type: Boolean,
      default: false
    },
    otpVerifiedAt: Date
  },
  {
    timestamps: true
  }
);

// Compound index for user lookups
orderSchema.index({ userId: 1, createdAt: -1 });

// Method to verify payment
orderSchema.methods.isPaymentVerified = function () {
  return this.status === 'completed' && this.webhookVerified;
};

// Expose the generator for non-Order-flow payments (e.g. Stripe).
orderSchema.statics.generateReceiptNumber = generateReceiptNumber;

// Method to mark as completed
orderSchema.methods.markCompleted = function () {
  this.status = 'completed';
  this.completedAt = new Date();
  this.webhookVerified = true;
  if (!this.receiptNumber) this.receiptNumber = generateReceiptNumber();
  return this.save();
};

// Method to mark as failed
orderSchema.methods.markFailed = function (errorMsg, errorCode) {
  this.status = 'failed';
  this.errorMessage = errorMsg;
  this.errorCode = errorCode;
  return this.save();
};

module.exports = mongoose.model('Order', orderSchema);
