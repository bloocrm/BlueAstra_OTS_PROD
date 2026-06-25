/* =====================================================
   EMAIL SYNC BACKEND ROUTES
   ===================================================== */

const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const crypto = require('crypto');

// Email Connection Storage (In production, use database)
let emailConnections = new Map();

// OAuth Token Exchange Routes

router.post('/email/oauth/callback/:provider', async (req, res) => {
    try {
        const { provider } = req.params;
        const { code, state } = req.body;
        const userId = req.user?.id || 'default-user';

        console.log(`Processing OAuth callback for ${provider}`);

        // Validate state parameter (CSRF protection)
        const savedState = req.session?.oauthState || {};
        if (state !== savedState[provider]) {
            return res.status(400).json({ error: 'Invalid state parameter - CSRF validation failed' });
        }

        let tokenData;

        if (provider === 'gmail') {
            tokenData = await exchangeGmailCode(code, req);
        } else if (provider === 'outlook') {
            tokenData = await exchangeOutlookCode(code, req);
        } else if (provider === 'yahoo') {
            tokenData = await exchangeYahooCode(code, req);
        } else if (provider === 'protonmail') {
            tokenData = await exchangeProtonMailCode(code, req);
        } else {
            return res.status(400).json({ error: 'Unknown provider' });
        }

        // Store connection
        const connectionId = 'conn_' + Date.now() + '_' + Math.random().toString(36).substring(7);
        emailConnections.set(connectionId, {
            id: connectionId,
            userId,
            provider,
            email: tokenData.email,
            accessToken: tokenData.accessToken,
            refreshToken: tokenData.refreshToken,
            tokenExpiresAt: tokenData.expiresAt,
            connectedAt: new Date().toISOString()
        });

        res.json({
            status: 'success',
            connectionId,
            provider,
            email: tokenData.email,
            message: `Successfully connected to ${provider}`
        });
    } catch (error) {
        console.error('OAuth callback error:', error);
        res.status(500).json({ error: 'Token exchange failed', message: error.message });
    }
});

// Token Refresh Route
router.post('/email/oauth/refresh/:connectionId', async (req, res) => {
    try {
        const { connectionId } = req.params;
        const connection = emailConnections.get(connectionId);

        if (!connection) {
            return res.status(404).json({ error: 'Connection not found' });
        }

        // Check if token needs refresh
        if (connection.tokenExpiresAt > Date.now()) {
            return res.json({
                status: 'valid',
                accessToken: connection.accessToken,
                expiresIn: Math.floor((connection.tokenExpiresAt - Date.now()) / 1000)
            });
        }

        // Refresh token based on provider
        let newTokenData;

        if (connection.provider === 'gmail') {
            newTokenData = await refreshGmailToken(connection);
        } else if (connection.provider === 'outlook') {
            newTokenData = await refreshOutlookToken(connection);
        } else if (connection.provider === 'yahoo') {
            newTokenData = await refreshYahooToken(connection);
        } else {
            return res.status(400).json({ error: 'Provider does not support token refresh' });
        }

        // Update connection
        connection.accessToken = newTokenData.accessToken;
        connection.tokenExpiresAt = newTokenData.expiresAt;
        if (newTokenData.refreshToken) {
            connection.refreshToken = newTokenData.refreshToken;
        }

        res.json({
            status: 'refreshed',
            accessToken: newTokenData.accessToken,
            expiresIn: Math.floor((newTokenData.expiresAt - Date.now()) / 1000)
        });
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({ error: 'Token refresh failed', message: error.message });
    }
});

// Email Sync Routes

router.post('/email/sync/start/:connectionId', async (req, res) => {
    try {
        const { connectionId } = req.params;
        const { daysBack = 30, maxResults = 100 } = req.body;

        const connection = emailConnections.get(connectionId);
        if (!connection) {
            return res.status(404).json({ error: 'Connection not found' });
        }

        const syncId = 'sync_' + Date.now();
        const syncDate = new Date(Date.now() - daysBack * 24 * 3600 * 1000);

        console.log(`Starting email sync for ${connection.provider} - ${connectionId}`);

        // Start async sync process
        startEmailSync(syncId, connection, syncDate, maxResults).catch(error => {
            console.error('Sync error:', error);
        });

        res.json({
            syncId,
            status: 'started',
            provider: connection.provider,
            email: connection.email,
            syncDate: syncDate.toISOString(),
            message: `Sync started for ${connection.email}`
        });
    } catch (error) {
        console.error('Sync start error:', error);
        res.status(500).json({ error: 'Failed to start sync', message: error.message });
    }
});

router.get('/email/sync/status/:syncId', (req, res) => {
    const { syncId } = req.params;

    // This would normally query sync status from database
    res.json({
        syncId,
        status: 'in-progress',
        progress: Math.floor(Math.random() * 80) + 10,
        downloaded: Math.floor(Math.random() * 50) + 10,
        total: 100,
        estimatedTime: '2 minutes remaining'
    });
});

// Connection Management Routes

router.get('/email/connections', (req, res) => {
    const userId = req.user?.id || 'default-user';
    const userConnections = Array.from(emailConnections.values()).filter(c => c.userId === userId);

    res.json({
        status: 'success',
        connections: userConnections.map(c => ({
            id: c.id,
            provider: c.provider,
            email: c.email,
            status: c.tokenExpiresAt > Date.now() ? 'connected' : 'token-expired',
            connectedAt: c.connectedAt,
            lastSync: c.lastSync || null
        }))
    });
});

router.post('/email/disconnect/:connectionId', (req, res) => {
    const { connectionId } = req.params;

    if (emailConnections.has(connectionId)) {
        emailConnections.delete(connectionId);
        res.json({ status: 'success', message: 'Connection removed' });
    } else {
        res.status(404).json({ error: 'Connection not found' });
    }
});

// OAuth Code Exchange Functions

async function exchangeGmailCode(code, req) {
    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;
    const redirectUri = `${process.env.APP_URL}/gmail-callback.html`;

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
        })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error_description || 'Gmail token exchange failed');

    // Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { 'Authorization': `Bearer ${data.access_token}` }
    });
    const userData = await userResponse.json();

    return {
        email: userData.email,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + (data.expires_in * 1000)
    };
}

async function exchangeOutlookCode(code, req) {
    const clientId = process.env.OUTLOOK_CLIENT_ID;
    const clientSecret = process.env.OUTLOOK_CLIENT_SECRET;
    const redirectUri = `${process.env.APP_URL}/outlook-callback.html`;
    const tenantId = process.env.OUTLOOK_TENANT_ID || 'common';

    const response = await fetch(
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                code,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
                scope: 'Mail.Read User.Read offline_access'
            })
        }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.error_description || 'Outlook token exchange failed');

    // Get user info
    const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { 'Authorization': `Bearer ${data.access_token}` }
    });
    const userData = await userResponse.json();

    return {
        email: userData.mail || userData.userPrincipalName,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + (data.expires_in * 1000)
    };
}

async function exchangeYahooCode(code, req) {
    const clientId = process.env.YAHOO_CLIENT_ID;
    const clientSecret = process.env.YAHOO_CLIENT_SECRET;
    const redirectUri = `${process.env.APP_URL}/yahoo-callback.html`;

    const response = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
        })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error_description || 'Yahoo token exchange failed');

    // Get user info
    const userResponse = await fetch('https://social.yahooapis.com/v1/me/profile?format=json', {
        headers: { 'Authorization': `Bearer ${data.access_token}` }
    });
    const userData = await userResponse.json();

    return {
        email: userData.profile.emails[0].handle,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + (data.expires_in * 1000)
    };
}

async function exchangeProtonMailCode(code, req) {
    const clientId = process.env.PROTONMAIL_CLIENT_ID;
    const clientSecret = process.env.PROTONMAIL_CLIENT_SECRET;
    const redirectUri = `${process.env.APP_URL}/protonmail-callback.html`;

    const response = await fetch('https://mail.protonmail.com/api/auth/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
        })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'ProtonMail token exchange failed');

    // Get user info
    const userResponse = await fetch('https://mail.protonmail.com/api/auth/currentuser', {
        headers: { 'Authorization': `Bearer ${data.access_token}` }
    });
    const userData = await userResponse.json();

    return {
        email: userData.User.Email,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + (data.expires_in * 1000)
    };
}

// Token Refresh Functions

async function refreshGmailToken(connection) {
    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: connection.refreshToken,
            grant_type: 'refresh_token'
        })
    });

    const data = await response.json();
    if (!response.ok) throw new Error('Gmail token refresh failed');

    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || connection.refreshToken,
        expiresAt: Date.now() + (data.expires_in * 1000)
    };
}

async function refreshOutlookToken(connection) {
    const clientId = process.env.OUTLOOK_CLIENT_ID;
    const clientSecret = process.env.OUTLOOK_CLIENT_SECRET;
    const tenantId = process.env.OUTLOOK_TENANT_ID || 'common';

    const response = await fetch(
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: connection.refreshToken,
                grant_type: 'refresh_token',
                scope: 'Mail.Read User.Read offline_access'
            })
        }
    );

    const data = await response.json();
    if (!response.ok) throw new Error('Outlook token refresh failed');

    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || connection.refreshToken,
        expiresAt: Date.now() + (data.expires_in * 1000)
    };
}

async function refreshYahooToken(connection) {
    const clientId = process.env.YAHOO_CLIENT_ID;
    const clientSecret = process.env.YAHOO_CLIENT_SECRET;

    const response = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: connection.refreshToken,
            grant_type: 'refresh_token'
        })
    });

    const data = await response.json();
    if (!response.ok) throw new Error('Yahoo token refresh failed');

    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || connection.refreshToken,
        expiresAt: Date.now() + (data.expires_in * 1000)
    };
}

// Email Sync Function
async function startEmailSync(syncId, connection, startDate, maxResults) {
    try {
        console.log(`Syncing emails for ${connection.email} starting from ${startDate}`);

        let emails = [];

        if (connection.provider === 'gmail') {
            emails = await syncGmailEmails(connection, startDate, maxResults);
        } else if (connection.provider === 'outlook') {
            emails = await syncOutlookEmails(connection, startDate, maxResults);
        } else if (connection.provider === 'yahoo') {
            emails = await syncYahooEmails(connection, startDate, maxResults);
        }

        // Store sync result
        connection.lastSync = new Date().toISOString();
        console.log(`Synced ${emails.length} emails for ${connection.email}`);

        return { syncId, status: 'completed', count: emails.length };
    } catch (error) {
        console.error(`Email sync error for ${connection.email}:`, error);
        throw error;
    }
}

// Provider-specific Email Sync Functions

async function syncGmailEmails(connection, startDate, maxResults) {
    const query = `after:${Math.floor(startDate.getTime() / 1000)}`;

    const response = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
        { headers: { 'Authorization': `Bearer ${connection.accessToken}` } }
    );

    const data = await response.json();
    return data.messages || [];
}

async function syncOutlookEmails(connection, startDate, maxResults) {
    const filterDate = startDate.toISOString().split('T')[0];

    const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$filter=receivedDateTime ge ${filterDate}&$top=${maxResults}`,
        { headers: { 'Authorization': `Bearer ${connection.accessToken}` } }
    );

    const data = await response.json();
    return data.value || [];
}

async function syncYahooEmails(connection, startDate, maxResults) {
    // Yahoo Mail API sync implementation
    // This would use Yahoo's mail API endpoints
    return [];
}

module.exports = router;
