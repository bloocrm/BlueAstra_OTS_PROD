# Email Management SSO Implementation Guide

## Overview
Comprehensive Single Sign-On (SSO) system for email management in Bloo CRM supporting Gmail, Outlook, Yahoo, ProtonMail, Tutamail, and MailChimp. Users can connect multiple email accounts, sync emails automatically, and manage all communications in one unified interface.

## Phase 1: Completed ✅

### Files Created
1. **email-platform-manager.js** - Centralized manager coordinating all email provider SSO instances
2. **gmail-sso.js** - Gmail OAuth 2.0 implementation with Gmail API integration
3. **outlook-sso.js** - Microsoft Outlook OAuth with Microsoft Graph API
4. **gmail-callback.html** - OAuth redirect handler for Gmail
5. **outlook-callback.html** - OAuth redirect handler for Outlook
6. **email-management.js** - UI management for email provider connections

### Architecture Pattern

```
Email Management System
├── Frontend
│   ├── email-platform-manager.js (centralized controller)
│   ├── email-management.js (UI handler)
│   ├── Email SSO Classes:
│   │   ├── gmail-sso.js ✅
│   │   ├── outlook-sso.js ✅
│   │   ├── yahoo-sso.js (Phase 2)
│   │   ├── protonmail-sso.js (Phase 2)
│   │   ├── tutamail-sso.js (Phase 3)
│   │   └── mailchimp-sso.js (Phase 3)
│   └── OAuth Callbacks:
│       ├── gmail-callback.html ✅
│       ├── outlook-callback.html ✅
│       ├── yahoo-callback.html (Phase 2)
│       ├── protonmail-callback.html (Phase 2)
│       ├── tutamail-callback.html (Phase 3)
│       └── mailchimp-callback.html (Phase 3)
├── Backend (Future: Phase 2-3)
│   ├── routes/email-sync.js
│   ├── services/email-sync-service.js
│   └── models/EmailConnection.js
└── UI Updates
    └── Updated Email Management section in index.html
```

## Core Features - Phase 1

### 1. Email Provider Manager (`email-platform-manager.js`)

**Key Methods:**
```javascript
// Initialize manager
emailManager = new EmailPlatformManager();

// Set current email provider
await emailManager.setCurrentProvider('gmail');

// Connect a provider (triggers OAuth)
await emailManager.connectProvider('gmail');

// Get all connections
const connections = emailManager.getConnections();

// Start email sync
const syncResult = await emailManager.startSync(connectionId, options);

// Get sync status
const status = emailManager.getSyncStatus(syncId);

// Disconnect provider
await emailManager.removeConnection(connectionId);

// Event listeners
emailManager.on('connection-added', (connection) => {...});
emailManager.on('sync-started', (data) => {...});
emailManager.on('sync-completed', (data) => {...});
```

**Event Types:**
- `connection-added` - New email account connected
- `connection-removed` - Account disconnected
- `sync-started` - Email sync begins
- `sync-progress` - Sync progress update
- `sync-completed` - Sync finished
- `sync-error` - Sync error occurred
- `token-refreshed` - OAuth token refreshed
- `token-expired` - Token needs re-authentication
- `logout` - User logged out

### 2. Gmail SSO (`gmail-sso.js`)

**OAuth Flow:**
```
1. User clicks "Connect" on Gmail provider card
2. Front-end redirects to Gmail authorization:
   - https://accounts.google.com/o/oauth2/v2/auth
   - Parameters: client_id, redirect_uri, scopes, state
3. User logs in and grants permissions
4. Google redirects to: gmail-callback.html?code=XXX&state=YYY
5. Callback validates state (CSRF protection)
6. GmailSSO.exchangeCodeForToken(code) exchanges code for access token
7. Token stored in sessionStorage (cleared on browser close for security)
8. Email sync can now begin
```

**OAuth Scopes:**
```javascript
'https://www.googleapis.com/auth/gmail.readonly'  // Read emails
'https://www.googleapis.com/auth/userinfo.email'   // Get email address
'https://www.googleapis.com/auth/userinfo.profile' // Get user profile
```

**Methods:**
```javascript
const gmailSSO = new GmailSSO();

// Start OAuth login
gmailSSO.startSSOLogin();

// Exchange authorization code for token
await gmailSSO.exchangeCodeForToken(code);

// Check if user is logged in
if (gmailSSO.isUserLoggedIn()) { ... }

// Get current user info
const user = await gmailSSO.getCurrentUser();
// Returns: { id, displayName, email, avatar }

// Fetch emails
const messages = await gmailSSO.getEmails(10);

// Get email details
const details = await gmailSSO.getEmailDetails(messageId);

// Auto-refresh token before expiry
await gmailSSO.refreshAccessToken();

// Logout
gmailSSO.logout();

// Event listeners
gmailSSO.on('login-success', (user) => {...});
gmailSSO.on('session-active', (user) => {...});
gmailSSO.on('token-refreshed', () => {...});
gmailSSO.on('logout', () => {...});
```

**Session Management:**
- Access token stored in: `sessionStorage.gmailAccessToken`
- Refresh token stored in: `sessionStorage.gmailRefreshToken`
- Token expiry stored in: `sessionStorage.gmailTokenExpiresAt`
- Session automatically cleared when browser closes
- Tokens automatically refreshed 2 minutes before expiry

### 3. Outlook SSO (`outlook-sso.js`)

**OAuth Flow:**
```
1. User clicks "Connect" on Outlook provider card
2. Redirect to Microsoft login:
   - https://login.microsoftonline.com/common/oauth2/v2.0/authorize
   - Parameters: client_id, redirect_uri, scopes, state, tenant
3. User logs in and grants permissions
4. Microsoft redirects to: outlook-callback.html?code=XXX&state=YYY
5. OutlookSSO.exchangeCodeForToken(code) gets access token
6. Token stored in sessionStorage
7. Email sync begins using Microsoft Graph API
```

**OAuth Scopes:**
```
Mail.Read           // Read emails
User.Read           // Get user info
offline_access      // Get refresh token for long-term access
```

**Methods:**
```javascript
const outlookSSO = new OutlookSSO();

// Start OAuth
outlookSSO.startSSOLogin();

// Exchange code for token
await outlookSSO.exchangeCodeForToken(code);

// Get user info
const user = await outlookSSO.getCurrentUser();

// Fetch emails from inbox
const messages = await outlookSSO.getEmails(10);

// Get email details
const details = await outlookSSO.getEmailDetails(messageId);

// Auto-refresh token
await outlookSSO.refreshAccessToken();

// Logout
outlookSSO.logout();

// Event listeners
outlookSSO.on('login-success', (user) => {...});
```

### 4. Email Management UI (`email-management.js`)

**User Interface Components:**

1. **Email Provider Cards Grid**
   - Visual cards for each provider
   - Features list for each provider
   - Connect/Connected button states
   - Color-coded by provider brand

2. **Connection Status Display**
   - Shows all connected email accounts
   - Connection timestamp
   - Quick action buttons

3. **Recent Emails List**
   - Email from sender
   - Subject and preview
   - Provider badge (Gmail, Outlook, etc.)
   - Email date/time
   - Read/unread status
   - Mark as read action

4. **Email Sync Configuration Modal**
   - Sync period selection (7 days, 30 days, 90 days, etc.)
   - Include attachments toggle
   - Include read emails toggle
   - Start sync button

**UI Functions:**
```javascript
// Load email provider cards
loadEmailProviders();

// Connect provider (OAuth flow)
connectEmailProvider(providerId);

// Start sync with provider
startEmailSyncWithProvider(providerId);

// Handle sync form submission
handleEmailSync(event);

// Load recent synced emails
loadRecentEmails();

// Update sync status display
updateEmailSyncStatus();

// Refresh connections
refreshEmailConnections();

// Mark email as read
markEmailRead(button);
```

## Email Download Protocols

### IMAP Protocol (Gmail, Outlook, Yahoo)
```
Purpose: Download emails from mail server
Flow:
1. Connect to IMAP server (imap.gmail.com, outlook.office365.com)
2. Authenticate with OAuth token or app password
3. SELECT INBOX (or other folder)
4. FETCH messages with body content
5. Parse RFC 822 format to extract:
   - From, To, Cc, Bcc
   - Subject, Date
   - Message body (text/plain, text/html)
   - Attachments (base64 encoded)
6. Store in database
7. Close connection

Security:
- Use TLS/SSL encryption (port 993)
- Never store passwords, use OAuth tokens
- Implement retry logic with exponential backoff
- Rate limit requests (Gmail: 1000 messages/minute)
```

### Gmail API (Gmail)
```
Endpoint: https://www.googleapis.com/gmail/v1/users/me/messages
Method: GET

Query Parameters:
- maxResults: Number of emails to fetch (1-500)
- pageToken: For pagination
- q: Query (example: "from:client@example.com after:2024-01-01")

Response Format:
{
  "messages": [{
    "id": "message-id",
    "threadId": "thread-id"
  }],
  "nextPageToken": "pagination-token"
}

Full Message Retrieval:
GET /gmail/v1/users/me/messages/{messageId}

Response:
{
  "id": "message-id",
  "threadId": "thread-id",
  "labelIds": ["INBOX", "UNREAD"],
  "snippet": "Preview text...",
  "payload": {
    "headers": [{
      "name": "From",
      "value": "sender@example.com"
    }, ...],
    "parts": [{
      "mimeType": "text/plain",
      "data": "base64-encoded-body"
    }]
  }
}

Rate Limits:
- 500 requests per second
- 1 million requests per day
```

### Microsoft Graph API (Outlook)
```
Endpoint: https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages

Query Parameters:
- $top: Number of emails (1-1000)
- $skip: Skip first N emails
- $filter: Filter criteria (OData query)
- $orderby: Sort order
- $select: Specific properties

Response Format:
{
  "value": [{
    "id": "message-id",
    "subject": "Email subject",
    "from": {
      "emailAddress": {
        "address": "sender@example.com",
        "name": "Sender Name"
      }
    },
    "receivedDateTime": "2024-01-15T10:30:00Z",
    "bodyPreview": "Preview text...",
    "isRead": false
  }]
}

Full Message:
GET /me/messages/{messageId}

Rate Limits:
- 1000 requests per 60 seconds
- 50 concurrent requests
```

### API Key Authentication (MailChimp, ProtonMail, Tutamail)
```
MailChimp:
- Endpoint: https://[server].api.mailchimp.com/3.0/lists
- Authentication: HTTP Basic Auth (username: "anystring", password: API key)
- Primarily campaign/list focused, not email sync
- Use for email marketing integration

ProtonMail:
- Limited OAuth support, primarily app password
- Use Bridge mode for IMAP access
- Endpoint: https://api.protonmail.ch/...
- Requires special handling for encryption

Tutamail:
- Similar to ProtonMail with encrypted storage
- API endpoint: https://api.tutanota.com
- Custom token generation required
```

## Configuration Setup

### Gmail Configuration

**Step 1: Create Google Cloud Project**
```
1. Go to: https://console.cloud.google.com
2. Create new project
3. Enable Gmail API:
   - Search for "Gmail API"
   - Click "Enable"
4. Enable Google+ API for user profile
```

**Step 2: Create OAuth Credentials**
```
1. Go to: Credentials → Create Credentials → OAuth 2.0 Client ID
2. Application type: Web application
3. Authorized JavaScript origins:
   - http://localhost:3000
   - https://your-domain.com
4. Authorized redirect URIs:
   - http://localhost:3000/gmail-callback.html
   - https://your-domain.com/gmail-callback.html
5. Copy Client ID and Client Secret
```

**Step 3: Configure in Bloo CRM**
```javascript
// In gmail-sso.js constructor:
this.clientId = 'YOUR_GMAIL_CLIENT_ID';
this.clientSecret = 'YOUR_GMAIL_CLIENT_SECRET';

// Or set via localStorage:
localStorage.setItem('gmailClientId', 'YOUR_CLIENT_ID');
localStorage.setItem('gmailClientSecret', 'YOUR_CLIENT_SECRET');
```

### Outlook Configuration

**Step 1: Create Azure AD App**
```
1. Go to: https://portal.azure.com/
2. Azure Active Directory → App registrations
3. New registration
4. Name: "Bloo CRM"
5. Supported account types: Personal Microsoft accounts
```

**Step 2: Configure OAuth**
```
1. Certificates & secrets → New client secret
2. Copy secret value
3. API permissions:
   - Add: Mail.Read
   - Add: User.Read
   - Add: offline_access
4. Redirect URI:
   - Web: http://localhost:3000/outlook-callback.html
```

**Step 3: Configure in Bloo CRM**
```javascript
// In outlook-sso.js constructor:
this.clientId = 'YOUR_OUTLOOK_CLIENT_ID';
this.clientSecret = 'YOUR_OUTLOOK_CLIENT_SECRET';
this.tenantId = 'YOUR_TENANT_ID'; // or 'common'
```

## Next Phases

### Phase 2: Additional Providers (Weeks 3-4)
- [ ] Yahoo SSO (`yahoo-sso.js`)
- [ ] ProtonMail SSO (`protonmail-sso.js`)
- [ ] Create yahoo-callback.html
- [ ] Create protonmail-callback.html
- [ ] Backend token exchange routes
- [ ] Email connection management endpoints

### Phase 3: Email Sync Engine (Weeks 5-6)
- [ ] Tutamail SSO (`tutamail-sso.js`)
- [ ] MailChimp SSO (`mailchimp-sso.js`)
- [ ] Email download service (IMAP/API)
- [ ] Email storage in database
- [ ] Sync progress tracking
- [ ] Retry mechanisms

### Phase 4: UI & Advanced Features (Weeks 7-8)
- [ ] Email display enhancements
- [ ] Sync status dashboard
- [ ] Email search and filtering
- [ ] Read/unread status sync
- [ ] Attachment handling
- [ ] Background sync jobs

## Security Checklist

- ✅ CSRF protection with state parameter
- ✅ Tokens stored in sessionStorage (not localStorage)
- ✅ Automatic token refresh before expiry
- ✅ HTTPS-only callback redirects
- ✅ No password storage (OAuth tokens only)
- [ ] Token encryption in database
- [ ] Rate limiting implementation
- [ ] Audit logging
- [ ] Error message sanitization
- [ ] Penetration testing

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid state parameter" | Check CSRF state validation, ensure callback URL matches |
| OAuth redirect fails | Verify redirect URIs in provider app settings match exactly |
| "Access denied" error | Check OAuth scopes and permissions granted to app |
| Token refresh fails | Implement retry logic, re-authenticate if refresh token expired |
| Email sync stalls | Check rate limits, implement exponential backoff |
| Provider not initializing | Verify provider OAuth credentials in browser console |

## Testing

```javascript
// Test Gmail SSO
const gmailSSO = new GmailSSO();
console.log(gmailSSO.startSSOLogin()); // Should redirect to Gmail

// Test Email Manager
console.log(emailManager.ssoInstances); // Should show all providers
emailManager.on('login-success', (user) => console.log('Logged in:', user));

// Test connection management
const conn = await emailManager.addConnection({
  provider: 'gmail',
  email: 'user@gmail.com',
  accessToken: 'token...'
});
```

## API Documentation

### Future Backend Endpoints

```
POST /api/email/oauth/callback/gmail
- Exchange code for access token
- Store connection in database

POST /api/email/sync/start
- Initiate email sync from provider
- Return sync session ID

GET /api/email/sync/status/{syncId}
- Get real-time sync progress

GET /api/email/messages
- Retrieve synced emails with filtering

GET /api/email/connections
- List all user's email connections
```

---

## Support & Resources

- Gmail API: https://developers.google.com/gmail/api
- Microsoft Graph: https://docs.microsoft.com/en-us/graph/
- IMAP RFC 3501: https://tools.ietf.org/html/rfc3501
- OAuth 2.0: https://oauth.net/2/
