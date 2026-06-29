# Email Service Provider Configuration & Setup Guide

## Complete Email Provider Setup

This guide covers configuration for all 6 email service providers integrated into Bloo CRM.

---

## 1. Gmail Setup ✅

### Step 1: Create Google Cloud Project
```
1. Go to: https://console.cloud.google.com
2. Click "Select a Project" → "New Project"
3. Name: "Bloo CRM Email"
4. Click "Create"
```

### Step 2: Enable APIs
```
1. Search for "Gmail API"
2. Click "Enable"
3. Search for "Google+ API"
4. Click "Enable"
```

### Step 3: Create OAuth Credentials
```
1. Go to: Credentials (left sidebar)
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. Choose: Web application
4. Authorized JavaScript origins:
   - http://localhost:3000
   - http://localhost:8000
   - https://yourdomain.com
5. Authorized redirect URIs:
   - http://localhost:3000/gmail-callback.html
   - http://localhost:8000/gmail-callback.html
   - https://yourdomain.com/gmail-callback.html
6. Copy Client ID and Client Secret
```

### Step 4: Store Credentials
```javascript
// In gmail-sso.js or via localStorage:
localStorage.setItem('gmailClientId', 'YOUR_CLIENT_ID.apps.googleusercontent.com');
localStorage.setItem('gmailClientSecret', 'YOUR_CLIENT_SECRET');

// Or set environment variables:
process.env.GMAIL_CLIENT_ID = 'YOUR_CLIENT_ID'
process.env.GMAIL_CLIENT_SECRET = 'YOUR_CLIENT_SECRET'
```

### Step 5: Test Connection
- Click "Connect" on Gmail card in Email Management
- Log in with your Google account
- Grant permissions when prompted
- Should see "Connected" status

### OAuth Scopes:
- `https://www.googleapis.com/auth/gmail.readonly` - Read emails
- `https://www.googleapis.com/auth/userinfo.email` - Get email
- `https://www.googleapis.com/auth/userinfo.profile` - Get profile

---

## 2. Outlook / Microsoft 365 Setup ✅

### Step 1: Create Azure AD Application
```
1. Go to: https://portal.azure.com
2. Search for "Azure Active Directory"
3. Click "App registrations" (left sidebar)
4. Click "New registration"
5. Name: "Bloo CRM Email"
6. Supported account types: "Personal Microsoft accounts only"
7. Click "Register"
```

### Step 2: Configure OAuth
```
1. Go to "Certificates & Secrets" (left sidebar)
2. Click "New client secret"
3. Description: "Email Sync"
4. Expires: 24 months
5. Copy the secret VALUE (not the ID)
```

### Step 3: Set Redirect URIs
```
1. Go to "Authentication" (left sidebar)
2. Under Platform configurations, click "Add a platform"
3. Select "Web"
4. Redirect URIs:
   - http://localhost:3000/outlook-callback.html
   - http://localhost:8000/outlook-callback.html
   - https://yourdomain.com/outlook-callback.html
5. Click "Configure"
```

### Step 4: Configure API Permissions
```
1. Go to "API permissions" (left sidebar)
2. Click "Add a permission"
3. Choose "Microsoft Graph"
4. Select "Delegated permissions"
5. Search and add:
   - Mail.Read
   - User.Read
   - offline_access
6. Click "Grant admin consent"
```

### Step 5: Store Credentials
```javascript
// Environment variables:
process.env.OUTLOOK_CLIENT_ID = 'APPLICATION_ID'
process.env.OUTLOOK_CLIENT_SECRET = 'CLIENT_SECRET_VALUE'
process.env.OUTLOOK_TENANT_ID = 'common' // or specific tenant ID
```

### Step 6: Test Connection
- Click "Connect" on Outlook card
- Sign in with Microsoft account
- Grant permissions
- Should see "Connected" status

### OAuth Scopes:
- `Mail.Read` - Read email messages
- `User.Read` - Read user profile
- `offline_access` - Get refresh tokens

---

## 3. Yahoo Mail Setup ✅

### Step 1: Create Yahoo Developer App
```
1. Go to: https://developer.yahoo.com/apps
2. Sign in with Yahoo account (or create one)
3. Click "Create an App"
4. Name: "Bloo CRM"
5. Select Application Type: "Web Application"
6. Agree to terms
7. Click "Create App"
```

### Step 2: Configure OAuth
```
1. In your app dashboard, click "Edit"
2. API Permissions:
   - Check "Mail" (Read/Write)
   - Check "Profile" (Read)
3. Redirect URLs (Allowed Return URLs):
   - http://localhost:3000/yahoo-callback.html
   - http://localhost:8000/yahoo-callback.html
   - https://yourdomain.com/yahoo-callback.html
4. Click "Save"
5. Copy Client ID and Client Secret
```

### Step 3: Store Credentials
```javascript
// Environment variables:
process.env.YAHOO_CLIENT_ID = 'YOUR_YAHOO_CLIENT_ID'
process.env.YAHOO_CLIENT_SECRET = 'YOUR_YAHOO_CLIENT_SECRET'
```

### Step 4: Test Connection
- Click "Connect" on Yahoo Mail card
- Log in with Yahoo account
- Grant permissions
- Should redirect to Yahoo Mail

### OAuth Scopes:
- `mail-w` - Write to mail
- `mail-r` - Read mail
- `mail` - Full mail access

---

## 4. ProtonMail Setup ✅

### Option A: OAuth (Recommended for ProtonMail Plus)
```
1. Go to: https://proton.me/support/proton-api-authentication
2. Request API access (Pro/Plus account required)
3. Create API credentials
4. Store credentials in environment:
   process.env.PROTONMAIL_CLIENT_ID = 'YOUR_ID'
   process.env.PROTONMAIL_CLIENT_SECRET = 'YOUR_SECRET'
```

### Option B: App Password (Easier, works for all accounts)
```
1. Go to: https://mail.protonmail.com/
2. Click "Settings" (top right)
3. Go to "Accounts" → "General"
4. Scroll to "App password"
5. Click "Generate app password"
6. Generate password (copy it)
7. In Bloo CRM:
   - Click "Connect" on ProtonMail card
   - A dialog will appear asking for email and app password
   - Paste your app password
   - Click "Connect"
```

### Step 3: Test Connection
- Click "Connect" on ProtonMail card
- Choose app password method
- Enter email and app password
- Should see "Connected" status

### Notes:
- ProtonMail is end-to-end encrypted
- API access requires ProtonMail Plus subscription
- App passwords are single-use and can be regenerated anytime
- More secure than storing master password

---

## 5. Tutamail Setup ✅

### Step 1: Generate Tutamail App Password
```
1. Go to: https://tutanota.com
2. Log in to your account
3. Click "Settings" (left sidebar)
4. Go to "Email" section
5. Look for "App Passwords" or "Authorized Applications"
6. Click "Create new app password"
7. Name: "Bloo CRM"
8. Copy the generated password
```

### Step 2: Add to Bloo CRM
```
1. Click "Connect" on Tutamail card
2. A dialog will appear
3. Enter:
   - Email: your@tutanota.com
   - Password: (the app password you generated)
4. Click "Sign In"
```

### Step 3: Test Connection
- Should show "Connected" status
- Emails will sync from your Tutamail account
- All emails remain encrypted

### Notes:
- Tutamail is like ProtonMail - privacy-focused and encrypted
- End-to-end encryption means emails are encrypted at rest
- Supports IMAP protocol for third-party clients
- App passwords don't expire automatically

---

## 6. MailChimp Setup ✅

### Step 1: Get API Key
```
1. Go to: https://mailchimp.com
2. Log in to your MailChimp account
3. Click your profile (bottom left)
4. Select "Account & Billing"
5. Go to "Extras" → "API keys"
6. Copy one of your API keys (or "Create A Key")
7. Your API key format: abc123def456-us19
8. Note: "us19" is your DATA CENTER (important!)
```

### Step 2: Extract Data Center
```
From your API key: abc123def456-us19
Everything after the last dash is the data center: us19
```

### Step 3: Add to Bloo CRM
```
1. Click "Connect" on MailChimp card
2. A dialog will appear asking for:
   - MailChimp API Key: (paste your full key)
   - Data Center: (enter the suffix, e.g., "us19")
3. Example:
   - API Key: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p-us19
   - Data Center: us19
4. Click "Connect"
```

### Step 4: Test Connection
- Should show "Connected" status
- Will sync your email campaigns and marketing data
- Can view campaign statistics

### MailChimp API Endpoints:
```
Campaigns: https://{dc}.api.mailchimp.com/3.0/campaigns
Lists: https://{dc}.api.mailchimp.com/3.0/lists
Members: https://{dc}.api.mailchimp.com/3.0/lists/{list_id}/members
```

### Notes:
- MailChimp is for email marketing, not personal email
- Syncs campaigns and marketing lists
- Great for tracking email campaigns and statistics
- API key never expires unless manually revoked

---

## Environment Variables (.env File)

Create a `.env` file in `bloo-crm/backend/` with:

```env
# Gmail
GMAIL_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=YOUR_CLIENT_SECRET

# Outlook
OUTLOOK_CLIENT_ID=YOUR_APPLICATION_ID
OUTLOOK_CLIENT_SECRET=YOUR_CLIENT_SECRET
OUTLOOK_TENANT_ID=common

# Yahoo
YAHOO_CLIENT_ID=YOUR_YAHOO_CLIENT_ID
YAHOO_CLIENT_SECRET=YOUR_YAHOO_CLIENT_SECRET

# ProtonMail
PROTONMAIL_CLIENT_ID=YOUR_PROTONMAIL_ID
PROTONMAIL_CLIENT_SECRET=YOUR_PROTONMAIL_SECRET

# App URL (for OAuth redirects)
APP_URL=http://localhost:3000

# Or production URL
# APP_URL=https://yourdomain.com
```

---

## Testing Email Connections

### Browser Console Tests
```javascript
// Check if email manager is initialized
console.log(emailManager);

// Get all connections
console.log(emailManager.getConnections());

// Get specific provider status
console.log(emailManager.getLoginStatus('gmail'));
console.log(emailManager.getLoginStatus('outlook'));

// Check all statuses
console.log(emailManager.getAllStatus());

// Test sync
emailManager.startSync('connection-id-here', { daysBack: 7 })
    .then(result => console.log('Sync started:', result))
    .catch(error => console.error('Sync error:', error));
```

### Backend Tests
```bash
# Test Gmail token exchange
curl -X POST http://localhost:5000/api/email/oauth/callback/gmail \
  -H "Content-Type: application/json" \
  -d '{"code":"AUTH_CODE","state":"STATE_VALUE"}'

# Get connections
curl http://localhost:5000/api/email/connections

# Start sync
curl -X POST http://localhost:5000/api/email/sync/start/CONNECTION_ID \
  -H "Content-Type: application/json" \
  -d '{"daysBack":7,"maxResults":50}'

# Check sync status
curl http://localhost:5000/api/email/sync/status/SYNC_ID
```

---

## Troubleshooting

### Gmail Issues

**Problem: "Invalid state parameter"**
- Cause: CSRF validation failed
- Fix: Ensure callback URL matches exactly in Google Cloud Console

**Problem: "Access Denied"**
- Cause: Missing permissions in Google account
- Fix: Grant permissions when prompted, or revoke app access and reconnect

**Problem: "Authorization server denied the client"**
- Cause: OAuth credentials misconfigured
- Fix: Verify Client ID and Secret in `.env` file

### Outlook Issues

**Problem: "AADSTS65001"**
- Cause: Admin consent required
- Fix: Go to Azure → API permissions → Grant admin consent

**Problem: "invalid_client"**
- Cause: Wrong Client ID or Secret
- Fix: Copy values again from Azure portal

### Yahoo Issues

**Problem: "OAuth state mismatch"**
- Cause: Session timeout or multiple redirect attempts
- Fix: Clear sessionStorage and try connecting again

**Problem: "Invalid redirect_uri"**
- Cause: Redirect URL doesn't match exactly in Yahoo settings
- Fix: Check spelling and protocol (http vs https)

### ProtonMail Issues

**Problem: "App password authentication failed"**
- Cause: Wrong email or expired app password
- Fix: Generate new app password in ProtonMail settings

**Problem: "OAuth not available"**
- Cause: Account doesn't have API access
- Fix: Upgrade to ProtonMail Plus or use app password method

### Tutamail Issues

**Problem: "Authentication failed"**
- Cause: Incorrect credentials
- Fix: Verify email and app password from Tutamail settings

### MailChimp Issues

**Problem: "Invalid API key"**
- Cause: Wrong API key format
- Fix: Verify full API key including data center suffix (e.g., `-us19`)

**Problem: "Invalid data center"**
- Cause: Data center doesn't match API key
- Fix: Extract correct data center from API key suffix

---

## Security Best Practices

1. **Never commit credentials** - Use `.env` file (add to `.gitignore`)
2. **Use HTTPS** - All OAuth redirects must use HTTPS in production
3. **Rotate API keys** - Periodically generate new API keys
4. **App passwords** - Use app passwords instead of master passwords
5. **Token expiration** - Tokens auto-refresh before expiry
6. **CORS validation** - Only whitelist trusted domains
7. **Audit logs** - Monitor connection and sync activities

---

## Production Deployment Checklist

- [ ] Create `.env` file with production credentials
- [ ] Set `APP_URL` to production domain
- [ ] Update OAuth redirect URIs to production URLs
- [ ] Enable HTTPS on all OAuth callbacks
- [ ] Configure database for email connection storage
- [ ] Set up email sync background job
- [ ] Enable audit logging
- [ ] Monitor sync failures and errors
- [ ] Set up alerting for expired tokens
- [ ] Test all provider connections
- [ ] Document internal API credentials in secure vault

---

## Support Resources

- Gmail API: https://developers.google.com/gmail/api
- Microsoft Graph: https://docs.microsoft.com/en-us/graph/
- Yahoo Mail: https://developer.yahoo.com/mail/guide
- ProtonMail API: https://proton.me/support/proton-api-authentication
- Tutamail API: https://tutanota.com/api
- MailChimp API: https://mailchimp.com/developer/
