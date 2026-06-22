# Bloo CRM Payment Flow - Setup & Testing Guide

## 🔧 What Was Fixed

### 1. **API Base URL Issues** ✅
The frontend pages were using relative URLs (`/api/payments/initiate`) which don't work when accessing files via `file://` protocol. Fixed by adding explicit API base URL:

**Files Updated:**
- `bloo-crm/frontend/js/payments.js` - Added `API_BASE_URL = 'http://localhost:5000/api'`
- `bloo-crm/frontend/pages/payment-otp.html` - Added `API_BASE_URL = 'http://localhost:5000/api'`
- `bloo-crm/backend/server.js` - Enhanced CORS configuration to allow localhost on multiple ports

### 2. **Fetch Calls Updated** ✅
All fetch requests now use the full API URL:

**payments.js Changes:**
```javascript
// BEFORE (Broken)
fetch('/api/payments/initiate', ...)

// AFTER (Fixed)
fetch(`${API_BASE_URL}/payments/initiate`, ...)
```

Same fix applied to:
- `/api/payments/verify`
- `/api/payments/paypal-callback`

**payment-otp.html Changes:**
```javascript
// BEFORE (Broken)
fetch('/api/payments/verify-otp', ...)
fetch('/api/payments/resend-otp', ...)

// AFTER (Fixed)
fetch(`${API_BASE_URL}/payments/verify-otp`, ...)
fetch(`${API_BASE_URL}/payments/resend-otp`, ...)
```

### 3. **CORS Configuration** ✅
Enhanced CORS in `server.js` to:
- Allow requests from localhost on any port (3000, 5000, 8000, 8080)
- Support `file://` protocol for local development
- Include all necessary HTTP methods: GET, POST, PUT, DELETE, PATCH
- Set proper headers: Content-Type, Authorization, X-Requested-With

---

## 🚀 Complete Payment Flow

### Step-by-Step Process:

1. **User selects plan** (in Pricing & Payments section)
   - Click "Proceed to Payment" on any pricing card
   - Routes to: `payment.html?plan=basic`

2. **User enters billing details** (payment.html)
   - Full Name, Email, Phone
   - Billing Address (City, State, Country, ZIP)
   - Select Payment Method (Razorpay or PayPal)
   - Click "Proceed to Payment" button

3. **Backend creates order** (/api/payments/initiate)
   - Validates plan and billing cycle
   - Creates Order in MongoDB
   - Generates 6-digit OTP
   - Sends OTP to phone number
   - Returns orderId and payment details

4. **OTP verification** (payment-otp.html)
   - Shows masked phone number
   - User enters 6-digit OTP
   - Has 3 attempts
   - Can resend OTP (30-second cooldown)
   - Calls /api/payments/verify-otp

5. **OTP verified** (/api/payments/verify-otp)
   - Validates OTP (5-minute expiry)
   - Marks order as OTP verified
   - Returns verification token
   - Redirects to payment.html?verified=true

6. **Payment gateway** (Razorpay or PayPal)
   - Auto-opens after OTP verification
   - User completes payment
   - Razorpay: Calls /api/payments/verify
   - PayPal: Calls /api/payments/paypal-callback

7. **Payment confirmation** (payment-confirmation.html)
   - Shows order details
   - Displays transaction ID
   - Updates user subscription

---

## 📋 Prerequisites Before Testing

### Backend Setup

1. **Install dependencies:**
   ```bash
   cd bloo-crm/backend
   npm install
   ```

2. **Create .env file** in backend root:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/bloo-crm
   JWT_SECRET=your-secret-key-here
   NODE_ENV=development
   
   # Razorpay
   RAZORPAY_KEY_ID=your-razorpay-key-id
   RAZORPAY_KEY_SECRET=your-razorpay-secret
   
   # PayPal
   PAYPAL_MODE=sandbox
   PAYPAL_CLIENT_ID=your-paypal-client-id
   PAYPAL_CLIENT_SECRET=your-paypal-secret
   
   # Frontend URL (for payment redirects)
   FRONTEND_URL=http://localhost:3000
   ```

3. **Ensure MongoDB is running:**
   ```bash
   # On Windows
   mongod
   
   # Or use MongoDB Atlas (cloud)
   # Just update MONGODB_URI in .env
   ```

4. **Start backend server:**
   ```bash
   npm run dev
   # Or: npm start
   ```
   
   Expected output:
   ```
   ✓ Server running on port 5000
   ✓ API Version: 1.0.0
   ✓ Health check: GET /health
   ```

### Frontend Setup

1. **Start a local web server** (DO NOT open HTML files directly with file://)
   
   **Option A: Use Python:**
   ```bash
   cd bloo-crm/frontend
   python -m http.server 8000
   # Access at: http://localhost:8000
   ```

   **Option B: Use Node.js http-server:**
   ```bash
   npm install -g http-server
   cd bloo-crm/frontend
   http-server -p 8000
   # Access at: http://localhost:8000
   ```

   **Option C: Use VS Code Live Server Extension:**
   - Right-click index.html → "Open with Live Server"

---

## ✅ Testing Checklist

### Test 1: Payment Form Loading
- [ ] Navigate to `http://localhost:8000/index.html`
- [ ] Switch to "Pricing & Payments" tab
- [ ] Click "Proceed to Payment" on any plan
- [ ] Should redirect to payment.html with plan parameter
- [ ] Billing form should load correctly

### Test 2: Order Creation & OTP Sending
- [ ] Fill billing form with test data:
  - Name: Test User
  - Email: test@example.com
  - Phone: 9999999999 (or any 10-digit number)
  - Country: India
- [ ] Select Payment Method: Razorpay
- [ ] Click "Proceed to Payment" button
- [ ] Check browser console for errors (F12 → Console)
- [ ] Should redirect to payment-otp.html
- [ ] Phone number should appear masked (****9999)

### Test 3: OTP Verification
- [ ] Check backend console for OTP: `OTP XXXX sent to 9999999999`
- [ ] Enter OTP in payment-otp.html (6 digits)
- [ ] Click "Verify OTP" button
- [ ] Should show success message
- [ ] Should redirect back to payment.html?verified=true

### Test 4: Payment Gateway
- [ ] After OTP verification, Razorpay checkout should open
- [ ] Use Razorpay test card:
  - Card Number: 4111111111111111
  - Expiry: Any future date (e.g., 12/25)
  - CVV: 123
  - Name: Any name
- [ ] Complete payment
- [ ] Should redirect to payment-confirmation.html

### Test 5: Error Handling
- [ ] Wrong OTP: Should show "Invalid OTP" error
- [ ] Expired OTP: After 5 minutes, should show "OTP expired"
- [ ] Max attempts: After 3 wrong attempts, should block
- [ ] Network error: Should show appropriate error message

---

## 🔧 Troubleshooting

### Problem: "Cannot POST /api/payments/initiate"
**Solution:** 
- Backend server not running
- Wrong API_BASE_URL in payments.js
- Check: `http://localhost:5000/health` returns OK

### Problem: "CORS error"
**Solution:**
- Verify backend CORS configuration allows your frontend URL
- Check network tab in DevTools (F12)
- Ensure backend is on port 5000

### Problem: "Authorization token not found"
**Solution:**
- User must be logged in before accessing payment
- Token stored in sessionStorage: `authToken`
- Check: `sessionStorage.getItem('authToken')`

### Problem: OTP not sending
**Solution:**
- Check backend console for OTP (it's logged there)
- SMS service not integrated yet (logs to console only)
- In production, integrate with: Twilio, AWS SNS, or MessageBird

### Problem: Payment gateway not opening
**Solution:**
- Check Razorpay/PayPal keys in .env
- Verify OTP was verified successfully
- Check sessionStorage has `otpVerified = 'true'`

---

## 📝 Environment Configuration

**For Testing (Dev Mode):**
```
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_test_secret
PAYPAL_MODE=sandbox
```

**For Production:**
```
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=your_live_secret
PAYPAL_MODE=live
```

---

## 🔐 Security Notes

1. **Never store payment keys in frontend** ✅
   - All payment gateway initialization done on backend
   - Frontend only sends user input, backend handles tokens

2. **OTP Validation** ✅
   - 5-minute expiry enforced
   - 3-attempt limit with progressive warnings
   - Phone number masked in display

3. **HTTPS Required in Production** ✅
   - Current setup uses HTTP for local development
   - Deploy with HTTPS enforced
   - Razorpay requires HTTPS in production

4. **Token Security** ✅
   - JWT tokens stored in sessionStorage (not localStorage)
   - Authorization header sent with all requests
   - Token refresh on expiry

---

## 📞 Support

If you encounter issues:

1. **Check browser console** (F12 → Console tab)
   - Look for fetch errors
   - Check API response status codes

2. **Check backend logs**
   - Watch terminal where backend is running
   - Look for request logs and errors

3. **Verify configuration**
   - API_BASE_URL matches backend port
   - .env file has all required variables
   - MongoDB is accessible

4. **Test API directly**
   - Use Postman or curl to test endpoints
   - Example: `GET http://localhost:5000/health`

---

## 🎉 Success!

When everything is working correctly:

✅ Pricing page loads
✅ "Select plan" redirects to payment.html  
✅ Payment form fills correctly
✅ OTP sent to phone and logged in backend console
✅ OTP verification succeeds
✅ Payment gateway opens
✅ Payment completes
✅ Confirmation page shows order details

You're ready to integrate real SMS service and production payment keys!
