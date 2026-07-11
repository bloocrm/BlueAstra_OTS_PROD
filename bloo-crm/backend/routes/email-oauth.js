/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  Proprietary software. Unauthorized copying or use by any means or technology
  (including AI tools) is strictly prohibited.
*/
/* =====================================================
   SECURE SERVER-SIDE MICROSOFT (OUTLOOK) OAUTH
   Microsoft OAuth -> Node/Express backend -> encrypted token storage -> MongoDB.
   - Authorization Code + PKCE. State is random per attempt, tied to the initiating
     Bloo CRM user (OAuthState, TTL). Refresh tokens live server-side only.
   - Tokens are encrypted at rest (token-vault: KMS envelope or AES-256-GCM).
   - Tokens NEVER go to the frontend / URLs / logs / localStorage. Mail is fetched
     server-side. Each connection is isolated by our authenticated userId.
   ===================================================== */
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const OAuthState = require('../models/OAuthState');
const EmailConnection = require('../models/EmailConnection');
const Email = require('../models/Email');
const { encryptToken, decryptToken } = require('../utils/token-vault');

// Least-privilege Graph scopes for reading a mailbox.
const SCOPES = ['openid', 'profile', 'offline_access', 'User.Read', 'Mail.Read'];
const TENANT = () => process.env.MICROSOFT_TENANT_ID || 'common';
const CLIENT_ID = () => process.env.OUTLOOK_CLIENT_ID || process.env.MICROSOFT_CLIENT_ID;
const CLIENT_SECRET = () => process.env.OUTLOOK_CLIENT_SECRET || process.env.MICROSOFT_CLIENT_SECRET;
const REDIRECT_URI = () => `${(process.env.APP_URL || 'https://bloocrm.com').replace(/\/+$/, '')}/api/mailbox/microsoft/callback`;
const AUTH_URL = () => `https://login.microsoftonline.com/${TENANT()}/oauth2/v2.0/authorize`;
const TOKEN_URL = () => `https://login.microsoftonline.com/${TENANT()}/oauth2/v2.0/token`;

const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function pkcePair() {
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}
function jwtClaims(jwt) {
  try { return JSON.parse(Buffer.from(String(jwt).split('.')[1], 'base64').toString('utf8')); }
  catch (e) { return {}; }
}

async function tokenRequest(params) {
  const body = new URLSearchParams({ client_id: CLIENT_ID(), client_secret: CLIENT_SECRET(), ...params });
  const r = await fetch(TOKEN_URL(), { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(d.error_description || d.error || 'token_request_failed'); e.detail = d.error; throw e; }
  return d;
}

// Return a valid access token for a connection, refreshing server-side if needed.
// Reflects revoked/expired state on the connection. Never returns tokens to callers
// other than the trusted server code that makes Graph calls.
async function getValidAccessToken(conn) {
  if (conn.encryptedAccessToken && conn.tokenExpiresAt && conn.tokenExpiresAt.getTime() - 60000 > Date.now()) {
    return decryptToken(conn.encryptedAccessToken);
  }
  const refreshToken = conn.encryptedRefreshToken ? await decryptToken(conn.encryptedRefreshToken) : null;
  if (!refreshToken) { conn.connectionStatus = 'expired'; await conn.save(); throw new Error('no_refresh_token'); }
  try {
    const tok = await tokenRequest({ grant_type: 'refresh_token', refresh_token: refreshToken, scope: SCOPES.join(' ') });
    conn.encryptedAccessToken = await encryptToken(tok.access_token);
    if (tok.refresh_token) conn.encryptedRefreshToken = await encryptToken(tok.refresh_token);
    conn.tokenExpiresAt = new Date(Date.now() + (tok.expires_in || 3600) * 1000);
    conn.connectionStatus = 'connected';
    conn.lastError = undefined;
    await conn.save();
    return tok.access_token;
  } catch (e) {
    // Refresh failed => the user revoked access or the grant expired.
    conn.connectionStatus = 'revoked';
    conn.lastError = 'refresh_failed';
    await conn.save();
    throw new Error('revoked');
  }
}

// ---- Step 1: begin the connection (authenticated Bloo CRM user) ----------
router.get('/microsoft/connect', verifyToken, async (req, res) => {
  try {
    if (!CLIENT_ID() || !CLIENT_SECRET()) {
      return res.status(503).json({ error: 'not_configured', message: 'Microsoft OAuth app is not configured on the server.' });
    }
    const state = b64url(crypto.randomBytes(32));
    const { verifier, challenge } = pkcePair();
    await OAuthState.create({ state, userId: req.userId, provider: 'microsoft', codeVerifier: verifier });

    const authUrl = `${AUTH_URL()}?` + new URLSearchParams({
      client_id: CLIENT_ID(),
      response_type: 'code',
      redirect_uri: REDIRECT_URI(),
      response_mode: 'query',
      scope: SCOPES.join(' '),
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      prompt: 'select_account'
    }).toString();

    res.json({ status: 'success', authUrl });
  } catch (error) {
    console.error('microsoft/connect error:', error.message);
    res.status(500).json({ error: 'Failed to start connection' });
  }
});

// ---- Step 2: provider redirects here (public; user is bound via state) ----
router.get('/microsoft/callback', async (req, res) => {
  const done = (ok, msg) => res.set('Content-Type', 'text/html').send(`<!doctype html><meta charset="utf-8"><body style="font-family:Segoe UI,Arial,sans-serif;text-align:center;padding:48px;color:#16233a">
    <h2>${ok ? '✅ Mailbox connected' : '⚠️ Connection failed'}</h2>
    <p>${msg || (ok ? 'You can close this tab.' : '')}</p>
    <script>try{if(window.opener&&!window.opener.closed)window.opener.postMessage({type:'email-oauth-complete',provider:'outlook',success:${ok?'true':'false'}},location.origin);}catch(e){}
    setTimeout(function(){window.close();},600);setTimeout(function(){location.href='/email-client.html';},1400);</script></body>`);
  try {
    const { code, state, error, error_description } = req.query;
    if (error) return done(false, String(error_description || error).slice(0, 200));
    if (!code || !state) return done(false, 'Missing code/state.');

    // Validate + consume the one-time state (CSRF protection, per-connection).
    const st = await OAuthState.findOneAndDelete({ state });
    if (!st) return done(false, 'State mismatch or expired — please try connecting again.');

    // Exchange the code (with PKCE verifier) for tokens — server-side, with secret.
    const tok = await tokenRequest({
      grant_type: 'authorization_code',
      code: String(code),
      redirect_uri: REDIRECT_URI(),
      code_verifier: st.codeVerifier,
      scope: SCOPES.join(' ')
    });

    // Identify the mailbox (never trust the frontend for this).
    const claims = jwtClaims(tok.id_token);
    let email = claims.preferred_username || claims.email || '';
    let providerAccountId = claims.oid || claims.sub || '';
    const tenantId = claims.tid || TENANT();
    if (!email || !providerAccountId) {
      const me = await fetch('https://graph.microsoft.com/v1.0/me?$select=id,mail,userPrincipalName', {
        headers: { Authorization: `Bearer ${tok.access_token}` }
      }).then(r => r.json()).catch(() => ({}));
      email = email || me.mail || me.userPrincipalName || '';
      providerAccountId = providerAccountId || me.id || '';
    }
    if (!email) return done(false, 'Could not read the mailbox address.');

    await EmailConnection.findOneAndUpdate(
      { userId: st.userId, provider: 'microsoft', email },
      {
        userId: st.userId, provider: 'microsoft', email, providerAccountId, tenantId,
        encryptedAccessToken: await encryptToken(tok.access_token),
        encryptedRefreshToken: tok.refresh_token ? await encryptToken(tok.refresh_token) : undefined,
        tokenExpiresAt: new Date(Date.now() + (tok.expires_in || 3600) * 1000),
        scopes: (tok.scope ? tok.scope.split(' ') : SCOPES),
        connectionStatus: 'connected',
        lastError: null
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return done(true, `Connected ${email}.`);
  } catch (error) {
    console.error('microsoft/callback error:', error.message);
    return done(false, 'Something went wrong completing the connection.');
  }
});

// ---- Connection management (authenticated, isolated by userId) ------------
router.get('/connections', verifyToken, async (req, res) => {
  try {
    const conns = await EmailConnection.find({ userId: req.userId })
      .select('provider email connectionStatus scopes tokenExpiresAt lastSyncAt createdAt')
      .sort({ createdAt: -1 });
    res.json({ status: 'success', connections: conns });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list connections' });
  }
});

router.delete('/connections/:id', verifyToken, async (req, res) => {
  try {
    const r = await EmailConnection.deleteOne({ _id: req.params.id, userId: req.userId });
    res.json({ status: 'success', disconnected: r.deletedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

// ---- Server-side sync: fetch all folders with the server-held token -------
const GRAPH_FOLDERS = [
  ['inbox', 'inbox'], ['sentitems', 'sent'], ['drafts', 'drafts'],
  ['deleteditems', 'trash'], ['archive', 'archive'], ['junkemail', 'spam']
];

router.post('/connections/:id/sync', verifyToken, async (req, res) => {
  try {
    const conn = await EmailConnection.findOne({ _id: req.params.id, userId: req.userId });
    if (!conn) return res.status(404).json({ error: 'not_found' });

    let accessToken;
    try { accessToken = await getValidAccessToken(conn); }
    catch (e) { return res.status(409).json({ error: 'needs_reauth', connectionStatus: conn.connectionStatus }); }

    const perFolder = Math.min(50, Math.max(5, parseInt(req.body && req.body.perFolder) || 25));
    const select = '$select=id,subject,from,toRecipients,receivedDateTime,sentDateTime,bodyPreview,isRead,hasAttachments';
    const expand = '$expand=attachments($select=id,name,contentType,size)';
    let stored = 0;

    for (const [graphName, folder] of GRAPH_FOLDERS) {
      try {
        const url = `https://graph.microsoft.com/v1.0/me/mailFolders/${graphName}/messages?$top=${perFolder}&${select}&${expand}`;
        const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!r.ok) continue;   // folder may not exist (e.g. Archive) — skip
        const data = await r.json();
        for (const m of (data.value || [])) {
          const addr = m.from && m.from.emailAddress;
          await Email.findOneAndUpdate(
            { userId: req.userId, provider: 'outlook', externalId: String(m.id) },
            {
              userId: req.userId, provider: 'outlook', externalId: String(m.id),
              messageId: `outlook:${m.id}`,
              from: { email: (addr && addr.address) || '', name: (addr && addr.name) || '' },
              to: (m.toRecipients || []).map(t => ({ email: t.emailAddress && t.emailAddress.address })).filter(x => x.email),
              subject: m.subject || '(No subject)',
              body: m.bodyPreview || '', bodyPlain: m.bodyPreview || '',
              receivedDate: new Date(m.receivedDateTime || m.sentDateTime || Date.now()),
              isRead: !!m.isRead, hasAttachments: !!m.hasAttachments,
              attachments: (m.attachments || []).map(a => ({ filename: a.name || 'attachment', mimetype: a.contentType || '', size: a.size || 0, attachmentId: a.id || '' })),
              folder, isDraft: folder === 'drafts', syncedAt: new Date()
            },
            { upsert: true, setDefaultsOnInsert: true }
          );
          stored++;
        }
      } catch (e) { console.warn(`sync folder ${graphName} skipped:`, e.message); }
    }

    conn.lastSyncAt = new Date();
    await conn.save();
    res.json({ status: 'success', stored });
  } catch (error) {
    console.error('mailbox sync error:', error.message);
    res.status(500).json({ error: 'Sync failed' });
  }
});

module.exports = router;
