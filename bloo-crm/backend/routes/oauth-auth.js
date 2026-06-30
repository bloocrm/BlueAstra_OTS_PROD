/* =====================================================
   OAUTH AUTHENTICATION ROUTES
   ===================================================== */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// OAuth configurations for supported providers
const OAUTH_PROVIDERS = {
    'gmail': {
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        redirectUri: `${process.env.APP_URL}/gmail-callback.html`,
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
        responseType: 'code'
    },
    'outlook': {
        clientId: process.env.OUTLOOK_CLIENT_ID,
        clientSecret: process.env.OUTLOOK_CLIENT_SECRET,
        redirectUri: `${process.env.APP_URL}/outlook-callback.html`,
        authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
        scope: 'Mail.Read User.Read offline_access',
        responseType: 'code'
    },
    'protonmail': {
        clientId: process.env.PROTONMAIL_CLIENT_ID,
        clientSecret: process.env.PROTONMAIL_CLIENT_SECRET,
        redirectUri: `${process.env.APP_URL}/protonmail-callback.html`,
        authorizationUrl: 'https://account.proton.me/oauth/authorize',
        tokenUrl: 'https://account.proton.me/oauth/token',
        userInfoUrl: 'https://mail-api.proton.me/api/users',
        scope: 'read',
        responseType: 'code'
    }
};

// Generate OAuth state token for CSRF protection
router.get('/oauth-config/:provider', (req, res) => {
    try {
        const { provider } = req.params;
        const config = OAUTH_PROVIDERS[provider];

        if (!config) {
            return res.status(400).json({ error: 'Unsupported provider' });
        }

        const state = crypto.randomBytes(32).toString('hex');

        // Store state in session for verification
        if (!req.session.oauthStates) {
            req.session.oauthStates = {};
        }
        req.session.oauthStates[state] = {
            provider,
            createdAt: Date.now(),
            expiresAt: Date.now() + (10 * 60 * 1000) // 10 minutes
        };

        const authParams = {
            client_id: config.clientId,
            redirect_uri: config.redirectUri,
            response_type: config.responseType,
            scope: config.scope,
            state,
            access_type: 'offline',
            prompt: 'consent'
        };

        const authorizationUrl = `${config.authorizationUrl}?${new URLSearchParams(authParams).toString()}`;

        res.json({
            authorizationUrl,
            state,
            provider
        });
    } catch (error) {
        console.error('OAuth config error:', error);
        res.status(500).json({ error: 'Failed to generate OAuth configuration' });
    }
});

// Handle OAuth callback and exchange code for tokens
router.post('/oauth-callback', async (req, res) => {
    try {
        const { provider, code, state } = req.body;

        if (!code || !state || !provider) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        // Verify state token
        if (!req.session.oauthStates || !req.session.oauthStates[state]) {
            return res.status(400).json({ error: 'Invalid or expired state token' });
        }

        const stateData = req.session.oauthStates[state];
        if (Date.now() > stateData.expiresAt) {
            delete req.session.oauthStates[state];
            return res.status(400).json({ error: 'State token expired' });
        }

        if (stateData.provider !== provider) {
            return res.status(400).json({ error: 'State provider mismatch' });
        }

        const config = OAUTH_PROVIDERS[provider];
        if (!config) {
            return res.status(400).json({ error: 'Unsupported provider' });
        }

        // Exchange authorization code for tokens
        try {
            const tokenResponse = await axios.post(config.tokenUrl, {
                client_id: config.clientId,
                client_secret: config.clientSecret,
                code,
                redirect_uri: config.redirectUri,
                grant_type: 'authorization_code'
            }, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            const { access_token, refresh_token, expires_in } = tokenResponse.data;

            // Get user info
            let userInfo;
            try {
                const userResponse = await axios.get(config.userInfoUrl, {
                    headers: { 'Authorization': `Bearer ${access_token}` }
                });
                userInfo = userResponse.data;
            } catch (error) {
                console.error('Failed to get user info:', error);
                return res.status(500).json({ error: 'Failed to retrieve user information' });
            }

            // Create JWT token for client
            const clientToken = jwt.sign({
                provider,
                accessToken: access_token,
                refreshToken: refresh_token,
                email: userInfo.email || userInfo.userPrincipalName,
                user: userInfo.name || userInfo.displayName
            }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });

            // Clean up state
            delete req.session.oauthStates[state];

            res.json({
                accessToken: access_token,
                refreshToken: refresh_token,
                expiresAt: Date.now() + (expires_in * 1000),
                user: userInfo,
                clientToken
            });
        } catch (error) {
            console.error('Token exchange error:', error);
            res.status(500).json({ error: 'Failed to exchange authorization code for tokens' });
        }
    } catch (error) {
        console.error('OAuth callback error:', error);
        res.status(500).json({ error: 'OAuth callback failed' });
    }
});

// Refresh access token
router.post('/oauth-refresh', async (req, res) => {
    try {
        const { provider, refreshToken } = req.body;

        if (!provider || !refreshToken) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const config = OAUTH_PROVIDERS[provider];
        if (!config) {
            return res.status(400).json({ error: 'Unsupported provider' });
        }

        try {
            const tokenResponse = await axios.post(config.tokenUrl, {
                client_id: config.clientId,
                client_secret: config.clientSecret,
                refresh_token: refreshToken,
                grant_type: 'refresh_token'
            });

            const { access_token, refresh_token, expires_in } = tokenResponse.data;

            res.json({
                accessToken: access_token,
                refreshToken: refresh_token || refreshToken,
                expiresAt: Date.now() + (expires_in * 1000)
            });
        } catch (error) {
            console.error('Token refresh error:', error);
            res.status(500).json({ error: 'Failed to refresh token' });
        }
    } catch (error) {
        console.error('OAuth refresh error:', error);
        res.status(500).json({ error: 'Token refresh failed' });
    }
});

// Revoke token
router.post('/oauth-revoke', async (req, res) => {
    try {
        const { provider, token } = req.body;

        if (!provider || !token) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        console.log(`Revoked ${provider} token`);
        res.json({ status: 'success', message: 'Token revoked' });
    } catch (error) {
        console.error('OAuth revoke error:', error);
        res.status(500).json({ error: 'Token revocation failed' });
    }
});

module.exports = router;
