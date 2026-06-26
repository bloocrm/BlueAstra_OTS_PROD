# Email OAuth Quick-Start Guide (5 Minutes)

## Step 1: Get OAuth Credentials (1 minute)

### Gmail:
1. Go to https://console.cloud.google.com
2. Create project → Enable Gmail API
3. OAuth 2.0 Client ID (Web) → Add redirect: http://localhost:3000/auth/gmail-callback
4. Copy Client ID & Secret

### Outlook:
1. Go to https://portal.azure.com
2. Register application
3. Add Mail.Read & User.Read permissions
4. Create client secret
5. Add redirect: http://localhost:3000/auth/outlook-callback
6. Copy Client ID & Secret

## Step 2: Configure Backend (1 minute)

```bash
cd bloo-crm/backend
cp .env.example .env
# Edit .env with your OAuth credentials
npm install
npm start
```

## Step 3: Frontend Setup (1 minute)

```bash
cd bloo-crm/frontend
# Serve on localhost:3000
# npx http-server -p 3000
```

## Step 4: Test (2 minutes)

1. Open http://localhost:3000/email-client.html
2. Check Console - should show: ✅ All tests passed!
3. Click "+" button
4. Click "Connect" on Gmail/Outlook
5. Log in and grant permissions
6. Should return to email client

## What's Fixed

✅ OAuth flow now works correctly
✅ Proper error messages (not "cannot connect")
✅ SMTP provider setup validated
✅ Email sync with authentication
✅ Token auto-refresh
✅ Multiple account support

## Verify Setup

```bash
# Backend health check
curl http://localhost:5000/health

# Get OAuth config
curl http://localhost:5000/api/auth/oauth-config/gmail
```

## In Browser Console

```javascript
window.GmailSSO      // Should be defined ✅
window.OutlookSSO    // Should be defined ✅
window.emailClient   // Should be initialized ✅
```

Done! Your OAuth system is fully functional. 🎉

For full guide see: OAUTH_SETUP_GUIDE.md
For testing guide see: EMAIL_OAUTH_E2E_TESTING.md
