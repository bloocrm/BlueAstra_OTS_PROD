# Credential Storage Migration - Verification Guide

## Summary of Changes

### ✅ Files Modified

1. **bloo-crm/frontend/index.html**
   - Added `<script src="js/api-client.js"></script>` before auth.js
   - Ensures SecureApiClient is available for authentication API calls

2. **bloo-crm/frontend/js/auth.js** (Complete rewrite)
   - Initialize SecureApiClient at top: `const apiClient = new SecureApiClient('/api');`
   - `handleLogin()`: Calls `POST /api/auth/login` instead of checking localStorage
   - `handleRegister()`: Calls `POST /api/auth/register` instead of storing locally
   - `handleLogout()`: Calls `POST /api/auth/logout` and clears JWT tokens
   - Page load check: Verifies JWT token with backend `/api/auth/profile`
   - Stores only non-sensitive user data (id, name, email, company, plan) in localStorage
   - JWT tokens stored in sessionStorage (cleared when browser closes)

3. **bloo-crm/frontend/js/storage.js**
   - `importData()`: Removed `password: user.password` line
   - Passwords never included in data export/import

---

## Security Improvements

| Issue | Before | After |
|-------|--------|-------|
| Password Storage | Plain text in localStorage | Bcrypt hashed on MongoDB |
| Credential Validation | Client-side only | Server-side with database |
| Token Type | None | JWT with 7-day expiry |
| Session Management | Persists across browser close | SessionStorage (auto-clears) |
| Account Lockout | None | 5 failed attempts = 30-min lockout |
| Email Validation | None | Server enforces uniqueness |
| Password Requirements | Client only | Server validates minlength |

---

## Testing Checklist

### 1. Registration Flow
- [ ] Open http://localhost:8000 (or your frontend URL)
- [ ] Click "Sign Up"
- [ ] Enter test data:
  - Name: `Test User`
  - Email: `test@example.com`
  - Phone: `1234567890`
  - Password: `SecurePassword123`
  - Company: `Test Company`
  - Plan: Select any plan
- [ ] Submit form
- [ ] Verify:
  - Console shows `POST /api/auth/register` request
  - Success notification displayed
  - Dashboard loads with user profile
  - `sessionStorage` has `authToken`, `refreshToken`, `tokenExpiresAt`
  - `localStorage` has `currentUser` (without password field)

### 2. Login Flow
- [ ] Logout (or open new browser session)
- [ ] Click "Login"
- [ ] Enter credentials:
  - Email: `test@example.com`
  - Password: `SecurePassword123`
- [ ] Verify:
  - Console shows `POST /api/auth/login` request
  - Dashboard loads
  - Correct user name displayed
  - JWT token in sessionStorage

### 3. Failed Login Attempts
- [ ] Click "Login"
- [ ] Try 5 times with incorrect password
- [ ] Verify:
  - After 5 attempts: "Account locked" or "Too many attempts" message
  - Server enforces 30-minute lockout
  - Database shows `loginAttempts: 5` and `lockUntil` timestamp

### 4. Token Verification on Page Load
- [ ] Login successfully
- [ ] Refresh page (Ctrl+R)
- [ ] Verify:
  - No re-login required (token still valid)
  - `GET /api/auth/profile` request in console
  - Dashboard loads automatically
  - User profile preserved

### 5. Logout Flow
- [ ] Click Logout button in dashboard
- [ ] Verify:
  - `POST /api/auth/logout` request sent
  - `sessionStorage` is cleared (all auth tokens gone)
  - `localStorage` still has `currentUser` (will be cleared on next login)
  - Redirected to login form

### 6. Browser Storage Inspection

**Open DevTools → Application/Storage:**

**localStorage should contain:**
```
currentUser = {
  "id": "...",
  "name": "Test User",
  "email": "test@example.com",
  "company": "Test Company",
  "plan": "basic"
}
```
✅ NO password field

**sessionStorage should contain:**
```
authToken = "eyJhbGc..."
refreshToken = "eyJhbGc..."
tokenExpiresAt = "1234567890"
```
✅ ONLY JWT tokens, NO credentials

### 7. Cross-Session Test
- [ ] Login and note the sessionStorage token
- [ ] Close browser completely (closes session)
- [ ] Reopen browser and go to http://localhost:8000
- [ ] Verify:
  - Login form displayed (sessionStorage cleared)
  - Must re-enter credentials

### 8. Database Verification

**Connect to MongoDB and check User collection:**

```javascript
db.users.findOne({ email: "test@example.com" })
```

Should show:
```javascript
{
  _id: ObjectId(...),
  name: "Test User",
  email: "test@example.com",
  password: "$2a$10$...",  // Bcrypt hash, NOT plain text
  phone: "1234567890",
  company: "Test Company",
  plan: "basic",
  loginAttempts: 0,
  lastLogin: ISODate(...),
  createdAt: ISODate(...),
  // ... other fields
}
```

✅ Password is bcrypt hashed (starts with `$2a$` or `$2b$`)

### 9. Network Security Test
- [ ] Open DevTools → Network tab
- [ ] Login
- [ ] Check POST /api/auth/login request:
  - ✅ Credentials sent in POST body (encrypted by HTTPS in production)
  - ✅ Response contains JWT token
  - ✅ Response contains user data (no password)

### 10. API Client Integration
- [ ] Perform any CRM operation (add client, create lead, etc.)
- [ ] Verify:
  - `Authorization: Bearer [token]` header in requests
  - Requests fail if logged out (no token)
  - Token auto-refreshes on expiry

---

## Common Issues & Troubleshooting

### Issue: "POST /api/auth/login returns 404"
**Solution:** Ensure backend server is running on port 5000
```bash
cd bloo-crm/backend
npm install
npm start
```

### Issue: "Cannot find variable SecureApiClient"
**Solution:** Verify api-client.js is loaded before auth.js in index.html
Check script order in index.html - api-client.js must come first

### Issue: "CORS error when calling backend"
**Solution:** Backend has CORS configured for localhost
- Check server.js has `cors` middleware configured
- Frontend must be on localhost (not 127.0.0.1 in some cases)

### Issue: "sessionStorage is empty after login"
**Solution:** Verify SecureApiClient.setToken() is called in handleLogin
Check browser console for errors and network tab for response

### Issue: "Database shows password in plain text"
**Solution:** Verify User model has password hashing middleware
Check backend/models/User.js has bcryptjs pre-save hook

---

## Rollback Instructions

If needed to revert these changes:

```bash
git revert HEAD
# or
git reset --hard HEAD~1
```

---

## Next Steps

1. **Verify all tests pass** - Run through the testing checklist
2. **Update password reset flow** - Add `/api/auth/forgot-password` endpoint if needed
3. **Add MFA support** - Backend ready for OTP/2FA implementation
4. **Implement remember-me** - Add longer-lived refresh tokens
5. **Add email verification** - Verify email on registration

---

## Security Notes

- ✅ Passwords never exposed in browser
- ✅ JWT tokens have 7-day expiry
- ✅ SessionStorage auto-clears on browser close
- ✅ Account lockout after 5 failed attempts
- ✅ HTTPS in production (configure reverse proxy)
- ✅ Bcrypt with salt=10 strength
- ⚠️ TODO: Add refresh token rotation for additional security
- ⚠️ TODO: Add IP-based rate limiting per account
