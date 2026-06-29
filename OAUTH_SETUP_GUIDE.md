# Email OAuth Configuration & Setup Guide

## Overview
This guide provides step-by-step instructions for configuring OAuth authentication for email providers in Bloo CRM.

## Prerequisites
- Node.js 14+ and npm
- Docker (optional, for local testing)
- OAuth credentials from each email provider
- Backend server running on `http://localhost:5000`

## OAuth Providers Configuration

### 1. Gmail (Google)

#### Getting OAuth Credentials:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable Gmail API
4. Create OAuth 2.0 credentials (Web Application)
5. Add authorized redirect URIs:
   - `http://localhost:3000/auth/gmail-callback`
   - `http://localhost:5000/auth/gmail-callback`
   - `https://yourdomain.com/auth/gmail-callback` (production)

#### Environment Variables:
```bash
GMAIL_CLIENT_ID=your_client_id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your_client_secret
```

#### Scopes Required:
- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/userinfo.email`
- `https://www.googleapis.com/auth/userinfo.profile`

---

### 2. Outlook (Microsoft Azure)

#### Getting OAuth Credentials:
1. Go to [Azure Portal](https://portal.azure.com)
2. Register a new application
3. Add API permissions:
   - Mail.Read
   - User.Read
4. Create client secret
5. Add redirect URIs:
   - `http://localhost:3000/auth/outlook-callback`
   - `http://localhost:5000/auth/outlook-callback`
   - `https://yourdomain.com/auth/outlook-callback` (production)

#### Environment Variables:
```bash
OUTLOOK_CLIENT_ID=your_client_id
OUTLOOK_CLIENT_SECRET=your_client_secret
```

#### Scopes Required:
- `Mail.Read`
- `User.Read`
- `offline_access` (for refresh tokens)

---

### 3. ProtonMail

#### Getting OAuth Credentials:
1. Go to [ProtonMail API](https://proton.me/blog/proton-api)
2. Request API access
3. Create OAuth application
4. Set redirect URI to your callback endpoint

#### Environment Variables:
```bash
PROTONMAIL_CLIENT_ID=your_client_id
PROTONMAIL_CLIENT_SECRET=your_client_secret
```

---

## Backend Setup

### 1. Install Dependencies
```bash
cd bloo-crm/backend
npm install express axios jwt dotenv
```

### 2. Create .env File
```bash
# OAuth Configuration
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
OUTLOOK_CLIENT_ID=your_outlook_client_id
OUTLOOK_CLIENT_SECRET=your_outlook_client_secret
PROTONMAIL_CLIENT_ID=your_protonmail_client_id
PROTONMAIL_CLIENT_SECRET=your_protonmail_client_secret

# Server Configuration
PORT=5000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key
APP_URL=http://localhost:3000
```

### 3. Register OAuth Routes
The OAuth routes are already registered in `server.js`:
```javascript
const oauthAuthRoutes = require('./routes/oauth-auth');
app.use('/api/auth', oauthAuthRoutes);
```

### 4. Start the Backend Server
```bash
npm start
```

---

## Frontend Setup

### 1. Include Required Scripts in email-client.html

The following scripts are already included:
```html
<!-- OAuth Base Class -->
<script src="js/oauth-base.js"></script>

<!-- Email Provider SSO Scripts -->
<script src="js/gmail-sso.js"></script>
<script src="js/outlook-sso.js"></script>
<script src="js/protonmail-sso.js"></script>
<script src="js/yahoo-sso.js"></script>
<script src="js/tutamail-sso.js"></script>
<script src="js/mailchimp-sso.js"></script>

<!-- Core Scripts -->
<script src="js/email-platform-manager.js"></script>
<script src="js/email-client.js"></script>
```

### 2. Verify CORS Configuration
Ensure the backend allows your frontend domain:
```javascript
// In server.js
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:8000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

## OAuth Authentication Flow

### 1. User Clicks "Connect" for Email Provider

```javascript
// In email-client.js
openSMTPProviderModal(providerId) {
    const userId = this.getCurrentUserId();
    const accountId = this.currentAccount || 'default-account';
    
    const modal = new SMTPProviderModal(userId, accountId);
    modal.onSuccess = (data) => {
        this.showToast(`${data.providerType} configured!`, 'success');
    };
    modal.open();
    modal.selectProvider(providerId);
}
```

### 2. Authorization Request Sent to Backend

```javascript
// In oauth-base.js
async startOAuthFlow() {
    const response = await fetch(`${this.apiBase}/auth/oauth-config/${this.providerId}`);
    const { authorizationUrl, state } = await response.json();
    sessionStorage.setItem(`${this.providerId}_oauth_state`, state);
    window.location.href = authorizationUrl;
}
```

### 3. User Authorizes on Provider's Website

- User is redirected to Google/Microsoft/ProtonMail login
- User grants permissions
- Provider redirects back to callback URL with authorization code

### 4. Backend Exchanges Code for Tokens

```javascript
// In oauth-auth.js - POST /api/auth/oauth-callback
const tokenResponse = await axios.post(config.tokenUrl, {
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code: code,
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code'
});
```

### 5. Frontend Receives and Stores Tokens

```javascript
// In oauth-base.js - handleCallback()
setTokens(tokenData) {
    this.accessToken = tokenData.accessToken;
    this.refreshToken = tokenData.refreshToken;
    this.tokenExpiresAt = tokenData.expiresAt;
    sessionStorage.setItem(`${this.providerId}_access_token`, this.accessToken);
    sessionStorage.setItem(`${this.providerId}_refresh_token`, this.refreshToken);
}
```

---

## Testing the OAuth Flow

### 1. Run Unit Tests
Open `email-client.html` in browser. Tests run automatically:
```
🧪 Starting Email Authentication Test Suite...
📋 Testing OAuth Base Class...
✅ PASS: OAuthBase class initialization
...
🎉 All tests passed!
```

### 2. Manual Testing Steps

1. Open email-client in browser
2. Click "+" button to add account
3. Click "Setup" under "SMTP Sending Services"
4. Select Gmail/Outlook/ProtonMail
5. Click "Save & Continue"
6. You should be redirected to provider's login page
7. After authorization, you should return to email client
8. Credentials should be stored in MongoDB
9. Success message should appear

### 3. Debugging Issues

#### Issue: "Cannot Connect" Error
**Solution:**
- Check browser console for detailed error (F12)
- Verify backend is running: `http://localhost:5000/health`
- Check CORS headers in network tab
- Verify OAuth credentials in .env file

#### Issue: State Mismatch Error
**Solution:**
- Clear session storage: `sessionStorage.clear()`
- Refresh page and try again
- Check server logs for state validation

#### Issue: Missing User Information
**Solution:**
- Verify scopes are correct for each provider
- Check API quota limits for each provider
- Verify user permissions on provider side

#### Issue: Token Refresh Failing
**Solution:**
- Verify refresh token was obtained (not all providers return it)
- Check token expiration time in sessionStorage
- Manually logout and re-authorize

---

## Production Deployment

### 1. Update Environment Variables

```bash
APP_URL=https://yourdomain.com
NODE_ENV=production
JWT_SECRET=generate_a_strong_random_key
```

### 2. Update OAuth Redirect URIs

For each provider (Gmail, Outlook, ProtonMail), add:
- `https://yourdomain.com/auth/{provider}-callback`

### 3. Security Checklist

- [ ] Use HTTPS for all OAuth URLs
- [ ] Store JWT_SECRET securely (use secrets manager)
- [ ] Enable CORS only for your domain
- [ ] Implement rate limiting on OAuth endpoints
- [ ] Add logging for OAuth events
- [ ] Monitor token refresh failures
- [ ] Implement user consent logging
- [ ] Regular security audits

### 4. Monitoring

```bash
# Check OAuth endpoint health
curl http://localhost:5000/api/auth/oauth-config/gmail

# Check token refresh
curl -X POST http://localhost:5000/api/auth/oauth-refresh \
  -H "Content-Type: application/json" \
  -d '{"provider":"gmail","refreshToken":"your_refresh_token"}'
```

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Invalid client credentials | Wrong client ID/secret | Verify in .env file and provider dashboard |
| Redirect URI mismatch | URI not registered | Add exact URI to provider settings |
| Scope insufficient | Missing permissions | Add required scopes to provider app |
| CORS blocked | Browser security | Verify CORS headers in Express |
| Token expired | Session expired | Implement auto-refresh logic |

---

## Testing Checklist

- [ ] Gmail OAuth flow works end-to-end
- [ ] Outlook OAuth flow works end-to-end
- [ ] ProtonMail OAuth flow works end-to-end
- [ ] Tokens are stored securely
- [ ] Token refresh works automatically
- [ ] User info is retrieved correctly
- [ ] Logout clears all tokens
- [ ] Error messages are user-friendly
- [ ] Multiple accounts can be connected
- [ ] SMTP credentials are validated

---

## Support & Documentation

- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Microsoft Azure Documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/)
- [ProtonMail API Documentation](https://protonmail.com/api/)
- [Bloo CRM Documentation](./README.md)

---

Last Updated: 2026-06-26
