# Calendar Service Provider Configuration & Setup Guide

## Complete Calendar Provider Setup

This guide covers configuration for all 11 calendar service providers integrated into Bloo CRM.

---

## 1. Calendly Setup ✅

### Step 1: Create Calendly Application
```
1. Go to: https://calendly.com
2. Log in with your account (create one if needed)
3. Click "Settings" (bottom left)
4. Go to "Integrations" → "API & Webhooks"
5. Click "Generate new token"
6. Name: "Bloo CRM"
7. Copy the token
```

### Step 2: Get OAuth Credentials (Alternative)
```
1. Go to: https://developer.calendly.com
2. Create a developer account
3. Go to "Applications"
4. Click "Create Application"
5. Name: "Bloo CRM Calendar"
6. Type: "Server-to-server OAuth"
7. Copy Client ID and Client Secret
```

### Step 3: Store Credentials
```env
# In .env file:
CALENDLY_CLIENT_ID=YOUR_CLIENT_ID
CALENDLY_CLIENT_SECRET=YOUR_CLIENT_SECRET
APP_URL=http://localhost:3000
```

### Step 4: Configure Redirect URI
```
In Calendly Application settings:
Redirect URI: http://localhost:3000/calendly-callback.html
For production: https://yourdomain.com/calendly-callback.html
```

### Step 5: Test Connection
- Click "Connect" on Calendly card
- Authorize the application
- Should see "Connected" status with your name

---

## 2. Google Calendar Setup ✅

### Step 1: Create Google Cloud Project
```
1. Go to: https://console.cloud.google.com
2. Click "Select a Project" → "New Project"
3. Name: "Bloo CRM Calendar"
4. Click "Create"
```

### Step 2: Enable APIs
```
1. Go to: APIs & Services → Library
2. Search for "Google Calendar API"
3. Click "Enable"
4. Search for "Google+ API"
5. Click "Enable"
```

### Step 3: Create OAuth Credentials
```
1. Go to: Credentials (left sidebar)
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. Choose: Web application
4. Authorized JavaScript origins:
   - http://localhost:3000
   - https://yourdomain.com
5. Authorized redirect URIs:
   - http://localhost:3000/google-calendar-callback.html
   - https://yourdomain.com/google-calendar-callback.html
6. Copy Client ID and Client Secret
```

### Step 4: Store Credentials
```env
# In .env file (reuses Gmail credentials):
GMAIL_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=YOUR_CLIENT_SECRET
APP_URL=http://localhost:3000
```

### Step 5: Test Connection
- Click "Connect" on Google Calendar card
- Log in with Google account
- Grant permissions when prompted
- Should see "Connected" status

### OAuth Scopes Used:
- `https://www.googleapis.com/auth/calendar` - Full calendar access
- `https://www.googleapis.com/auth/userinfo.email` - Get email
- `https://www.googleapis.com/auth/userinfo.profile` - Get profile

---

## 3. Outlook / Microsoft 365 Setup ✅

### Step 1: Create Azure AD Application
```
1. Go to: https://portal.azure.com
2. Search for "Azure Active Directory"
3. Click "App registrations" (left sidebar)
4. Click "New registration"
5. Name: "Bloo CRM Calendar"
6. Supported account types: "Accounts in any organizational directory"
7. Click "Register"
```

### Step 2: Configure OAuth
```
1. Go to "Certificates & Secrets" (left sidebar)
2. Click "New client secret"
3. Description: "Calendar Sync"
4. Expires: 24 months
5. Copy the secret VALUE (not the ID)
```

### Step 3: Set Redirect URIs
```
1. Go to "Authentication" (left sidebar)
2. Under Platform configurations, click "Add a platform"
3. Select "Web"
4. Redirect URIs:
   - http://localhost:3000/outlook-calendar-callback.html
   - https://yourdomain.com/outlook-calendar-callback.html
5. Click "Configure"
```

### Step 4: Configure API Permissions
```
1. Go to "API permissions" (left sidebar)
2. Click "Add a permission"
3. Choose "Microsoft Graph"
4. Select "Delegated permissions"
5. Search and add:
   - Calendars.Read
   - Calendars.Read.Shared
   - Calendars.ReadWrite
   - User.Read
   - offline_access
6. Click "Grant admin consent"
```

### Step 5: Store Credentials
```env
# In .env file (reuses Outlook credentials):
OUTLOOK_CLIENT_ID=YOUR_APPLICATION_ID
OUTLOOK_CLIENT_SECRET=YOUR_CLIENT_SECRET_VALUE
OUTLOOK_TENANT_ID=common
APP_URL=http://localhost:3000
```

### Step 6: Test Connection
- Click "Connect" on Outlook Calendar card
- Sign in with Microsoft account
- Grant permissions
- Should see "Connected" status

---

## 4. Apple Calendar Setup ✅

### Step 1: Create Apple Developer Account
```
1. Go to: https://developer.apple.com
2. Create/sign in with Apple Developer account
3. Go to "Certificates, Identifiers & Profiles"
```

### Step 2: Create App ID
```
1. Click "Identifiers"
2. Click "+" to create new identifier
3. Type: App ID
4. App Type: Web
5. Identifier: com.bloocalendar.web
6. Capabilities: "Calendar" (if available)
7. Register
```

### Step 3: Set Redirect URIs
```
1. In Services, add "Sign in with Apple"
2. Configure Return URLs:
   - http://localhost:3000/apple-calendar-callback.html
   - https://yourdomain.com/apple-calendar-callback.html
```

### Step 4: Create Service ID
```
1. Go to Identifiers → Service IDs
2. Create new Service ID
3. Register with "Sign in with Apple" enabled
4. Set Website URLs and Redirect URLs
```

### Step 5: Store Credentials
```env
# In .env file:
APPLE_CALENDAR_CLIENT_ID=YOUR_SERVICE_ID
APPLE_CALENDAR_TEAM_ID=YOUR_TEAM_ID
APPLE_CALENDAR_KEY_ID=YOUR_KEY_ID
APP_URL=http://localhost:3000
```

### Step 6: Test Connection
- Click "Connect" on Apple Calendar card
- Sign in with Apple ID
- Grant permissions
- Should see "Connected" status

---

## 5. Zoom Setup ✅

### Step 1: Create Zoom Marketplace App
```
1. Go to: https://marketplace.zoom.us
2. Sign in with Zoom account
3. Click "Build App"
4. Choose: OAuth
5. Name: "Bloo CRM Calendar"
```

### Step 2: Configure OAuth
```
1. In App Credentials section:
   - Redirect URL: http://localhost:3000/zoom-callback.html
   - Authorized domains: localhost, yourdomain.com
2. Copy Client ID and Client Secret
3. Set scopes: meeting:read meeting:write
```

### Step 3: Store Credentials
```env
# In .env file:
ZOOM_CLIENT_ID=YOUR_ZOOM_CLIENT_ID
ZOOM_CLIENT_SECRET=YOUR_ZOOM_CLIENT_SECRET
APP_URL=http://localhost:3000
```

### Step 4: Test Connection
- Click "Connect" on Zoom card
- Log in with Zoom account
- Grant permissions
- Should see "Connected" status

---

## 6. Monday.com Setup ✅

### Step 1: Create Monday.com Application
```
1. Go to: https://monday.com
2. Log in to your account
3. Go to "Settings" → "Integrations"
4. Click "Create a Custom App"
5. Name: "Bloo CRM Calendar"
```

### Step 2: Configure OAuth
```
1. Copy the App ID
2. Set Redirect URI:
   - http://localhost:3000/monday-callback.html
   - https://yourdomain.com/monday-callback.html
3. Select Scopes: boards:read boards:write
```

### Step 3: Store Credentials
```env
# In .env file:
MONDAY_CLIENT_ID=YOUR_MONDAY_CLIENT_ID
APP_URL=http://localhost:3000
```

### Step 4: Test Connection
- Click "Connect" on Monday.com card
- Authorize the application
- Should see "Connected" status

---

## 7. Asana Setup ✅

### Step 1: Create Asana Application
```
1. Go to: https://asana.com
2. Log in to your account
3. Go to "Settings" → "Apps"
4. Click "Create Application"
5. Name: "Bloo CRM Calendar"
```

### Step 2: Configure OAuth
```
1. Copy Client ID and Client Secret
2. Set Redirect URI:
   - http://localhost:3000/asana-callback.html
   - https://yourdomain.com/asana-callback.html
```

### Step 3: Store Credentials
```env
# In .env file:
ASANA_CLIENT_ID=YOUR_ASANA_CLIENT_ID
APP_URL=http://localhost:3000
```

### Step 4: Test Connection
- Click "Connect" on Asana card
- Authorize the application
- Should see "Connected" status

---

## 8. Trello Setup ✅

### Step 1: Get API Key
```
1. Go to: https://trello.com/app-key
2. Log in with Trello account
3. Copy your API key
4. Generate a token (or use browser-based auth)
```

### Step 2: Store Credentials
```env
# In .env file:
TRELLO_API_KEY=YOUR_TRELLO_API_KEY
APP_URL=http://localhost:3000
```

### Step 3: Configure Redirect URI
```
In Trello Application Authorization page:
Return URL: http://localhost:3000/trello-callback.html
```

### Step 4: Test Connection
- Click "Connect" on Trello card
- Authorize the application
- Should see "Connected" status

---

## 9. Microsoft Teams Setup ✅

### Step 1: Create Azure AD Application
```
1. Go to: https://portal.azure.com
2. Click "Azure Active Directory"
3. Click "App registrations"
4. Click "New registration"
5. Name: "Bloo CRM Teams Calendar"
6. Click "Register"
```

### Step 2: Configure OAuth
```
1. Copy Application (client) ID
2. Go to "Certificates & Secrets"
3. Create new client secret
4. Copy value
```

### Step 3: Set Redirect URIs
```
1. Go to "Authentication"
2. Add platform: Web
3. Redirect URI: http://localhost:3000/teams-callback.html
```

### Step 4: Configure API Permissions
```
1. Go to "API permissions"
2. Add permission: Microsoft Graph
3. Select: Calendars.Read, Calendars.ReadWrite, User.Read
```

### Step 5: Store Credentials
```env
# In .env file:
TEAMS_CLIENT_ID=YOUR_TEAMS_CLIENT_ID
TEAMS_CLIENT_SECRET=YOUR_TEAMS_CLIENT_SECRET
APP_URL=http://localhost:3000
```

### Step 6: Test Connection
- Click "Connect" on Microsoft Teams card
- Sign in with Microsoft account
- Should see "Connected" status

---

## 10. Slack Setup ✅

### Step 1: Create Slack Application
```
1. Go to: https://api.slack.com/apps
2. Click "Create New App"
3. Name: "Bloo CRM Calendar"
4. Workspace: (select your workspace)
```

### Step 2: Configure OAuth
```
1. Go to "OAuth & Permissions"
2. Set Redirect URLs:
   - http://localhost:3000/slack-callback.html
   - https://yourdomain.com/slack-callback.html
3. Select Scopes: calendar:read calendar:write
```

### Step 3: Store Credentials
```env
# In .env file:
SLACK_CLIENT_ID=YOUR_SLACK_CLIENT_ID
SLACK_CLIENT_SECRET=YOUR_SLACK_CLIENT_SECRET
APP_URL=http://localhost:3000
```

### Step 4: Test Connection
- Click "Connect" on Slack card
- Authorize the application
- Should see "Connected" status

---

## 11. Notion Setup ✅

### Step 1: Create Notion Application
```
1. Go to: https://developers.notion.com
2. Log in/sign up
3. Click "Create new integration"
4. Name: "Bloo CRM Calendar"
5. Choose: Public integration
```

### Step 2: Configure OAuth
```
1. Go to "Distribution"
2. Enable "OAuth"
3. Set Redirect URIs:
   - http://localhost:3000/notion-callback.html
   - https://yourdomain.com/notion-callback.html
4. Copy Client ID and Client Secret
5. Set Capabilities: Read calendar, Write calendar
```

### Step 3: Store Credentials
```env
# In .env file:
NOTION_CLIENT_ID=YOUR_NOTION_CLIENT_ID
NOTION_CLIENT_SECRET=YOUR_NOTION_CLIENT_SECRET
APP_URL=http://localhost:3000
```

### Step 4: Test Connection
- Click "Connect" on Notion card
- Authorize the application
- Should see "Connected" status

---

## Environment Variables (.env File)

Create a `.env` file in `bloo-crm/backend/` with all credentials:

```env
# Calendly
CALENDLY_CLIENT_ID=YOUR_CALENDLY_CLIENT_ID
CALENDLY_CLIENT_SECRET=YOUR_CALENDLY_CLIENT_SECRET

# Google (Calendar & Gmail)
GMAIL_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET

# Outlook (Calendar & Email)
OUTLOOK_CLIENT_ID=YOUR_OUTLOOK_CLIENT_ID
OUTLOOK_CLIENT_SECRET=YOUR_OUTLOOK_CLIENT_SECRET
OUTLOOK_TENANT_ID=common

# Apple Calendar
APPLE_CALENDAR_CLIENT_ID=YOUR_APPLE_CLIENT_ID
APPLE_CALENDAR_TEAM_ID=YOUR_TEAM_ID
APPLE_CALENDAR_KEY_ID=YOUR_KEY_ID

# Zoom
ZOOM_CLIENT_ID=YOUR_ZOOM_CLIENT_ID
ZOOM_CLIENT_SECRET=YOUR_ZOOM_CLIENT_SECRET

# Monday.com
MONDAY_CLIENT_ID=YOUR_MONDAY_CLIENT_ID

# Asana
ASANA_CLIENT_ID=YOUR_ASANA_CLIENT_ID

# Trello
TRELLO_API_KEY=YOUR_TRELLO_API_KEY

# Microsoft Teams
TEAMS_CLIENT_ID=YOUR_TEAMS_CLIENT_ID
TEAMS_CLIENT_SECRET=YOUR_TEAMS_CLIENT_SECRET

# Slack
SLACK_CLIENT_ID=YOUR_SLACK_CLIENT_ID
SLACK_CLIENT_SECRET=YOUR_SLACK_CLIENT_SECRET

# Notion
NOTION_CLIENT_ID=YOUR_NOTION_CLIENT_ID
NOTION_CLIENT_SECRET=YOUR_NOTION_CLIENT_SECRET

# App Configuration
APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## Testing Calendar Connections

### Browser Console Tests
```javascript
// Check if calendar manager is initialized
console.log(calendarManager);

// Get all connections
console.log(calendarManager.getConnections());

// Get specific provider status
console.log(calendarManager.getLoginStatus('google-calendar'));
console.log(calendarManager.getLoginStatus('outlook-calendar'));

// Check all statuses
console.log(calendarManager.getAllStatus());

// Test sync
calendarManager.startSync('connection-id-here', { daysBack: 7 })
    .then(result => console.log('Sync started:', result))
    .catch(error => console.error('Sync error:', error));

// Get events
calendarManager.getCalendarEvents('connection-id-here')
    .then(events => console.log('Events:', events))
    .catch(error => console.error('Error:', error));
```

### Backend Tests
```bash
# Test Calendly token exchange
curl -X POST http://localhost:5000/api/calendar/oauth/callback/calendly \
  -H "Content-Type: application/json" \
  -d '{"code":"AUTH_CODE","state":"STATE_VALUE"}'

# Get connections
curl http://localhost:5000/api/calendar/connections

# Start sync
curl -X POST http://localhost:5000/api/calendar/sync/start/CONNECTION_ID \
  -H "Content-Type: application/json" \
  -d '{"daysBack":7,"maxResults":50,"includeAttendees":true}'

# Check sync status
curl http://localhost:5000/api/calendar/sync/status/SYNC_ID

# Get calendar events
curl http://localhost:5000/api/calendar/events/CONNECTION_ID
```

---

## Troubleshooting

### Calendly Issues

**Problem: "OAuth connection failed"**
- Cause: Invalid credentials or redirect URI mismatch
- Fix: Verify Client ID, Secret, and redirect URI match exactly

**Problem: "Invalid scope"**
- Cause: Requested scope not authorized
- Fix: Check Calendly app permissions

### Google Calendar Issues

**Problem: "Invalid state parameter"**
- Cause: CSRF validation failed
- Fix: Ensure callback URL matches exactly in Google Cloud Console

**Problem: "Access Denied"**
- Cause: Missing permissions or account restriction
- Fix: Grant calendar permissions when prompted

### Outlook Calendar Issues

**Problem: "AADSTS65001"**
- Cause: Admin consent required
- Fix: Go to Azure → API permissions → Grant admin consent

**Problem: "invalid_client"**
- Cause: Wrong Client ID or Secret
- Fix: Verify credentials in Azure portal

### Apple Calendar Issues

**Problem: "Invalid certificate"**
- Cause: Developer certificate expired
- Fix: Renew certificate in Apple Developer portal

### Zoom Issues

**Problem: "Invalid redirect_uri"**
- Cause: URI doesn't match exactly
- Fix: Check Zoom marketplace app settings

### Monday.com Issues

**Problem: "Failed to get board data"**
- Cause: Insufficient permissions
- Fix: Verify OAuth scopes include boards:read

### Asana Issues

**Problem: "Project not found"**
- Cause: Task timeline not available in this project
- Fix: Ensure project has timeline feature enabled

### Trello Issues

**Problem: "Invalid API key"**
- Cause: API key expired or revoked
- Fix: Generate new API key

### Microsoft Teams Issues

**Problem: "CalendarView requires timeMin parameter"**
- Cause: Filter date not specified
- Fix: Specify startDateTime in request

### Slack Issues

**Problem: "Missing channels:history scope"**
- Cause: Insufficient bot permissions
- Fix: Add required scopes in app configuration

### Notion Issues

**Problem: "Invalid database structure"**
- Cause: Page doesn't have calendar properties
- Fix: Create proper calendar database in Notion first

---

## Security Best Practices

1. **Never commit credentials** - Use `.env` file (add to `.gitignore`)
2. **Use HTTPS** - All OAuth redirects must use HTTPS in production
3. **Rotate API keys** - Periodically generate new API keys
4. **Limit scopes** - Request only necessary permissions
5. **Token expiration** - Tokens auto-refresh before expiry
6. **CORS validation** - Only whitelist trusted domains
7. **Audit logs** - Monitor connection and sync activities
8. **Encrypt sensitive data** - Store tokens encrypted in database

---

## Production Deployment Checklist

- [ ] Create `.env` file with production credentials
- [ ] Set `APP_URL` to production domain
- [ ] Update OAuth redirect URIs to production URLs in each provider
- [ ] Enable HTTPS on all OAuth callbacks
- [ ] Configure database for calendar connection storage
- [ ] Set up calendar sync background job (e.g., every hour)
- [ ] Enable audit logging
- [ ] Monitor sync failures and errors
- [ ] Set up alerting for expired tokens
- [ ] Test all provider connections in production
- [ ] Document internal API credentials in secure vault
- [ ] Set up rate limiting
- [ ] Enable request logging

---

## Support Resources

- **Calendly**: https://developer.calendly.com/
- **Google Calendar**: https://developers.google.com/calendar/api
- **Outlook Calendar**: https://docs.microsoft.com/en-us/graph/api/resources/event
- **Apple Calendar**: https://developer.apple.com/documentation/eventkit
- **Zoom**: https://developers.zoom.us/docs/api/rest/reference/
- **Monday.com**: https://developer.monday.com/docs
- **Asana**: https://developers.asana.com/docs
- **Trello**: https://developer.atlassian.com/cloud/trello
- **Microsoft Teams**: https://docs.microsoft.com/en-us/graph/api/resources/calendar
- **Slack**: https://api.slack.com/docs
- **Notion**: https://developers.notion.com/
