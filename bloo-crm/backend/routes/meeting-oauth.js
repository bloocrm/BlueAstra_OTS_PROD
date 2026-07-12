/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  Proprietary software. Unauthorized copying or use by any means or technology
  (including AI tools) is strictly prohibited.
*/
/* =====================================================
   SECURE SERVER-SIDE MEETING OAUTH (Microsoft Teams; provider-generic)
   Each advisor connects their own account. Authorization Code + PKCE, per-attempt
   state tied to the Bloo CRM user, tokens encrypted at rest and refreshed
   server-side. Meetings are created via the provider API on the advisor's behalf.
   Tokens never reach the frontend / URLs / logs / localStorage.
   ===================================================== */
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const OAuthState = require('../models/OAuthState');
const MeetingConnection = require('../models/MeetingConnection');
const { encryptToken, decryptToken } = require('../utils/token-vault');

const APP = () => (process.env.APP_URL || 'https://bloocrm.com').replace(/\/+$/, '');

const PROVIDERS = {
  microsoft: {
    label: 'Microsoft Teams',
    clientId: () => process.env.OUTLOOK_CLIENT_ID || process.env.MICROSOFT_CLIENT_ID,
    clientSecret: () => process.env.OUTLOOK_CLIENT_SECRET || process.env.MICROSOFT_CLIENT_SECRET,
    tenant: () => process.env.MICROSOFT_TENANT_ID || 'common',
    authUrl: function () { return `https://login.microsoftonline.com/${this.tenant()}/oauth2/v2.0/authorize`; },
    tokenUrl: function () { return `https://login.microsoftonline.com/${this.tenant()}/oauth2/v2.0/token`; },
    // Least privilege: create/read online meetings + basic profile.
    scopes: ['openid', 'profile', 'offline_access', 'User.Read', 'OnlineMeetings.ReadWrite'],
    authExtras: { response_mode: 'query', prompt: 'select_account' },
    refreshNeedsScope: true
  },
  google: {
    label: 'Google Meet',
    clientId: () => process.env.GOOGLE_CLIENT_ID,
    clientSecret: () => process.env.GOOGLE_CLIENT_SECRET,
    authUrl: () => 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: () => 'https://oauth2.googleapis.com/token',
    // Least privilege: create calendar events (which carry the Meet link) + identity.
    scopes: ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/calendar.events'],
    authExtras: { access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true' },
    refreshNeedsScope: false
  }
};
const cfg = (p) => PROVIDERS[p];
const redirectUri = (p) => `${APP()}/api/meeting-oauth/${p}/callback`;

const b64url = (b) => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function pkcePair() {
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}
function jwtClaims(jwt) {
  try { return JSON.parse(Buffer.from(String(jwt).split('.')[1], 'base64').toString('utf8')); } catch (e) { return {}; }
}
async function tokenRequest(provider, params) {
  const c = cfg(provider);
  const body = new URLSearchParams({ client_id: c.clientId(), client_secret: c.clientSecret(), ...params });
  const r = await fetch(c.tokenUrl(), { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error_description || d.error || 'token_request_failed');
  return d;
}

async function getValidAccessToken(conn) {
  if (conn.encryptedAccessToken && conn.tokenExpiresAt && conn.tokenExpiresAt.getTime() - 60000 > Date.now()) {
    return decryptToken(conn.encryptedAccessToken);
  }
  const refreshToken = conn.encryptedRefreshToken ? await decryptToken(conn.encryptedRefreshToken) : null;
  if (!refreshToken) { conn.connectionStatus = 'expired'; await conn.save(); throw new Error('no_refresh_token'); }
  try {
    const c = cfg(conn.provider);
    const params = { grant_type: 'refresh_token', refresh_token: refreshToken };
    if (c.refreshNeedsScope) params.scope = c.scopes.join(' ');
    const tok = await tokenRequest(conn.provider, params);
    conn.encryptedAccessToken = await encryptToken(tok.access_token);
    if (tok.refresh_token) conn.encryptedRefreshToken = await encryptToken(tok.refresh_token);
    conn.tokenExpiresAt = new Date(Date.now() + (tok.expires_in || 3600) * 1000);
    conn.connectionStatus = 'connected';
    conn.lastError = undefined;
    await conn.save();
    return tok.access_token;
  } catch (e) {
    conn.connectionStatus = 'revoked';
    conn.lastError = 'refresh_failed';
    await conn.save();
    throw new Error('revoked');
  }
}

// ---- Step 1: begin connection (authenticated advisor) ----
router.get('/:provider/connect', verifyToken, async (req, res) => {
  try {
    const provider = req.params.provider;
    const c = cfg(provider);
    if (!c) return res.status(400).json({ error: 'unknown_provider' });
    if (!c.clientId() || !c.clientSecret()) return res.status(503).json({ error: 'not_configured', message: `${c.label} OAuth app is not configured on the server.` });

    const state = b64url(crypto.randomBytes(32));
    const { verifier, challenge } = pkcePair();
    await OAuthState.create({ state, userId: req.userId, provider: `meeting-${provider}`, codeVerifier: verifier });

    const authUrl = `${c.authUrl()}?` + new URLSearchParams({
      client_id: c.clientId(),
      response_type: 'code',
      redirect_uri: redirectUri(provider),
      scope: c.scopes.join(' '),
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      ...c.authExtras
    }).toString();

    res.json({ status: 'success', authUrl });
  } catch (e) {
    console.error('meeting connect error:', e.message);
    res.status(500).json({ error: 'Failed to start connection' });
  }
});

// ---- Step 2: provider redirects here (public; user bound via state) ----
router.get('/:provider/callback', async (req, res) => {
  const provider = req.params.provider;
  const uiProvider = provider === 'google' ? 'google-meet' : 'microsoft-teams';
  const done = (ok, msg) => res.set('Content-Type', 'text/html').send(`<!doctype html><meta charset="utf-8"><body style="font-family:Segoe UI,Arial,sans-serif;text-align:center;padding:48px;color:#16233a">
    <h2>${ok ? '✅ Meeting account connected' : '⚠️ Connection failed'}</h2><p>${msg || (ok ? 'You can close this tab.' : '')}</p>
    <script>try{if(window.opener&&!window.opener.closed)window.opener.postMessage({type:'meeting-oauth-complete',provider:'${uiProvider}',success:${ok ? 'true' : 'false'}},location.origin);}catch(e){}
    setTimeout(function(){window.close();},600);</script></body>`);
  try {
    const c = cfg(provider);
    if (!c) return done(false, 'Unknown provider.');
    const { code, state, error, error_description } = req.query;
    if (error) return done(false, String(error_description || error).slice(0, 200));
    if (!code || !state) return done(false, 'Missing code/state.');

    const st = await OAuthState.findOneAndDelete({ state, provider: `meeting-${provider}` });
    if (!st) return done(false, 'State mismatch or expired — please try connecting again.');

    const tok = await tokenRequest(provider, {
      grant_type: 'authorization_code',
      code: String(code),
      redirect_uri: redirectUri(provider),
      code_verifier: st.codeVerifier
    });

    const claims = jwtClaims(tok.id_token);
    let email = claims.preferred_username || claims.email || '';
    let providerAccountId = claims.oid || claims.sub || '';
    const tenantId = claims.tid || (provider === 'microsoft' ? c.tenant() : undefined);
    if (!email || !providerAccountId) {
      if (provider === 'microsoft') {
        const me = await fetch('https://graph.microsoft.com/v1.0/me?$select=id,mail,userPrincipalName', { headers: { Authorization: `Bearer ${tok.access_token}` } }).then(r => r.json()).catch(() => ({}));
        email = email || me.mail || me.userPrincipalName || '';
        providerAccountId = providerAccountId || me.id || '';
      } else {
        const me = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${tok.access_token}` } }).then(r => r.json()).catch(() => ({}));
        email = email || me.email || '';
        providerAccountId = providerAccountId || me.sub || '';
      }
    }
    if (!email) return done(false, 'Could not read the account.');

    await MeetingConnection.findOneAndUpdate(
      { userId: st.userId, provider },
      {
        userId: st.userId, provider, email, providerAccountId, tenantId,
        encryptedAccessToken: await encryptToken(tok.access_token),
        encryptedRefreshToken: tok.refresh_token ? await encryptToken(tok.refresh_token) : undefined,
        tokenExpiresAt: new Date(Date.now() + (tok.expires_in || 3600) * 1000),
        scopes: (tok.scope ? tok.scope.split(' ') : c.scopes),
        connectionStatus: 'connected', lastError: null
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return done(true, `Connected ${email}.`);
  } catch (e) {
    console.error('meeting callback error:', e.message);
    return done(false, 'Something went wrong completing the connection.');
  }
});

// ---- Connection management (isolated by userId) ----
router.get('/connections', verifyToken, async (req, res) => {
  try {
    const conns = await MeetingConnection.find({ userId: req.userId })
      .select('provider email connectionStatus scopes tokenExpiresAt lastMeetingAt createdAt').sort({ createdAt: -1 });
    res.json({ status: 'success', connections: conns });
  } catch (e) { res.status(500).json({ error: 'Failed to list connections' }); }
});

router.delete('/connections/:id', verifyToken, async (req, res) => {
  try {
    const r = await MeetingConnection.deleteOne({ _id: req.params.id, userId: req.userId });
    res.json({ status: 'success', disconnected: r.deletedCount });
  } catch (e) { res.status(500).json({ error: 'Failed to disconnect' }); }
});

// ---- Create a meeting on the advisor's connected account ----
router.post('/connections/:id/create-meeting', verifyToken, async (req, res) => {
  try {
    const conn = await MeetingConnection.findOne({ _id: req.params.id, userId: req.userId });
    if (!conn) return res.status(404).json({ error: 'not_found' });

    let accessToken;
    try { accessToken = await getValidAccessToken(conn); }
    catch (e) { return res.status(409).json({ error: 'needs_reauth', connectionStatus: conn.connectionStatus }); }

    const b = req.body || {};
    const subject = (b.subject && String(b.subject).slice(0, 300)) || 'Bloo CRM Meeting';
    const start = b.startDateTime ? new Date(b.startDateTime) : new Date(Date.now() + 60 * 1000);
    const durationMin = Math.min(480, Math.max(15, parseInt(b.durationMinutes) || 60));
    const end = b.endDateTime ? new Date(b.endDateTime) : new Date(start.getTime() + durationMin * 60000);

    if (conn.provider === 'microsoft') {
      const r = await fetch('https://graph.microsoft.com/v1.0/me/onlineMeetings', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, startDateTime: start.toISOString(), endDateTime: end.toISOString() })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return res.status(502).json({ error: 'create_failed', message: (d.error && d.error.message) || 'Graph create failed' });
      conn.lastMeetingAt = new Date(); await conn.save();
      return res.json({ status: 'success', provider: 'microsoft-teams', joinUrl: d.joinWebUrl || d.joinUrl, subject, startDateTime: start.toISOString(), endDateTime: end.toISOString() });
    }

    if (conn.provider === 'google') {
      // A Google Meet link is created by attaching conferenceData to a Calendar event.
      const requestId = 'bloocrm-' + crypto.randomBytes(6).toString('hex');
      const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: subject,
          start: { dateTime: start.toISOString() },
          end: { dateTime: end.toISOString() },
          conferenceData: { createRequest: { requestId, conferenceSolutionKey: { type: 'hangoutsMeet' } } }
        })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return res.status(502).json({ error: 'create_failed', message: (d.error && d.error.message) || 'Calendar create failed' });
      const ep = (d.conferenceData && d.conferenceData.entryPoints) || [];
      const joinUrl = d.hangoutLink || (ep.find(e => e.entryPointType === 'video') || {}).uri;
      conn.lastMeetingAt = new Date(); await conn.save();
      return res.json({ status: 'success', provider: 'google-meet', joinUrl, subject, startDateTime: start.toISOString(), endDateTime: end.toISOString() });
    }

    return res.status(400).json({ error: 'unsupported_provider' });
  } catch (e) {
    console.error('create-meeting error:', e.message);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

module.exports = router;
