/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   PAYMENT PROCESSING - FRONTEND
   ===================================================== */

// API Base URL - Update to match your backend server
const API_BASE_URL = '/api';

// Pricing configuration
const PLANS = {
  'basic': { name: 'BASIC Plan', monthly: 10, yearly: 100 },
  'swift-ai-plus': { name: 'SWIFT AI+ Plan', monthly: 50, yearly: 500 },
  'rocket-ai-plus': { name: 'ROCKET AI+ Plan', monthly: 100, yearly: 1000 }
};

let currentBillingCycle = 'monthly';
let selectedPlan = null;
let selectedPaymentMethod = null;

// Initialize payment page
document.addEventListener('DOMContentLoaded', () => {
  initializePaymentPage();
  populatePlanSelector();
  populateCustomerDetails();
  handleOTPVerifiedCallback();
});

// Initialize payment page elements
function initializePaymentPage() {
  // Get plan from URL parameters
  const params = new URLSearchParams(window.location.search);
  const planFromUrl = params.get('plan');
  const isVerified = params.get('verified') === 'true';

  if (planFromUrl && PLANS[planFromUrl]) {
    selectedPlan = planFromUrl;
    selectPlan(planFromUrl);
  }

  // If returning from OTP verification, auto-proceed to payment
  if (isVerified && sessionStorage.getItem('otpVerified') === 'true') {
    proceedToPaymentGateway();
  }
}

// Handle OTP verified callback and proceed with payment
function handleOTPVerifiedCallback() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('verified') === 'true' && sessionStorage.getItem('otpVerified') === 'true') {
    proceedToPaymentGateway();
  }
}

// Proceed to actual payment gateway (Razorpay or PayPal) after OTP verification
async function proceedToPaymentGateway() {
  const token = getAuthToken();
  const orderId = sessionStorage.getItem('paymentOrderId');
  const paymentDataStr = sessionStorage.getItem('paymentData');

  if (!orderId || !paymentDataStr || !token) {
    showError('Invalid payment session. Please start over.');
    setTimeout(() => window.location.href = 'payment.html', 2000);
    return;
  }

  try {
    const paymentData = JSON.parse(paymentDataStr);
    selectedPaymentMethod = sessionStorage.getItem('paymentMethod');

    if (selectedPaymentMethod === 'razorpay') {
      initializeRazorpayCheckout(paymentData, token, orderId);
    } else if (selectedPaymentMethod === 'paypal') {
      initializePayPalCheckout(paymentData, token, orderId);
    }
  } catch (error) {
    console.error('Payment gateway initialization error:', error);
    showError('Failed to initialize payment: ' + error.message);
    setTimeout(() => window.location.href = 'payment.html', 2000);
  }
}

// Populate plan selector
function populatePlanSelector() {
  const selector = document.getElementById('planSelector');
  selector.innerHTML = Object.entries(PLANS).map(([key, plan]) => {
    const price = plan[currentBillingCycle];
    return `
      <div class="plan-card" onclick="selectPlan('${key}')" data-plan="${key}">
        <div class="plan-name">${plan.name}</div>
        <div class="plan-price">₹${price}</div>
        <small>per ${currentBillingCycle === 'yearly' ? 'year' : 'month'}</small>
      </div>
    `;
  }).join('');

  if (selectedPlan) {
    document.querySelector(`[data-plan="${selectedPlan}"]`)?.classList.add('selected');
  }
}

// Switch billing cycle
function switchBilling(cycle) {
  currentBillingCycle = cycle;

  document.querySelectorAll('.billing-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.closest('.billing-btn').classList.add('active');

  populatePlanSelector();
  if (selectedPlan) {
    updateSummary();
  }
}

// Select plan
function selectPlan(planKey) {
  selectedPlan = planKey;

  document.querySelectorAll('.plan-card').forEach(card => {
    card.classList.remove('selected');
  });
  document.querySelector(`[data-plan="${planKey}"]`)?.classList.add('selected');

  updateSummary();
}

// Update order summary
function updateSummary() {
  if (!selectedPlan) return;

  const plan = PLANS[selectedPlan];
  const amount = plan[currentBillingCycle];

  document.getElementById('summaryPlan').textContent = plan.name;
  document.getElementById('summaryBilling').textContent = currentBillingCycle.charAt(0).toUpperCase() + currentBillingCycle.slice(1);
  document.getElementById('summaryAmount').textContent = `₹${amount}`;
  document.getElementById('summaryUnit').textContent = currentBillingCycle === 'yearly' ? 'year' : 'month';
  document.getElementById('totalAmount').textContent = `₹${amount}`;
}

// Update payment method UI
function updatePaymentUI() {
  const method = document.getElementById('paymentMethod').value;
  selectedPaymentMethod = method;

  if (!method) {
    document.getElementById('payBtn').disabled = true;
  } else {
    document.getElementById('payBtn').disabled = !selectedPlan;
  }
}

// Get JWT token from localStorage or session
function getAuthToken() {
  return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
}

// Populate customer details
function populateCustomerDetails() {
  const token = getAuthToken();

  if (token) {
    try {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      if (decoded.email) {
        document.getElementById('email').value = decoded.email;
      }
    } catch (e) {
      console.warn('Could not decode token');
    }
  }

  // Try to get from current user in storage
  try {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (user) {
      document.getElementById('fullName').value = user.name || '';
      document.getElementById('email').value = user.email || '';
      document.getElementById('phone').value = user.phone || '';
    }
  } catch (e) {
    console.warn('Could not load user data');
  }
}

// Validate form
function validatePaymentForm() {
  const errors = [];

  if (!selectedPlan) errors.push('Please select a plan');
  if (!selectedPaymentMethod) errors.push('Please select a payment method');
  if (!document.getElementById('fullName').value) errors.push('Full name is required');
  if (!document.getElementById('email').value) errors.push('Email is required');
  if (!document.getElementById('phone').value) errors.push('Phone number is required');

  if (errors.length > 0) {
    showError(errors.join(', '));
    return false;
  }

  return true;
}

// Show error message
function showError(message) {
  const errorDiv = document.getElementById('errorMessage');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  setTimeout(() => {
    errorDiv.style.display = 'none';
  }, 5000);
}

// Show success message
function showSuccess(message) {
  const successDiv = document.getElementById('successMessage');
  successDiv.textContent = message;
  successDiv.style.display = 'block';
}

// Show loading
function showLoading(show = true) {
  document.getElementById('loading').style.display = show ? 'block' : 'none';
  document.getElementById('paymentForm').style.display = show ? 'none' : 'block';
}

// Process payment - First step: Collect billing info and route to OTP verification
async function processPayment() {
  if (!validatePaymentForm()) return;

  const token = getAuthToken();
  if (!token) {
    showError('Please login to continue with payment');
    setTimeout(() => {
      window.location.href = '../../index.html#login';
    }, 2000);
    return;
  }

  showLoading(true);

  // --- Stripe: create a hosted Checkout Session and redirect to Stripe ---
  if (selectedPaymentMethod === 'stripe') {
    try {
      const resp = await fetch(`${API_BASE_URL}/payments/stripe/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          plan: selectedPlan,
          planName: (PLANS[selectedPlan] && PLANS[selectedPlan].name) || selectedPlan,
          amount: PLANS[selectedPlan][currentBillingCycle],
          billingCycle: currentBillingCycle,
          email: document.getElementById('email').value
        })
      });
      const data = await resp.json();
      if (!resp.ok || !data.url) throw new Error(data.message || data.error || 'Could not start Stripe checkout');
      // Hand off to Stripe's hosted page for the charge
      window.location.href = data.url;
      return;
    } catch (e) {
      showLoading(false);
      showError(e.message || 'Stripe checkout failed');
      return;
    }
  }

  try {
    const customerDetails = {
      name: document.getElementById('fullName').value,
      email: document.getElementById('email').value,
      phone: document.getElementById('phone').value,
      billingAddress: {
        city: document.getElementById('city').value,
        state: document.getElementById('state').value,
        country: document.getElementById('country').value,
        zipCode: document.getElementById('zipCode').value
      },
      paymentSubMethod: selectedPaymentMethod === 'razorpay' ? 'card' : 'account'
    };

    // Store customer details in session for use after OTP verification
    sessionStorage.setItem('customerDetails', JSON.stringify(customerDetails));

    // Initiate payment order with backend
    const response = await fetch(`${API_BASE_URL}/payments/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        plan: selectedPlan,
        billingCycle: currentBillingCycle,
        paymentMethod: selectedPaymentMethod,
        customerDetails: customerDetails
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Payment initiation failed');
    }

    const data = await response.json();
    const orderId = data.data.orderId;

    // Store payment data in session for OTP verification page
    sessionStorage.setItem('paymentPlan', selectedPlan);
    sessionStorage.setItem('paymentBillingCycle', currentBillingCycle);
    sessionStorage.setItem('paymentAmount', data.data.amount);
    sessionStorage.setItem('paymentMethod', selectedPaymentMethod);
    sessionStorage.setItem('paymentOrderId', orderId);
    sessionStorage.setItem('paymentPhone', customerDetails.phone);
    sessionStorage.setItem('paymentCustomerId', data.data.customerId);
    sessionStorage.setItem('paymentData', JSON.stringify(data.data));

    showLoading(false);
    showSuccess('Payment details saved. Redirecting to OTP verification...');

    // Redirect to OTP verification page
    setTimeout(() => {
      const otpPageUrl = `payment-otp.html?orderId=${orderId}&phone=${encodeURIComponent(customerDetails.phone)}`;
      window.location.href = otpPageUrl;
    }, 1500);

  } catch (error) {
    console.error('Payment error:', error);
    showError(error.message);
    showLoading(false);
  }
}

// Initialize Razorpay checkout
function initializeRazorpayCheckout(paymentData, token, orderId) {
  const options = {
    key: paymentData.razorpayKeyId,
    amount: paymentData.amount,
    currency: 'INR',
    name: 'Bloo CRM',
    description: paymentData.description,
    order_id: paymentData.razorpayOrderId,
    prefill: paymentData.prefill,
    handler: function (response) {
      verifyRazorpayPayment(response, token, orderId);
    },
    modal: {
      ondismiss: function () {
        showLoading(false);
        showError('Payment cancelled. Please try again.');
      }
    },
    theme: {
      color: '#667eea'
    }
  };

  const rzp = new Razorpay(options);
  rzp.open();
}

// Verify Razorpay payment
async function verifyRazorpayPayment(response, token, orderId) {
  showLoading(true);

  try {
    const verifyResponse = await fetch(`${API_BASE_URL}/payments/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        razorpayOrderId: response.razorpay_order_id,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature,
        orderId: orderId
      })
    });

    if (!verifyResponse.ok) {
      const errorData = await verifyResponse.json();
      throw new Error(errorData.error || 'Payment verification failed');
    }

    const verifyData = await verifyResponse.json();

    // Update user plan in localStorage
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (user) {
      user.plan = verifyData.data.plan;
      localStorage.setItem('currentUser', JSON.stringify(user));
    }

    showLoading(false);
    showSuccess('Payment successful! Redirecting to confirmation...');

    setTimeout(() => {
      window.location.href = `../pages/payment-confirmation.html?orderId=${verifyData.data.orderId}&status=success`;
    }, 2000);

  } catch (error) {
    console.error('Verification error:', error);
    showError('Payment verification failed: ' + error.message);
    showLoading(false);
  }
}

// Initialize PayPal checkout
function initializePayPalCheckout(paymentData, token, orderId) {
  // PayPal payment link
  if (paymentData.approvalUrl) {
    // Store order ID for callback
    sessionStorage.setItem('paypalOrderId', orderId);
    window.location.href = paymentData.approvalUrl;
  } else {
    showError('Failed to initialize PayPal payment');
    showLoading(false);
  }
}

// Handle PayPal callback (called on return URL)
function handlePayPalCallback() {
  const params = new URLSearchParams(window.location.search);
  const paymentId = params.get('paymentId');
  const PayerID = params.get('PayerID');
  const orderId = sessionStorage.getItem('paypalOrderId');
  const token = getAuthToken();

  if (paymentId && PayerID && orderId && token) {
    showLoading(true);

    fetch(`${API_BASE_URL}/payments/paypal-callback?paymentId=${paymentId}&PayerID=${PayerID}&orderId=${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => res.json())
    .then(data => {
      if (data.data?.status === 'completed') {
        const user = JSON.parse(localStorage.getItem('currentUser'));
        if (user) {
          user.plan = data.data.plan;
          localStorage.setItem('currentUser', JSON.stringify(user));
        }
        window.location.href = `../pages/payment-confirmation.html?orderId=${data.data.orderId}&status=success`;
      } else {
        showError('Payment failed');
        showLoading(false);
      }
    })
    .catch(error => {
      showError('Payment processing failed: ' + error.message);
      showLoading(false);
    });
  }
}

// Check if we're on payment callback page
if (window.location.pathname.includes('payment-callback')) {
  document.addEventListener('DOMContentLoaded', handlePayPalCallback);
}
