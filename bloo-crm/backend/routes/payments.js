/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const paypal = require('paypal-rest-sdk');
const Order = require('../models/Order');
const User = require('../models/User');
const router = express.Router();

// Store OTP attempts (in production, use Redis for better persistence)
const otpStore = new Map();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'test_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'test_secret'
});

// Configure PayPal
paypal.configure({
  mode: process.env.PAYPAL_MODE || 'sandbox',
  client_id: process.env.PAYPAL_CLIENT_ID || '',
  client_secret: process.env.PAYPAL_CLIENT_SECRET || ''
});

// Pricing configuration (must match frontend)
const PRICING = {
  basic: { monthly: 10, yearly: 100 },
  'swift-ai-plus': { monthly: 99, yearly: 990 },
  'rocket-ai-plus': { monthly: 199, yearly: 1990 }
};

// Helper function to generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper function to send OTP via SMS (uses Razorpay OTP or stub)
async function sendOTPToPhone(phone, otp) {
  try {
    // In production, integrate with SMS provider (Twilio, AWS SNS, Razorpay OTP, etc.)
    // For now, we'll log it (in production, send via SMS API)
    console.log(`OTP ${otp} sent to ${phone}`);

    // Stub: In production, use Twilio or similar
    // await twilio.messages.create({
    //   body: `Your Bloo CRM payment OTP is: ${otp}. Valid for 5 minutes.`,
    //   from: process.env.TWILIO_PHONE,
    //   to: phone
    // });

    return true;
  } catch (error) {
    console.error('OTP send error:', error);
    return false;
  }
}

// Helper function to validate and retrieve OTP
function validateOTP(orderId, phone, otp) {
  const key = `${orderId}:${phone}`;
  const stored = otpStore.get(key);

  if (!stored) {
    return { valid: false, message: 'OTP expired or not found' };
  }

  if (Date.now() - stored.timestamp > 5 * 60 * 1000) { // 5 minutes
    otpStore.delete(key);
    return { valid: false, message: 'OTP expired' };
  }

  if (stored.otp !== otp) {
    stored.attempts = (stored.attempts || 0) + 1;
    if (stored.attempts >= 3) {
      otpStore.delete(key);
      return { valid: false, message: 'Maximum OTP attempts exceeded' };
    }
    return { valid: false, message: 'Invalid OTP' };
  }

  return { valid: true, message: 'OTP verified' };
}

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'secret');
    req.userId = decoded.id;
    req.userEmail = decoded.email;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Initiate payment - Create order
router.post('/initiate', verifyToken, async (req, res) => {
  try {
    const { plan, billingCycle, paymentMethod, customerDetails } = req.body;

    // Validate inputs
    if (!plan || !PRICING[plan]) {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    if (!['monthly', 'yearly'].includes(billingCycle)) {
      return res.status(400).json({ error: 'Invalid billing cycle' });
    }
    if (!['razorpay', 'paypal'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    // Calculate amount (backend validation)
    const amount = PRICING[plan][billingCycle] * 100; // Convert to paise for Razorpay

    // Generate unique order ID
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Get user details
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create order in database
    const order = new Order({
      orderId,
      userId: req.userId,
      plan,
      billingCycle,
      amount: amount / 100, // Store in rupees
      paymentMethod: `${paymentMethod}_${customerDetails?.paymentSubMethod || 'default'}`,
      customerDetails: {
        name: customerDetails?.name || user.name,
        email: customerDetails?.email || user.email,
        phone: customerDetails?.phone || user.phone,
        billingAddress: customerDetails?.billingAddress || {}
      },
      status: 'initiated'
    });

    await order.save();

    // Generate and send OTP to phone
    const phone = customerDetails?.phone || user.phone;
    const otp = generateOTP();
    const otpKey = `${orderId}:${phone}`;

    // Store OTP with expiration and attempt tracking
    otpStore.set(otpKey, {
      otp,
      timestamp: Date.now(),
      attempts: 0,
      verified: false
    });

    // Send OTP to phone (this is where SMS API would be called)
    const otpSent = await sendOTPToPhone(phone, otp);

    if (!otpSent) {
      // Log warning but don't fail - OTP stored in memory
      console.warn('Failed to send OTP SMS, but OTP stored for verification');
    }

    // Generate connection details (for non-OTP flows)
    let paymentToken = {};

    if (paymentMethod === 'razorpay') {
      // Create Razorpay order
      try {
        const razorpayOrder = await razorpay.orders.create({
          amount: amount,
          currency: 'INR',
          receipt: orderId,
          notes: {
            userId: req.userId,
            plan: plan,
            billingCycle: billingCycle
          }
        });

        order.razorpayOrderId = razorpayOrder.id;
        await order.save();

        paymentToken = {
          razorpayOrderId: razorpayOrder.id,
          razorpayKeyId: process.env.RAZORPAY_KEY_ID,
          amount: amount,
          currency: 'INR',
          description: `Bloo CRM - ${plan} Plan (${billingCycle})`,
          prefill: {
            name: customerDetails?.name || user.name,
            email: customerDetails?.email || user.email,
            contact: customerDetails?.phone || user.phone
          }
        };
      } catch (razorpayError) {
        order.errorMessage = razorpayError.message;
        await order.save();
        return res.status(500).json({ error: 'Failed to create Razorpay order', details: razorpayError.message });
      }
    } else if (paymentMethod === 'paypal') {
      // Create PayPal payment
      const paypalPayment = {
        intent: 'sale',
        payer: {
          payment_method: 'paypal'
        },
        redirect_urls: {
          return_url: `${process.env.FRONTEND_URL || '/api'}/payment-success?orderId=${orderId}`,
          cancel_url: `${process.env.FRONTEND_URL || '/api'}/payment-cancelled?orderId=${orderId}`
        },
        transactions: [
          {
            amount: {
              total: (amount / 100).toFixed(2),
              currency: 'INR',
              details: {
                subtotal: (amount / 100).toFixed(2)
              }
            },
            description: `Bloo CRM - ${plan} Plan (${billingCycle})`,
            invoice_number: orderId,
            custom: orderId,
            item_list: {
              items: [
                {
                  name: `${plan.toUpperCase()} Plan - ${billingCycle}`,
                  sku: plan,
                  price: (amount / 100).toFixed(2),
                  currency: 'INR',
                  quantity: 1
                }
              ]
            }
          }
        ]
      };

      paypal.payment.create(paypalPayment, (error, payment) => {
        if (error) {
          order.errorMessage = error.message;
          order.save();
          return res.status(500).json({ error: 'Failed to create PayPal payment', details: error.message });
        } else {
          const approvalUrl = payment.links.find(link => link.rel === 'approval_url');
          if (approvalUrl) {
            paymentToken.approvalUrl = approvalUrl.href;
            paymentToken.paymentId = payment.id;
          }
        }
      });
    }

    res.json({
      message: 'Order created successfully. OTP sent to phone.',
      data: {
        orderId: order.orderId,
        customerId: user._id.toString(),
        amount: order.amount,
        plan: order.plan,
        billingCycle: order.billingCycle,
        phone: phone,
        ...paymentToken
      }
    });
  } catch (error) {
    console.error('Payment initiation error:', error);
    res.status(500).json({ error: 'Failed to initiate payment', details: error.message });
  }
});

// Verify OTP endpoint
router.post('/verify-otp', verifyToken, async (req, res) => {
  try {
    const { otp, orderId, phone } = req.body;

    if (!otp || !orderId || !phone) {
      return res.status(400).json({ error: 'Missing OTP, order ID, or phone' });
    }

    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      return res.status(400).json({ error: 'Invalid OTP format' });
    }

    // Validate OTP
    const otpValidation = validateOTP(orderId, phone, otp);

    if (!otpValidation.valid) {
      return res.status(400).json({ error: otpValidation.message });
    }

    // Find order and verify ownership
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.userId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Mark OTP as verified
    const otpKey = `${orderId}:${phone}`;
    const stored = otpStore.get(otpKey);
    if (stored) {
      stored.verified = true;
      stored.verifiedAt = Date.now();
    }

    // Generate verification token (JWT-like, but simple)
    const verificationToken = Buffer.from(`${orderId}:${Date.now()}`).toString('base64');

    // Update order status
    order.otpVerified = true;
    order.otpVerifiedAt = new Date();
    await order.save();

    res.json({
      message: 'OTP verified successfully',
      data: {
        verified: true,
        verificationToken: verificationToken,
        orderId: orderId
      }
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ error: 'OTP verification failed', details: error.message });
  }
});

// Resend OTP endpoint
router.post('/resend-otp', verifyToken, async (req, res) => {
  try {
    const { orderId, phone } = req.body;

    if (!orderId || !phone) {
      return res.status(400).json({ error: 'Missing order ID or phone' });
    }

    // Find order and verify ownership
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.userId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if order is already processed
    if (order.status !== 'initiated') {
      return res.status(400).json({ error: 'Cannot resend OTP for this order' });
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpKey = `${orderId}:${phone}`;

    // Store new OTP
    otpStore.set(otpKey, {
      otp,
      timestamp: Date.now(),
      attempts: 0,
      verified: false
    });

    // Send OTP to phone
    const otpSent = await sendOTPToPhone(phone, otp);

    if (!otpSent) {
      console.warn('Failed to send OTP SMS, but OTP stored for verification');
    }

    res.json({
      message: 'OTP resent successfully',
      data: {
        otpResent: true,
        phone: phone,
        orderId: orderId
      }
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: 'Failed to resend OTP', details: error.message });
  }
});


router.post('/verify', verifyToken, async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    // Verify signature
    const hmac = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'test_secret')
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (hmac !== razorpaySignature) {
      return res.status(400).json({ error: 'Payment verification failed - invalid signature' });
    }

    // Find and update order
    const order = await Order.findOne({ razorpayOrderId });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.userId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Mark order as completed
    await order.markCompleted();
    order.razorpayPaymentId = razorpayPaymentId;
    await order.save();

    // Update user plan
    const user = await User.findById(req.userId);
    user.plan = order.plan;
    user.billingCycle = order.billingCycle;
    user.planStartDate = new Date();

    if (order.billingCycle === 'yearly') {
      user.planExpiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    } else {
      user.planExpiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    user.subscriptionStatus = 'active';
    await user.save();

    res.json({
      message: 'Payment verified successfully',
      data: {
        orderId: order.orderId,
        status: order.status,
        plan: order.plan
      }
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Payment verification failed', details: error.message });
  }
});

// PayPal callback/execute payment
router.get('/paypal-callback', verifyToken, async (req, res) => {
  try {
    const { paymentId, PayerID, orderId } = req.query;

    if (!paymentId || !PayerID) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    // Find order
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.userId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Execute payment
    const executePayment = {
      payer_id: PayerID
    };

    paypal.payment.execute(paymentId, executePayment, async (error, payment) => {
      if (error) {
        order.markFailed(error.message, error.name);
        return res.status(500).json({ error: 'PayPal payment execution failed' });
      }

      // Payment successful
      await order.markCompleted();
      order.paypalTransactionId = payment.id;
      await order.save();

      // Update user plan
      const user = await User.findById(req.userId);
      user.plan = order.plan;
      user.billingCycle = order.billingCycle;
      user.planStartDate = new Date();

      if (order.billingCycle === 'yearly') {
        user.planExpiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      } else {
        user.planExpiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }

      user.subscriptionStatus = 'active';
      await user.save();

      // Redirect to confirmation page
      res.json({
        message: 'Payment successful',
        data: {
          orderId: order.orderId,
          status: order.status,
          plan: order.plan
        }
      });
    });
  } catch (error) {
    console.error('PayPal callback error:', error);
    res.status(500).json({ error: 'PayPal callback failed' });
  }
});

// Get payment history
router.get('/history', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const orders = await Order.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments({ userId: req.userId });

    res.json({
      message: 'Payment history retrieved',
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({ error: 'Failed to retrieve payment history' });
  }
});

// Get subscription status
router.get('/subscription-status', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Subscription status retrieved',
      data: {
        plan: user.plan,
        subscriptionStatus: user.subscriptionStatus,
        billingCycle: user.billingCycle,
        planStartDate: user.planStartDate,
        planExpiryDate: user.planExpiryDate
      }
    });
  } catch (error) {
    console.error('Subscription status error:', error);
    res.status(500).json({ error: 'Failed to retrieve subscription status' });
  }
});

// =====================================================
// STRIPE — hosted Checkout Session
// Creates a Checkout Session and returns its URL; the client is redirected
// to Stripe's hosted page for the charge. Requires STRIPE_SECRET_KEY.
// =====================================================
router.post('/stripe/checkout', verifyToken, async (req, res) => {
  try {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return res.status(503).json({ error: 'Stripe not configured', message: 'STRIPE_SECRET_KEY is not set on the server.' });

    const b = req.body || {};
    const amount = Number(b.amount);
    if (!amount || amount <= 0) return res.status(400).json({ error: 'A valid amount is required' });
    const planName = (b.planName || b.plan || 'Bloo CRM Plan').toString();
    const currency = (b.currency || process.env.STRIPE_CURRENCY || 'usd').toLowerCase();
    const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'https://bloocrm.com';

    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('success_url', `${appUrl}/pages/payment-confirmation.html?status=success&provider=stripe&session_id={CHECKOUT_SESSION_ID}`);
    params.append('cancel_url', `${appUrl}/index.html#pricing`);
    params.append('line_items[0][quantity]', '1');
    params.append('line_items[0][price_data][currency]', currency);
    params.append('line_items[0][price_data][unit_amount]', String(Math.round(amount * 100)));
    params.append('line_items[0][price_data][product_data][name]', `${planName} (${b.billingCycle || 'subscription'})`);
    if (b.email) params.append('customer_email', b.email);
    params.append('metadata[plan]', (b.plan || '').toString());
    params.append('metadata[userId]', (req.userId || '').toString());
    params.append('metadata[billingCycle]', (b.billingCycle || '').toString());

    const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    const data = await resp.json();
    if (!resp.ok) {
      console.error('Stripe error:', data && data.error);
      return res.status(502).json({ error: 'Stripe checkout failed', message: (data.error && data.error.message) || 'Stripe API error' });
    }
    res.json({ status: 'success', id: data.id, url: data.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ error: 'Failed to create Stripe checkout', message: error.message });
  }
});

// =====================================================
// INSTAMOJO — create a payment request (hosted page)
// =====================================================
router.post('/instamojo/create', verifyToken, async (req, res) => {
  try {
    const apiKey = process.env.INSTAMOJO_API_KEY, authToken = process.env.INSTAMOJO_AUTH_TOKEN;
    const base = process.env.INSTAMOJO_BASE || 'https://www.instamojo.com/api/1.1';
    if (!apiKey || !authToken) return res.status(503).json({ error: 'Instamojo not configured', message: 'INSTAMOJO_API_KEY / INSTAMOJO_AUTH_TOKEN are not set on the server.' });

    const b = req.body || {};
    const amount = Number(b.amount);
    if (!amount || amount <= 0) return res.status(400).json({ error: 'A valid amount is required' });
    const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'https://bloocrm.com';

    const params = new URLSearchParams();
    params.append('purpose', `${b.planName || 'Bloo CRM Plan'} (${b.billingCycle || 'subscription'})`);
    params.append('amount', amount.toFixed(2));
    if (b.name) params.append('buyer_name', b.name);
    if (b.email) params.append('email', b.email);
    if (b.phone) params.append('phone', b.phone);
    params.append('redirect_url', `${appUrl}/pages/payment-confirmation.html?status=success&provider=instamojo`);
    params.append('send_email', 'false');
    params.append('allow_repeated_payments', 'false');

    const resp = await fetch(`${base}/payment-requests/`, {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey, 'X-Auth-Token': authToken, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    const data = await resp.json();
    if (!resp.ok || !data.success) return res.status(502).json({ error: 'Instamojo error', message: JSON.stringify(data.message || data) });
    res.json({ status: 'success', id: data.payment_request.id, url: data.payment_request.longurl });
  } catch (error) {
    console.error('Instamojo error:', error);
    res.status(500).json({ error: 'Failed to create Instamojo payment', message: error.message });
  }
});

// =====================================================
// PayU — build signed params for the hosted checkout (auto-submitted client-side)
// =====================================================
router.post('/payu/create', verifyToken, async (req, res) => {
  try {
    const crypto = require('crypto');
    const key = process.env.PAYU_MERCHANT_KEY, salt = process.env.PAYU_SALT;
    const action = process.env.PAYU_BASE || 'https://secure.payu.in/_payment';
    if (!key || !salt) return res.status(503).json({ error: 'PayU not configured', message: 'PAYU_MERCHANT_KEY / PAYU_SALT are not set on the server.' });

    const b = req.body || {};
    const amount = Number(b.amount);
    if (!amount || amount <= 0) return res.status(400).json({ error: 'A valid amount is required' });
    const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'https://bloocrm.com';

    const txnid = 'BLOO' + Date.now() + Math.floor(Math.random() * 1000);
    const productinfo = `${b.planName || 'Bloo CRM Plan'} (${b.billingCycle || 'subscription'})`;
    const firstname = (b.name || 'Customer').split(' ')[0];
    const email = b.email || '';
    const amt = amount.toFixed(2);
    // PayU hash: sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt)
    const hashString = [key, txnid, amt, productinfo, firstname, email, '', '', '', '', '', '', '', '', '', '', salt].join('|');
    const hash = crypto.createHash('sha512').update(hashString).digest('hex');

    res.json({
      status: 'success',
      action,
      params: {
        key, txnid, amount: amt, productinfo, firstname, email,
        phone: b.phone || '',
        surl: `${appUrl}/pages/payment-confirmation.html?status=success&provider=payu&txnid=${txnid}`,
        furl: `${appUrl}/index.html#pricing`,
        hash
      }
    });
  } catch (error) {
    console.error('PayU error:', error);
    res.status(500).json({ error: 'Failed to create PayU payment', message: error.message });
  }
});

// Verify a completed Stripe Checkout Session and activate the plan
router.get('/stripe/verify-session', verifyToken, async (req, res) => {
  try {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return res.status(503).json({ error: 'Stripe not configured' });
    const sid = req.query.session_id;
    if (!sid) return res.status(400).json({ error: 'session_id is required' });

    const resp = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sid)}`, {
      headers: { Authorization: `Bearer ${key}` }
    });
    const s = await resp.json();
    if (!resp.ok) return res.status(502).json({ error: 'Stripe lookup failed', message: (s.error && s.error.message) });

    const paid = s.payment_status === 'paid' || s.status === 'complete';
    const plan = s.metadata && s.metadata.plan;
    const billingCycle = (s.metadata && s.metadata.billingCycle) || 'monthly';
    let planActivated = false;

    if (paid && plan) {
      const user = await User.findById(req.userId);
      if (user) {
        user.plan = plan;
        user.planStartDate = new Date();
        user.planExpiryDate = new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000);
        user.subscriptionStatus = 'active';
        await user.save();
        planActivated = true;
      }
    }
    res.json({ status: 'success', paid, plan, billingCycle, amountTotal: s.amount_total, currency: s.currency, planActivated });
  } catch (error) {
    console.error('verify-session error:', error);
    res.status(500).json({ error: 'Verification failed', message: error.message });
  }
});

// Stripe webhook (production closed loop). Raw body is set in server.js.
router.post('/stripe/webhook', async (req, res) => {
  try {
    const crypto = require('crypto');
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    const raw = req.body; // Buffer (see server.js raw parser)
    let event;

    if (secret && Buffer.isBuffer(raw)) {
      const sig = req.headers['stripe-signature'] || '';
      const parts = Object.fromEntries(sig.split(',').map(kv => kv.split('=')));
      const signed = `${parts.t}.${raw.toString('utf8')}`;
      const expected = crypto.createHmac('sha256', secret).update(signed).digest('hex');
      if (!parts.v1 || !crypto.timingSafeEqual(Buffer.from(parts.v1), Buffer.from(expected))) {
        return res.status(400).json({ error: 'Invalid signature' });
      }
      event = JSON.parse(raw.toString('utf8'));
    } else {
      event = Buffer.isBuffer(raw) ? JSON.parse(raw.toString('utf8')) : raw;
    }

    if (event && event.type === 'checkout.session.completed') {
      const s = event.data.object;
      const uid = s.metadata && s.metadata.userId;
      const plan = s.metadata && s.metadata.plan;
      const billingCycle = (s.metadata && s.metadata.billingCycle) || 'monthly';
      if (uid && plan) {
        const user = await User.findById(uid);
        if (user) {
          user.plan = plan;
          user.planStartDate = new Date();
          user.planExpiryDate = new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000);
          user.subscriptionStatus = 'active';
          await user.save();
          console.log('Stripe webhook: activated', plan, 'for user', uid);
        }
      }
    }
    res.json({ received: true });
  } catch (e) {
    console.error('Stripe webhook error:', e.message);
    res.status(400).json({ error: 'Webhook error', message: e.message });
  }
});

module.exports = router;
