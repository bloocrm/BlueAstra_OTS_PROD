# Webex SSO Integration Guide

## Overview

This guide helps you set up Single Sign-On (SSO) with Webex so users can:
- Log in with their Webex account once
- Maintain persistent sessions automatically
- Create meetings directly from the app without re-authenticating
- Session persists across page refreshes and browser restarts

## Step 1: Create Webex OAuth Application

### 1.1 Go to Webex Developer Portal
- Visit: https://developer.webex.com/
- Sign in with your Webex account (or create one)

### 1.2 Create a New Application
1. Click on "My Webex Apps" in the top menu
2. Click "Create a New App"
3. Select "Create an Integration"
4. Fill in the form:
   - **Integration Name:** Bloo CRM Meeting Manager
   - **Description:** Enables SSO for creating Webex meetings
   - **Redirect URI(s):** `http://localhost:3000/webex-callback.html`
     (For production, use: `https://yourdomain.com/webex-callback.html`)

### 1.3 Get Your Credentials
After creating the app, you'll see:
- **Client ID** - Copy this
- **Client Secret** - Copy this (keep this secret!)
- **Redirect URI** - Should match what you entered

## Step 2: Store Credentials

### 2.1 In Local Storage (For Development)
Open browser console and run:
```javascript
localStorage.setItem('webexClientId', 'YOUR_CLIENT_ID_HERE');
localStorage.setItem('webexClientSecret', 'YOUR_CLIENT_SECRET_HERE');
```

### 2.2 In Environment Variables (For Production)
Add to `bloo-crm/backend/.env`:
```bash
WEBEX_CLIENT_ID=YOUR_CLIENT_ID_HERE
WEBEX_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
WEBEX_REDIRECT_URI=https://yourdomain.com/webex-callback.html
```

### 2.3 Update webex-sso.js (Production)
In `bloo-crm/frontend/js/webex-sso.js`, line 8-9:
```javascript
this.clientId = process.env.WEBEX_CLIENT_ID || localStorage.getItem('webexClientId');
this.clientSecret = process.env.WEBEX_CLIENT_SECRET || localStorage.getItem('webexClientSecret');
```

## Step 3: File Structure

New files created:
```
bloo-crm/
├── frontend/
│   ├── js/
│   │   └── webex-sso.js                 ← Webex SSO handler
│   └── webex-callback.html              ← OAuth callback page
└── index.html                           ← Updated with Webex button
```

## Step 4: How It Works

### User Flow

1. **User clicks "Webex Login" button** in header
   - Button only shows if not logged in
   
2. **Redirected to Webex login** (webexapis.com)
   - User authenticates with Webex
   
3. **Redirects back to webex-callback.html**
   - App exchanges authorization code for access token
   - Token stored in sessionStorage
   
4. **User sees status** "✅ Logged in as [Name]"
   - "Webex Login" button disappears
   - "Webex Logout" button appears
   
5. **Click "Create Meeting"**
   - Uses Webex SSO session to create meeting
   - No additional login needed
   
6. **Meeting created directly in Webex**
   - Session persists across page refreshes
   - Tokens auto-refresh before expiry

### Session Persistence

**Session Storage (Cleared on browser close):**
- `webexAccessToken` - Current access token
- `webexRefreshToken` - Token to refresh expired access
- `webexTokenExpiresAt` - Token expiry timestamp
- `webexUser` - Cached user information

**Automatic Token Refresh:**
- Tokens automatically refresh before expiry
- User stays logged in without action
- Old token used if refresh fails

## Step 5: Testing

### Test SSO Login

1. **Clear existing session:**
   ```javascript
   sessionStorage.clear();
   localStorage.clear();
   ```

2. **Set credentials in console:**
   ```javascript
   localStorage.setItem('webexClientId', 'YOUR_CLIENT_ID');
   localStorage.setItem('webexClientSecret', 'YOUR_CLIENT_SECRET');
   ```

3. **Refresh page**
   - Should see "Webex Login" button in header

4. **Click "Webex Login"**
   - Should redirect to Webex login page
   - After login, should redirect back to callback page
   - Should show "✅ Logged in as [Your Name]"

### Test Meeting Creation

1. **Stay on page after login**
   - Status should show your Webex name

2. **Navigate to Meeting Room**
   - Click "Create Cisco Webex Meeting" button
   - Fill in any details (validation disabled)
   - Click "Create Meeting"

3. **Meeting should be created**
   - Should see success notification
   - Meeting URL and details should display

### Test Session Persistence

1. **After login, refresh page**
   - Should remain logged in
   - Should not need to re-authenticate

2. **Close browser and reopen**
   - Session is cleared (browsers close sessionStorage)
   - Will need to log in again (this is intentional for security)

3. **Close tab, open new tab**
   - With same browser instance: session persists
   - Can create meetings in new tab without re-login

## Step 6: Webex API Scopes

The integration requests these permissions:
- `spark:all` - Full Webex access
- `spark:kms` - Encryption support

These allow:
- Creating meetings
- Reading meeting info
- Managing participants
- Recording meetings

## Troubleshooting

### Issue: "Client ID not set"
**Solution:** Set credentials in localStorage:
```javascript
localStorage.setItem('webexClientId', 'your_client_id');
```

### Issue: "Redirect URI mismatch"
**Error:** "The 'redirect_uri' parameter does not match..."
**Solution:** 
1. Go to Webex app settings
2. Make sure Redirect URI exactly matches:
   - For dev: `http://localhost:3000/webex-callback.html`
   - For prod: `https://yourdomain.com/webex-callback.html`

### Issue: "Invalid authorization code"
**Cause:** Code already used or expired
**Solution:** Try logging in again

### Issue: "Token expired" after refresh
**Cause:** Refresh token also expired
**Solution:** User needs to log in again with Webex

### Issue: Meeting not created
**Check:**
1. Is user logged in? (Check header status)
2. Are there network errors? (Check browser console)
3. Did Webex API reject the request? (Check console logs)

## Advanced Features

### Get Recent Meetings
```javascript
const meetings = await webexSSO.getRecentMeetings(5);
```

### Manual Token Refresh
```javascript
await webexSSO.refreshAccessToken();
```

### Check Login Status
```javascript
if (webexSSO.isUserLoggedIn()) {
    console.log('User:', webexSSO.user.displayName);
}
```

### Listen to Events
```javascript
webexSSO.on('login-success', (user) => {
    console.log('Logged in:', user.displayName);
});

webexSSO.on('logout', () => {
    console.log('Logged out');
});

webexSSO.on('token-refreshed', () => {
    console.log('Token refreshed');
});
```

## Security Considerations

### ⚠️ Important

1. **Never expose Client Secret in frontend code**
   - Only store in backend .env
   - Current implementation stores in localStorage for dev only
   - For production, use backend OAuth server

2. **HTTPS Required for Production**
   - Webex requires HTTPS redirects
   - Use valid SSL certificate

3. **State Parameter**
   - Prevents CSRF attacks
   - Automatically handled by webex-sso.js

4. **Token Storage**
   - Tokens stored in sessionStorage (cleared on browser close)
   - Not stored in localStorage (prevents persistent XSS exposure)

## Production Deployment

For production, implement backend OAuth endpoint:

```javascript
// Backend endpoint: POST /api/webex/token
app.post('/api/webex/token', async (req, res) => {
    const { code } = req.body;
    
    const response = await fetch('https://webexapis.com/v1/access_token', {
        method: 'POST',
        body: new URLSearchParams({
            client_id: process.env.WEBEX_CLIENT_ID,
            client_secret: process.env.WEBEX_CLIENT_SECRET,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: process.env.WEBEX_REDIRECT_URI
        })
    });
    
    return res.json(response.json());
});
```

Then update webex-sso.js to use backend endpoint instead of direct API call.

## API Reference

### WebexSSO Class

```javascript
// Methods
webexSSO.startSSOLogin()                    // Start OAuth flow
webexSSO.isUserLoggedIn()                   // Check login status
webexSSO.getCurrentUser()                   // Get user info
webexSSO.createMeeting(config)              // Create meeting
webexSSO.getRecentMeetings(limit)           // Get recent meetings
webexSSO.refreshAccessToken()               // Refresh token
webexSSO.logout()                           // Logout

// Properties
webexSSO.user                               // Current user object
webexSSO.accessToken                        // Current access token
webexSSO.isLoggedIn                         // Boolean login status

// Events
webexSSO.on('login-success', callback)      // Login successful
webexSSO.on('logout', callback)             // Logout occurred
webexSSO.on('session-active', callback)     // Session active
webexSSO.on('token-refreshed', callback)    // Token refreshed
webexSSO.on('meeting-created', callback)    // Meeting created
webexSSO.on('error', callback)              // Error occurred
```

## Support

For more information:
- Webex API Docs: https://developer.webex.com/docs/api/v1
- OAuth Guide: https://developer.webex.com/docs/getting-started
- SDK Reference: https://webexapis.com/v1/docs

---

**Status:** ✅ Webex SSO Implementation Complete
