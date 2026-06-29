# Webex SSO - Quick Start Guide

## What's New

✅ **SSO Integration Added** - Users can now log in with their Webex account once and maintain persistent sessions

✅ **Persistent Sessions** - Session stays active across page refreshes (within same browser session)

✅ **Auto Token Refresh** - Tokens automatically refresh before expiry

✅ **One-Click Meeting Creation** - Create meetings directly using Webex SSO session

## Quick Setup (5 minutes)

### Step 1: Get Webex OAuth Credentials
1. Go to https://developer.webex.com/
2. Sign in (or create account)
3. Click "My Webex Apps" → "Create a New App" → "Create an Integration"
4. Fill form:
   - Name: `Bloo CRM Meeting Manager`
   - Redirect URI: `http://localhost:3000/webex-callback.html`
5. Copy **Client ID** and **Client Secret**

### Step 2: Store Credentials (Development)
Open browser console (F12) and run:
```javascript
localStorage.setItem('webexClientId', 'PASTE_YOUR_CLIENT_ID_HERE');
localStorage.setItem('webexClientSecret', 'PASTE_YOUR_CLIENT_SECRET_HERE');
```

### Step 3: Restart & Test
1. Refresh the page
2. You should see **"Webex Login"** button in top right header
3. Click it → authenticate with Webex → should redirect back
4. Button should change to **"✅ Logged in as Your Name"**

## Testing the Feature

### Test 1: Login
```
Click "Webex Login" button → Sign in with Webex → Should redirect back
Status: "✅ Logged in as Your Name"
```

### Test 2: Create Meeting
```
1. Click "Start Meeting" or "Create Cisco Webex Meeting"
2. Fill any details (no validation)
3. Click "Create Meeting"
4. Should show success and meeting URL
```

### Test 3: Session Persistence
```
1. Stay on page after login
2. Refresh page (Ctrl+R) → Should stay logged in
3. No need to log in again
```

### Test 4: Logout
```
Click "Webex Logout" button → Should clear session
Status: "⚠️ Not connected to Webex"
```

## Files Added/Modified

**New Files:**
- `frontend/js/webex-sso.js` - Webex SSO handler (270 lines)
- `frontend/webex-callback.html` - OAuth callback page
- `WEBEX_SSO_SETUP.md` - Detailed setup guide

**Modified Files:**
- `frontend/index.html` - Added webex-sso.js script & login button
- `frontend/js/meeting-room.js` - Updated to use Webex SSO for meeting creation

## Key Features

### ✅ Session Persistence
- User logs in once
- Session maintained across page refreshes
- Automatic token refresh before expiry

### ✅ One-Click Meetings
- Click "Create Meeting"
- Uses existing Webex session
- No additional login needed

### ✅ Smart Status Display
- Shows login status in header
- "Webex Login" button when not logged in
- "✅ Logged in as [Name]" when connected
- "Webex Logout" button to disconnect

### ✅ Automatic Token Management
- Tokens auto-refresh before expiry
- No user action needed
- Transparent to user

### ✅ Event System
- Login success events
- Session active detection
- Token refresh events
- Error handling

## Architecture

```
User Browser
    ↓
[Webex Login Button] → Redirects to Webex OAuth
    ↓
Webex.com Authentication
    ↓
Redirects to webex-callback.html
    ↓
Exchange code for token
    ↓
Store in sessionStorage
    ↓
User sees "Logged in" status
    ↓
Click "Create Meeting"
    ↓
Use Webex SSO token to create meeting
    ↓
Meeting created in user's Webex account
```

## Session Storage

When logged in, these are stored in browser:
- `webexAccessToken` - Current access token (valid for 1 hour)
- `webexRefreshToken` - Refresh token (valid for 90 days)
- `webexTokenExpiresAt` - Expiry timestamp
- `webexUser` - User info (name, email, etc)

**Cleared when:**
- Browser closes
- User clicks "Webex Logout"
- Token refresh fails

## FAQ

### Q: Do I need a Webex account?
**A:** Yes, to get OAuth credentials. Free account is fine.

### Q: Is my password stored?
**A:** No! Only OAuth tokens are stored. Password is never seen.

### Q: Why does session clear when I close browser?
**A:** Intentional for security. Tokens stored in sessionStorage (cleared on close).

### Q: Can I stay logged in for days?
**A:** Yes, but requires browser session to stay open. If you close browser, you need to log in again.

### Q: What if token expires?
**A:** Automatically refreshed before expiry. User won't notice.

### Q: Can multiple users use same app?
**A:** Yes! Each user logs in separately with their own Webex account.

### Q: Is production setup different?
**A:** Yes, should use backend OAuth endpoint (see WEBEX_SSO_SETUP.md for details).

## Commands for Testing

```javascript
// Check if logged in
webexSSO.isUserLoggedIn()

// Get current user
console.log(webexSSO.user)

// Manually trigger refresh
await webexSSO.refreshAccessToken()

// Check tokens
console.log(sessionStorage.getItem('webexAccessToken'))

// Clear session manually
sessionStorage.clear()

// Listen to events
webexSSO.on('login-success', (user) => console.log('Logged in:', user))
webexSSO.on('logout', () => console.log('Logged out'))
```

## Browser Console Debugging

Open F12 → Console tab and look for:

✅ `Initializing Webex SSO...` - SSO starting
✅ `API Client initialized: /api` - Ready
✅ `Valid Webex session found` - Session detected
✅ `OAuth callback - Code: ...` - Callback received
✅ `✅ Authentication successful, redirecting...` - Login worked
✅ `✅ Webex SSO Login successful` - All good

❌ If errors:
- `ClientId not set` → Set in localStorage
- `Redirect URI mismatch` → Check Webex app settings
- `Invalid authorization code` → Try login again

## Production Checklist

- [ ] Use HTTPS (required by Webex)
- [ ] Store Client Secret in backend .env only
- [ ] Update Redirect URI to production domain
- [ ] Implement backend OAuth endpoint (see guide)
- [ ] Update Webex app settings with production URI
- [ ] Test with real Webex accounts
- [ ] Set up token refresh mechanism
- [ ] Monitor API usage and errors
- [ ] Have error handling/support plan

---

**Ready to test?** Set your credentials and refresh the page! 🚀
