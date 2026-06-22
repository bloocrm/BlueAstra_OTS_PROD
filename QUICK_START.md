# ⚡ Quick Start - Payment Flow Testing

## 5-Minute Setup

### Step 1: Start Backend (Terminal 1)
```bash
cd bloo-crm/backend
npm install  # Only first time
npm run dev
```

Expected output:
```
✓ Server running on port 5000
✓ API Version: 1.0.0
```

### Step 2: Start Frontend (Terminal 2)
```bash
cd bloo-crm/frontend
python -m http.server 8000
```

Or use: `npx http-server -p 8000`

### Step 3: Open in Browser
```
http://localhost:8000/index.html
```

### Step 4: Test Payment Flow

1. **Navigate to Pricing**
   - Find "Pricing & Payments" tab on dashboard
   - Click "Proceed to Payment" on any plan

2. **Fill Form**
   - Name: Test User
   - Email: test@example.com  
   - Phone: 9999999999
   - Payment Method: Razorpay

3. **Click Proceed to Payment**
   - Page redirects to OTP verification

4. **Verify OTP**
   - Check backend terminal for line: `OTP XXXXXX sent to 9999999999`
   - Copy the OTP number
   - Paste into payment-otp.html
   - Click "Verify OTP"

5. **Complete Payment** 
   - Razorpay window opens
   - Test card: `4111 1111 1111 1111`
   - Any future expiry date
   - Any CVV (e.g., 123)

6. **Success Page**
   - Should redirect to payment-confirmation.html
   - Shows order details

---

## 🐛 Instant Fixes Applied

✅ **API URLs Fixed**
- Changed from `/api/payments/initiate` → `http://localhost:5000/api/payments/initiate`
- Applied to: payments.js, payment-otp.html

✅ **CORS Fixed**  
- Backend now accepts requests from localhost:3000-8080
- Allows file:// protocol for development

✅ **Backend Endpoints Ready**
- POST /api/payments/initiate → Creates order + sends OTP
- POST /api/payments/verify-otp → Verifies OTP
- POST /api/payments/resend-otp → Resends OTP
- POST /api/payments/verify → Verifies Razorpay payment

---

## 📁 Files Modified

```
bloo-crm/
├── frontend/
│   ├── js/
│   │   └── payments.js ✅ (Added API_BASE_URL, fixed fetch calls)
│   └── pages/
│       └── payment-otp.html ✅ (New OTP verification page)
└── backend/
    ├── server.js ✅ (Enhanced CORS)
    └── routes/
        └── payments.js ✅ (Added OTP endpoints)
```

---

## 🎯 What to Expect

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Select plan" | Redirects to payment.html?plan=basic |
| 2 | Fill form + click proceed | Redirects to payment-otp.html |
| 3 | Enter OTP | Shows "OTP verified successfully" |
| 4 | Razorpay opens | Shows payment form |
| 5 | Complete payment | Redirects to confirmation page |

---

## 🔑 Key API Endpoints

All endpoints now use: `http://localhost:5000/api`

```
POST /payments/initiate
- Creates order
- Sends OTP to phone
- Response: { orderId, customerId, amount, plan }

POST /payments/verify-otp  
- Validates OTP
- Response: { verified: true, verificationToken }

POST /payments/verify
- Verifies Razorpay payment
- Response: { orderId, status, plan }
```

---

## ✅ Verification Checklist

```
[ ] Backend running on http://localhost:5000
[ ] Frontend running on http://localhost:8000
[ ] Can load index.html without errors
[ ] Pricing page shows correctly
[ ] "Select plan" button works
[ ] payment.html loads with plan parameter
[ ] Billing form is visible
[ ] "Proceed to Payment" button works
[ ] Redirects to payment-otp.html
[ ] Phone number appears masked
[ ] OTP input fields visible
[ ] Backend console shows "OTP XXXXX sent to..."
[ ] Entering OTP and clicking verify works
[ ] Redirects to payment.html?verified=true
[ ] Razorpay window appears
[ ] Payment can be completed
[ ] Confirmation page shows
```

---

## 🚨 If Anything Breaks

1. **Refresh all terminals** (Ctrl+C, run again)
2. **Clear browser cache** (Ctrl+Shift+Delete)
3. **Check browser console** (F12)
4. **Check backend logs** in terminal
5. **Verify ports are open**: 5000 (backend), 8000 (frontend)

---

## 🎉 You're Ready!

The broken payment links are now **FIXED** and fully functional!

Next Steps:
- Integrate real SMS service for OTP (currently logs to console)
- Add Razorpay production keys to .env
- Deploy to production with HTTPS
