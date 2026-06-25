# Authentication Fix - 405 Error Resolution

## Issues Found & Fixed

### 1. **CORS Configuration Issues**
**Problem:** Browser was blocking requests due to CORS configuration
- Missing `OPTIONS` method in allowed methods
- Missing `optionsSuccessStatus` header
- Incorrect origin validation logic
- **Files Fixed:** `bloo-crm/backend/server.js`

**Fix Applied:**
- Added `OPTIONS` to allowed methods
- Added explicit OPTIONS handler with `app.options('*', cors())`
- Improved origin validation to allow all localhost variants for development
- Set proper `optionsSuccessStatus: 200`

### 2. **Missing API Client Initialization**
**Problem:** `apiClient` was not initialized in `index.html`
- Meeting room and other modules depend on global `apiClient`
- Undefined reference causes authentication failures
- **File Fixed:** `bloo-crm/frontend/index.html`

**Fix Applied:**
- Added inline script to initialize `SecureApiClient`
- Proper error handling if client library isn't loaded
- Verification logging

### 3. **API Endpoint Issues**
**Status:** ✅ Verified Working
- Backend auth routes properly defined at `/api/auth/login`, `/api/auth/register`
- Frontend API client correctly constructs full URLs with `/api` prefix
- Routes are properly mounted in server.js

## How to Fix the 405 Error

### Step 1: Restart Backend Server
```bash
cd bloo-crm/backend
npm start
```

Wait for output:
```
✓ Server running on port 5000
✓ API Endpoints available
```

### Step 2: Clear Browser Cache
1. Open Developer Tools (F12)
2. Go to Application/Storage tab
3. Clear localStorage and sessionStorage
4. Clear cache (Shift + Ctrl + Delete)
5. Refresh page (Ctrl + Shift + R for hard refresh)

### Step 3: Test Authentication
1. Open `http://localhost:3000/` in browser
2. Check browser console (F12 → Console tab)
3. Look for: `"API Client initialized: /api"`
4. Try logging in with test credentials

### Step 4: Verify Backend Connectivity
1. Open `http://localhost:5000/health` in browser
2. Should show: `{"status":"OK",...}`
3. Open `http://localhost:5000/api/version` in browser
4. Should show: `{"version":"1.0.0",...}`

## Testing the Login System

### Create a Test User
1. Click "Sign Up" on login page
2. Fill in:
   - Name: Test User
   - Email: test@example.com
   - Password: TestPass123
   - Company: Test Corp
   - Plan: Basic
3. Click "Sign Up"
4. Should see success notification

### Login with Test User
1. Click "Authenticate & Login"
2. Enter: test@example.com / TestPass123
3. Should see dashboard load

## Browser Console Debugging

When logged in, open console (F12) and check for these messages:

```javascript
// Should see:
"API Client initialized: /api"
"User already logged in, loading dashboard"

// If errors, check for:
"SecureApiClient not loaded" - API client script failed to load
"ReferenceError: apiClient is not defined" - Initialization didn't run
```

## Network Debugging

To see the actual API requests:

1. Open Developer Tools (F12)
2. Go to Network tab
3. Try login
4. Look for:
   - ✅ Request to `/api/auth/login` - should be Status 200
   - ✅ Request OPTIONS preflight - should be Status 200
   - ✅ Authentication headers present

### If you see 405 Error:
- The OPTIONS preflight failed - check CORS settings
- The POST route isn't registered - check backend server.js
- Wrong HTTP method - check frontend API client

## Backend Verification

Run these commands to verify backend is working:

```bash
# Test health endpoint
curl http://localhost:5000/health

# Test API version
curl http://localhost:5000/api/version

# Test CORS with OPTIONS
curl -X OPTIONS http://localhost:5000/api/auth/login \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST"
```

## Environment Variables Checklist

Verify these are set in `bloo-crm/backend/.env`:

```bash
# MongoDB connection
MONGODB_URI=mongodb://localhost:27017/bloo-crm

# JWT Configuration
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d

# Server Configuration  
PORT=5000
NODE_ENV=development

# Webex (optional, for meeting features)
WEBEX_API_TOKEN=your-token
WEBEX_API_BASE_URL=https://webexapis.com/v1
```

## Common Issues & Solutions

### Issue: "Connection refused" error
**Cause:** Backend server not running
**Solution:** Start backend with `npm start` in `bloo-crm/backend/`

### Issue: "CORS error - Not allowed by CORS"
**Cause:** Origin not in allowed list
**Solution:** 
1. Check `bloo-crm/backend/server.js` CORS config
2. Verify you're using `localhost` not `127.0.0.1` (or vice versa)
3. Check port matches (should be :3000 for frontend)

### Issue: "Cannot find module 'mongoose'"
**Cause:** Dependencies not installed
**Solution:** Run `npm install` in `bloo-crm/backend/`

### Issue: "MongoServerError: connect ECONNREFUSED"
**Cause:** MongoDB not running
**Solution:** 
1. Start MongoDB: `mongod`
2. Or update `MONGODB_URI` in `.env` to use MongoDB Atlas

### Issue: Form submission hangs/does nothing
**Cause:** JavaScript error in auth.js
**Solution:**
1. Open console (F12)
2. Look for red error messages
3. Check that auth.js is loaded (check Network tab)

### Issue: Dashboard loads but no data shows
**Cause:** API client token not being set properly
**Solution:**
1. Check Application → SessionStorage for `authToken`
2. Verify token is present after login
3. Check API responses in Network tab

## Files Modified

✅ `bloo-crm/backend/server.js`
- Improved CORS configuration
- Added OPTIONS handler
- Better origin validation

✅ `bloo-crm/frontend/index.html`
- Added apiClient initialization
- Added verification logging
- Proper error handling

## Next Steps

1. **Restart Backend:** `cd bloo-crm/backend && npm start`
2. **Hard Refresh Frontend:** Ctrl+Shift+R
3. **Test Login:** Use test credentials
4. **Monitor Console:** Check F12 console for errors
5. **Check Network:** Monitor API requests in Network tab

## Support

If authentication is still not working:

1. **Check Backend Logs:** Look at `npm start` output
2. **Check Browser Console:** F12 → Console tab
3. **Check Network Requests:** F12 → Network tab
4. **Verify MongoDB:** Ensure MongoDB is running
5. **Try Different Browser:** Rule out browser cache issues

---

**Authentication Status:** ✅ Fixed and Ready to Test
