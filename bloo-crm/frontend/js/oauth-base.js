/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   OAUTH BASE HANDLER - UNIFIED OAUTH FLOW
   ===================================================== */

class OAuthBase {
    constructor(providerId, config = {}) {
        this.providerId = providerId;
        this.config = config;
        this.apiBase = (window.API_BASE_URL || '/api');
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiresAt = 0;
        this.user = null;
        this.userEmail = null;
        this.isLoggedIn = false;
        this.events = {};
    }

    async startOAuthFlow(scopes = []) {
        try {
            // Get OAuth configuration from backend
            const response = await fetch(`${this.apiBase}/auth/oauth-config/${this.providerId}`, {
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error('Failed to get OAuth configuration');
            }

            const { authorizationUrl, state } = await response.json();

            // Store state for verification
            sessionStorage.setItem(`${this.providerId}_oauth_state`, state);

            // Redirect to OAuth provider
            window.location.href = authorizationUrl;
        } catch (error) {
            console.error(`OAuth flow error for ${this.providerId}:`, error);
            this.emit('oauth-error', { error: error.message });
            throw error;
        }
    }

    async handleCallback() {
        try {
            const params = new URLSearchParams(window.location.search);
            const code = params.get('code');
            const state = params.get('state');

            if (!code) {
                const error = params.get('error') || 'Unknown error';
                throw new Error(`OAuth error: ${error}`);
            }

            // Verify state
            const storedState = sessionStorage.getItem(`${this.providerId}_oauth_state`);
            if (state !== storedState) {
                throw new Error('State mismatch - potential CSRF attack');
            }

            // Exchange code for tokens
            const response = await fetch(`${this.apiBase}/auth/oauth-callback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: this.providerId,
                    code,
                    state
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Token exchange failed');
            }

            const tokenData = await response.json();
            this.setTokens(tokenData);
            await this.getCurrentUser();

            this.emit('oauth-success', { user: this.user, email: this.userEmail });
            return true;
        } catch (error) {
            console.error(`OAuth callback error for ${this.providerId}:`, error);
            this.emit('oauth-error', { error: error.message });
            throw error;
        }
    }

    setTokens(tokenData) {
        this.accessToken = tokenData.accessToken;
        this.refreshToken = tokenData.refreshToken;
        this.tokenExpiresAt = tokenData.expiresAt;
        this.isLoggedIn = true;

        // Store in session storage
        sessionStorage.setItem(`${this.providerId}_access_token`, this.accessToken);
        if (this.refreshToken) {
            sessionStorage.setItem(`${this.providerId}_refresh_token`, this.refreshToken);
        }
        sessionStorage.setItem(`${this.providerId}_expires_at`, this.tokenExpiresAt);
    }

    loadStoredTokens() {
        this.accessToken = sessionStorage.getItem(`${this.providerId}_access_token`);
        this.refreshToken = sessionStorage.getItem(`${this.providerId}_refresh_token`);
        this.tokenExpiresAt = parseInt(sessionStorage.getItem(`${this.providerId}_expires_at`)) || 0;
        this.isLoggedIn = this.accessToken && !this.isTokenExpired();
    }

    isTokenExpired() {
        return Date.now() >= this.tokenExpiresAt;
    }

    async refreshAccessToken() {
        if (!this.refreshToken) {
            throw new Error('No refresh token available');
        }

        try {
            const response = await fetch(`${this.apiBase}/auth/oauth-refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: this.providerId,
                    refreshToken: this.refreshToken
                })
            });

            if (!response.ok) {
                throw new Error('Token refresh failed');
            }

            const tokenData = await response.json();
            this.setTokens(tokenData);
            return this.accessToken;
        } catch (error) {
            console.error(`Token refresh error for ${this.providerId}:`, error);
            this.logout();
            throw error;
        }
    }

    async getCurrentUser() {
        throw new Error('getCurrentUser must be implemented by subclass');
    }

    async checkExistingSession() {
        try {
            this.loadStoredTokens();

            if (this.isTokenExpired() && this.refreshToken) {
                await this.refreshAccessToken();
            }

            if (this.accessToken && !this.isTokenExpired()) {
                await this.getCurrentUser();
                this.emit('session-active', this.user);
                return true;
            }

            // Check for callback parameters
            return await this.handleCallback();
        } catch (error) {
            console.error(`Session check error for ${this.providerId}:`, error);
            return false;
        }
    }

    isUserLoggedIn() {
        return this.isLoggedIn && this.accessToken && !this.isTokenExpired();
    }

    logout() {
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiresAt = 0;
        this.user = null;
        this.userEmail = null;
        this.isLoggedIn = false;

        sessionStorage.removeItem(`${this.providerId}_access_token`);
        sessionStorage.removeItem(`${this.providerId}_refresh_token`);
        sessionStorage.removeItem(`${this.providerId}_expires_at`);
        sessionStorage.removeItem(`${this.providerId}_oauth_state`);

        this.emit('logout', { provider: this.providerId });
    }

    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Event handler error for ${event}:`, error);
                }
            });
        }
    }

    async makeApiCall(endpoint, options = {}) {
        if (this.isTokenExpired() && this.refreshToken) {
            try {
                await this.refreshAccessToken();
            } catch (error) {
                this.emit('token-refresh-failed', { error: error.message });
                throw error;
            }
        }

        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${this.accessToken}`
        };

        const response = await fetch(endpoint, {
            ...options,
            headers
        });

        if (response.status === 401) {
            this.logout();
            throw new Error('Unauthorized - session expired');
        }

        return response;
    }
}
