# 🔧 Payment Page Not Loading - Troubleshooting Guide

## Quick Diagnostics

**Try these immediately:**

### 1. Open Browser Developer Tools
- Press **F12** or **Right-click → Inspect**
- Go to **Console** tab
- Look for any red error messages
- Share any errors you see

### 2. Check if Backend is Running
Open in browser:
```
http://localhost:5000/health
```
Should show:
```json
{
  "status": "OK",
  "message": "Bloo CRM Backend is running"
}
```

If this doesn't load, backend is not running.

### 3. Check if Frontend Server is Running
Open in browser:
```
http://localhost:8000/index.html
```
Should load the dashboard.

---

## Common Issues & Fixes

### ❌ Issue 1: Page Shows Blank / White Screen

**Cause:** JavaScript error preventing page load

**Fix:**
1. Press **F12** to open DevTools
2. Go to **Console** tab
3. Look for red error messages
4. Clear browser cache: **Ctrl+Shift+Delete**
5. Refresh: **Ctrl+F5** (hard refresh)

**Most common error:** 
```
TypeError: Cannot read property 'getElementById' of null
```

**Solution:** Wait for DOM to load - use `DOMContentLoaded` event

---

### ❌ Issue 2: "Select Plan" Button Doesn't Navigate

**Cause:** Navigation function not working

**Fix:**
1. Check backend console for logs
2. Verify you're logged in
3. Press F12 → Console → paste:
   ```javascript
   console.log(getCurrentUser());
   ```
4. If null/undefined, need to login first

---

### ❌ Issue 3: Can't Find Payment Page

**Cause:** Wrong URL or path issues

**Correct URLs:**
- Dashboard: `http://localhost:8000/index.html`
- Payment Form: `http://localhost:8000/pages/payment.html?plan=basic`
- OTP Page: `http://localhost:8000/pages/payment-otp.html`

**Test directly:**
```
http://localhost:8000/pages/payment.html?plan=basic
```

---

### ❌ Issue 4: API Not Responding

**Symptoms:**
- Network error when clicking "Proceed to Payment"
- Console shows CORS error
- Long loading time then fails

**Fix:**
1. **Check backend is running:**
   ```bash
   cd bloo-crm/backend
   npm run dev
   ```

2. **Check API_BASE_URL in payments.js:**
   - Should be: `http://localhost:5000/api`
   - NOT `/api/...` or `localhost:5000/api`

3. **Test API directly:**
   ```bash
   curl -X GET http://localhost:5000/health
   ```

---

### ❌ Issue 5: Network Tab Shows 404 Error

**Cause:** API endpoint not registered

**Fix:**
- Check `bloo-crm/backend/server.js` line 105-106
- Should have:
  ```javascript
  const paymentRoutes = require('./routes/payments');
  app.use('/api/payments', paymentRoutes);
  ```

---

## Step-by-Step Test

### Test 1: Navigation
```
1. Go to http://localhost:8000/index.html
2. Switch to "Pricing & Payments" tab
3. Click "Proceed to Payment" on any plan
4. Should redirect to: http://localhost:8000/pages/payment.html?plan=basic
```

**If stuck on step 3/4:**
- Check browser console (F12)
- Check backend console for logs
- Run: `console.log(getCurrentUser())` in browser console

### Test 2: Form Loads
```
1. Once on payment.html?plan=basic
2. You should see:
   - Plan selection cards
   - Billing form (Name, Email, Phone, etc)
   - Order summary section
   - "Proceed to Payment" button (should be enabled)
```

**If form doesn't show:**
- Hard refresh: Ctrl+F5
- Clear cache: Ctrl+Shift+Delete
- Check console for errors

### Test 3: Form Submission
```
1. Fill all required fields
2. Select payment method (Razorpay)
3. Click "Proceed to Payment"
4. Should redirect to payment-otp.html
```

**If stuck:**
- Check backend console for order creation errors
- Check network tab for failed requests
- Verify backend is running and accessible

---

## Debug Commands

**In Browser Console (F12):**

```javascript
// Check backend connectivity
fetch('http://localhost:5000/health')
  .then(r => r.json())
  .then(d => console.log('Backend OK:', d))
  .catch(e => console.log('Backend error:', e))

// Check user login status
console.log('Logged in as:', getCurrentUser())

// Check API base URL
console.log('API Base:', API_BASE_URL)

// Check stored tokens
console.log('Auth token:', sessionStorage.getItem('authToken'))
```

**In Backend Console:**

Should see logs like:
```
2024-06-22T10:30:45.123Z - POST /api/payments/initiate
2024-06-22T10:30:46.456Z - GET /api/clients
```

If not seeing logs, backend might not be running.

---

## Specific Error Messages & Solutions

### Error: "CORS policy: blocked by CORS policy"
```
→ Backend not accepting requests from your frontend URL
→ Check CORS in server.js allows your origin
→ Restart backend: npm run dev
```

### Error: "Fetch failed"
```
→ Backend server not running
→ Start backend: cd bloo-crm/backend && npm run dev
```

### Error: "Cannot POST /api/payments/initiate"
```
→ Payments route not registered
→ Check server.js has: app.use('/api/payments', paymentRoutes)
→ Restart backend
```

### Error: "Failed to initiate payment"
```
→ API returned error response
→ Check backend console for detailed error
→ Verify all required fields in form
→ Check JWT token is valid: sessionStorage.getItem('authToken')
```

---

## Checklist Before Testing

```
☐ Backend installed: npm install (in bloo-crm/backend)
☐ Backend running: npm run dev
☐ Frontend server running: python -m http.server 8000
☐ MongoDB running (if using local DB)
☐ No backend errors in console
☐ .env file configured with:
  - PORT=5000
  - MONGODB_URI=mongodb://localhost:27017/bloo-crm
  - JWT_SECRET=your-secret-key
☐ Browser cache cleared
☐ No browser extensions blocking requests
☐ Firewall not blocking ports 5000, 8000, 27017
```

---

## Final Nuclear Option

If nothing works:

**1. Kill everything:**
```bash
# Kill all node processes
taskkill /F /IM node.exe  # Windows
killall node                # Mac/Linux

# Or close all terminals and start fresh
```

**2. Clear everything:**
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules
rm -rf bloo-crm/backend/node_modules
rm -rf bloo-crm/frontend/node_modules

# Clear browser cache: Ctrl+Shift+Delete
```

**3. Start fresh:**
```bash
cd bloo-crm/backend
npm install
npm run dev

# New terminal:
cd bloo-crm/frontend
python -m http.server 8000

# Browser:
http://localhost:8000/index.html
```

---

## Need More Help?

When reporting issues, include:
1. **What URL are you trying to access?**
2. **What do you see on the page?** (blank, error, etc)
3. **Console errors** (F12 → Console tab)
4. **Network tab errors** (F12 → Network tab)
5. **Backend console output**
6. **Are backend and frontend both running?**

I'm here to help debug!
