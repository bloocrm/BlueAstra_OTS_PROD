# Email Authentication End-to-End Testing Guide

## Test Environment Setup

### Prerequisites
- Backend server running on `http://localhost:5000`
- Frontend running on `http://localhost:3000` (or your dev server)
- OAuth credentials configured in `.env` file
- Browser console open (F12)

### Required Setup

```bash
# 1. Backend Setup
cd bloo-crm/backend
cp .env.example .env
# Update .env with your OAuth credentials

npm install
npm start
# Should see: ✓ Server running on port 5000

# 2. Frontend Setup
cd bloo-crm/frontend
# Serve on localhost:3000 or your dev server
```

---

## Test Cases

### TC-01: OAuth Base Class Initialization

**Objective:** Verify OAuth base class initializes correctly

**Steps:**
1. Open browser console
2. Execute: `new OAuthBase('test-provider')`
3. Verify object has required properties

**Expected Result:**
```javascript
✅ providerId: 'test-provider'
✅ accessToken: null
✅ isLoggedIn: false
✅ Events system available
```

**Pass Criteria:** All properties initialized correctly

---

### TC-02: Gmail SSO Initialization

**Objective:** Verify Gmail SSO class loads and initializes

**Steps:**
1. Open email-client.html
2. Check browser console
3. Execute: `window.GmailSSO`

**Expected Result:**
```
✅ GmailSSO class defined
✅ Constructor completes
✅ Config loaded
```

**Pass Criteria:** GmailSSO class available in window

---

### TC-03: Outlook SSO Initialization

**Objective:** Verify Outlook SSO class loads and initializes

**Steps:**
1. Open email-client.html
2. Check browser console
3. Execute: `window.OutlookSSO`

**Expected Result:**
```
✅ OutlookSSO class defined
✅ Constructor completes  
✅ Config loaded
```

**Pass Criteria:** OutlookSSO class available in window

---

### TC-04: Add Email Account - Gmail OAuth Flow

**Objective:** Test complete Gmail OAuth authentication flow

**Steps:**
1. Open email-client.html
2. Click "+" button in Accounts section
3. Click "Connect" on Gmail provider
4. System should redirect to Google login
5. Log in with test Gmail account
6. Grant permissions when prompted
7. Should return to email-client after authorization

**Expected Result:**
```
✅ Redirected to Google login page
✅ User can grant permissions
✅ Redirected back with access token
✅ User email displayed in client
✅ Success toast notification
```

**Pass Criteria:** User authenticated and returned to email client

---

### TC-05: Add Email Account - Outlook OAuth Flow

**Objective:** Test complete Outlook OAuth authentication flow

**Steps:**
1. Open email-client.html
2. Click "+" button in Accounts section
3. Click "Connect" on Outlook provider
4. System should redirect to Microsoft login
5. Log in with test Outlook/Microsoft account
6. Grant permissions when prompted
7. Should return to email-client after authorization

**Expected Result:**
```
✅ Redirected to Microsoft login page
✅ User can grant permissions
✅ Redirected back with access token
✅ User email displayed in client
✅ Success toast notification
```

**Pass Criteria:** User authenticated and returned to email client

---

### TC-06: SMTP Provider Setup - Amazon SES

**Objective:** Test SMTP provider credential setup

**Steps:**
1. Open email-client.html
2. Click "+" button in Accounts section
3. Click "Setup" on Amazon SES in SMTP Sending Services
4. Enter AWS Access Key
5. Enter AWS Secret Key
6. Select Region
7. Click "Test Connection"
8. Should send test email
9. Click "Save & Continue"

**Expected Result:**
```
✅ Modal opens with provider form
✅ All required fields validated
✅ Test email sent successfully
✅ Credentials saved to database
✅ Success notification displayed
```

**Pass Criteria:** Credentials validated and stored

---

### TC-07: SMTP Provider Setup - Postmark

**Objective:** Test Postmark SMTP provider setup

**Steps:**
1. Open email-client.html
2. Click "+" button in Accounts section
3. Click "Setup" on Postmark in SMTP Sending Services
4. Enter Postmark Account Token
5. Enter Postmark Server Token
6. (Optional) Enter Server ID
7. Click "Test Connection"
8. Click "Save & Continue"

**Expected Result:**
```
✅ Form displays Postmark-specific fields
✅ Tokens validated on test
✅ Success notification
✅ Ready to send emails
```

**Pass Criteria:** Postmark credentials verified

---

### TC-08: SMTP Provider Setup - Mailgun

**Objective:** Test Mailgun SMTP provider setup

**Steps:**
1. Open email-client.html
2. Click "+" button in Accounts section
3. Click "Setup" on Mailgun in SMTP Sending Services
4. Enter Mailgun API Key
5. Enter Domain Name
6. Select Region (US/EU)
7. Click "Test Connection"
8. Click "Save & Continue"

**Expected Result:**
```
✅ Form displays Mailgun-specific fields
✅ Domain validated
✅ Region selection available
✅ Test successful
```

**Pass Criteria:** Mailgun credentials validated

---

### TC-09: Token Refresh Flow

**Objective:** Verify automatic token refresh when expired

**Steps:**
1. After authenticating with Gmail
2. In browser console, manipulate token:
   ```javascript
   const sso = window.emailClient.currentProvider;
   sso.tokenExpiresAt = Date.now() - 1000; // Expire token
   ```
3. Try to fetch emails
4. System should detect expired token and refresh

**Expected Result:**
```
✅ Expired token detected
✅ Automatic refresh attempted
✅ New token obtained
✅ Operation completes successfully
```

**Pass Criteria:** Token refreshed automatically

---

### TC-10: Multiple Account Management

**Objective:** Test managing multiple email accounts

**Steps:**
1. Connect Gmail account
2. Verify email appears in list
3. Click "+" and connect Outlook account
4. Verify both accounts appear
5. Switch between accounts using dropdown
6. Verify emails load for each account

**Expected Result:**
```
✅ Multiple accounts connected
✅ Can switch between accounts
✅ Correct emails load for each
✅ Account dropdown shows all accounts
```

**Pass Criteria:** Multiple accounts managed correctly

---

### TC-11: Logout and Re-authentication

**Objective:** Test logout and re-authentication flow

**Steps:**
1. After authenticating with Gmail
2. In console, execute: `window.emailClient.logout()`
3. Try to perform action requiring auth
4. System should require re-authentication
5. Click connect again
6. Go through OAuth flow again

**Expected Result:**
```
✅ Logout clears tokens
✅ Cannot access emails after logout
✅ Can re-authenticate
✅ New tokens obtained
```

**Pass Criteria:** Logout and re-auth work correctly

---

### TC-12: Error Handling - Invalid Credentials

**Objective:** Test error handling for invalid credentials

**Steps:**
1. In SMTP setup, enter invalid credentials
2. Click "Test Connection"
3. System should show error message
4. Error should be specific and helpful

**Expected Result:**
```
❌ Connection failed error displayed
❌ Error message explains issue
❌ User can correct and retry
```

**Pass Criteria:** Errors handled gracefully

---

### TC-13: Error Handling - Network Timeout

**Objective:** Test handling of network errors

**Steps:**
1. Stop backend server (`Ctrl+C`)
2. Try to connect email account
3. Should show connection error
4. Start server again
5. Try again - should work

**Expected Result:**
```
❌ Cannot connect error shown
❌ Helpful message about checking server
✅ Works again after server restart
```

**Pass Criteria:** Network errors handled gracefully

---

### TC-14: CORS Validation

**Objective:** Verify CORS is properly configured

**Steps:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Try to connect email account
4. Check Network tab for requests to localhost:5000
5. Verify no CORS errors in console

**Expected Result:**
```
✅ Requests to /api/auth/oauth-config
✅ Requests to /api/auth/oauth-callback  
✅ No CORS errors
✅ Proper Access-Control headers
```

**Pass Criteria:** No CORS errors, all headers correct

---

### TC-15: Unit Tests Pass

**Objective:** Verify all unit tests pass

**Steps:**
1. Open email-client.html in browser
2. Wait for page to load
3. Check console for test output
4. Should see: `🎉 All tests passed!`

**Expected Result:**
```
🧪 Starting Email Authentication Test Suite...
✅ PASS: OAuthBase class initialization
✅ PASS: Gmail OAuth Flow setup
✅ PASS: Outlook OAuth Flow setup
✅ PASS: Token expiration handling
...
🎉 All tests passed!
```

**Pass Criteria:** All tests pass with 100% success rate

---

## Regression Tests

### RT-01: Email Sync Still Works After OAuth Changes

**Steps:**
1. Connect email account
2. Click Sync button
3. Should fetch emails
4. Emails should display in list

**Expected Result:** ✅ Emails synced and displayed

### RT-02: SMTP Sending Still Works

**Steps:**
1. Connect SMTP provider
2. Compose new email
3. Send email
4. Should succeed

**Expected Result:** ✅ Email sent successfully

### RT-03: Calendar Sync Not Affected

**Steps:**
1. Open calendar view
2. Verify calendar providers still work
3. Sync calendar

**Expected Result:** ✅ Calendar works independently

---

## Performance Tests

### PT-01: OAuth Token Refresh Performance

**Objective:** Verify token refresh completes quickly

**Steps:**
1. Measure time to refresh token
2. Record in console: `console.time('refresh')`
3. Trigger refresh: `await sso.refreshAccessToken()`
4. Record time: `console.timeEnd('refresh')`

**Expected:** < 500ms

---

### PT-02: Concurrent Account Switching

**Objective:** Test quick switching between accounts

**Steps:**
1. Connect 3+ email accounts
2. Rapidly switch between them (10x)
3. Each should load emails quickly

**Expected:** < 1s per switch

---

## Accessibility Tests

### AT-01: OAuth Errors Are Visible

**Steps:**
1. Cause an OAuth error
2. Verify error message is visible
3. Verify error is readable
4. Verify user can take action

**Expected:** ✅ Clear, visible error handling

### AT-02: Modal Navigation

**Steps:**
1. Tab through provider selection modal
2. Should be able to select providers with keyboard
3. Should be able to submit forms with keyboard

**Expected:** ✅ Keyboard navigation works

---

## Test Execution Checklist

- [ ] All 15 main test cases passed
- [ ] All regression tests passed
- [ ] Performance meets expectations
- [ ] Accessibility verified
- [ ] Browser console has no errors
- [ ] Network requests are clean
- [ ] Tokens stored securely
- [ ] User feedback is clear
- [ ] Error messages are helpful
- [ ] Documentation updated

---

## Known Issues & Workarounds

### Issue: State Token Mismatch
**Workaround:** Clear sessionStorage and retry
```javascript
sessionStorage.clear();
location.reload();
```

### Issue: CORS Blocked
**Workaround:** Verify .env APP_URL matches frontend URL

### Issue: Token Refresh Loop
**Workaround:** Check JWT_SECRET matches between requests

---

## Test Report Template

```
Test Date: YYYY-MM-DD
Tester: [Name]
Environment: [Development/Staging/Production]
Browser: [Chrome/Firefox/Safari]

Test Results:
- OAuth Base Class: ✅ PASS / ❌ FAIL
- Gmail OAuth: ✅ PASS / ❌ FAIL
- Outlook OAuth: ✅ PASS / ❌ FAIL
- SMTP Setup: ✅ PASS / ❌ FAIL
- Token Refresh: ✅ PASS / ❌ FAIL
- Error Handling: ✅ PASS / ❌ FAIL

Overall Result: ✅ PASS / ❌ FAIL
Issues Found: [List any issues]
Notes: [Any additional notes]
```

---

## Running Tests Automatically

```bash
# In backend
npm test

# In frontend (if available)
npm run test:email-auth

# Or manually in browser console
const tester = new EmailAuthenticationTests();
await tester.runAllTests();
```

---

**Last Updated:** 2026-06-26
**Maintained By:** Bloo CRM Team
