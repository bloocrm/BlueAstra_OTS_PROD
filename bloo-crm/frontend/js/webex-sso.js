/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   WEBEX SSO (SINGLE SIGN-ON) IMPLEMENTATION
   ===================================================== */

class WebexSSO {
    constructor() {
        this.clientId = localStorage.getItem('webexClientId') || 'YOUR_WEBEX_CLIENT_ID';
        this.redirectUri = `${window.location.origin}/webex-callback.html`;
        this.scopes = [
            'spark:all',
            'spark:kms'
        ];
        this.accessToken = sessionStorage.getItem('webexAccessToken');
        this.refreshToken = sessionStorage.getItem('webexRefreshToken');
        this.tokenExpiresAt = parseInt(sessionStorage.getItem('webexTokenExpiresAt')) || 0;
        this.webexAuthorizationUrl = 'https://webexapis.com/v1/authorize';
        this.webexTokenUrl = 'https://webexapis.com/v1/access_token';
        this.isLoggedIn = this.accessToken && !this.isTokenExpired();
        this.user = null;
        this.checkExistingSession();
    }

    /**
     * Check if user has existing Webex session
     */
    async checkExistingSession() {
        try {
            // Check for existing token
            if (this.accessToken && !this.isTokenExpired()) {
                console.log('Valid Webex session found');
                this.isLoggedIn = true;
                await this.getCurrentUser();
                this.emit('session-active', this.user);
                return true;
            }

            // Try to refresh if refresh token exists
            if (this.refreshToken && this.isTokenExpired()) {
                console.log('Attempting to refresh Webex token');
                await this.refreshAccessToken();
                return true;
            }

            // Check if authorization code is in URL (OAuth callback)
            const params = new URLSearchParams(window.location.hash.substring(1));
            const code = params.get('code');
            if (code) {
                console.log('Authorization code found, exchanging for token');
                await this.exchangeCodeForToken(code);
                return true;
            }

            console.log('No active Webex session found');
            return false;
        } catch (error) {
            console.error('Error checking existing session:', error);
            return false;
        }
    }

    /**
     * Check if token is expired
     */
    isTokenExpired() {
        return Date.now() >= this.tokenExpiresAt;
    }

    /**
     * Start SSO login flow
     */
    startSSOLogin() {
        const state = Math.random().toString(36).substring(7);
        sessionStorage.setItem('webexOAuthState', state);

        const authUrl = new URL(this.webexAuthorizationUrl);
        authUrl.searchParams.set('client_id', this.clientId);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('redirect_uri', this.redirectUri);
        authUrl.searchParams.set('scope', this.scopes.join(' '));
        authUrl.searchParams.set('state', state);

        // Open in popup or redirect
        window.location.href = authUrl.toString();
    }

    /**
     * Exchange authorization code for access token
     */
    async exchangeCodeForToken(code) {
        try {
            const response = await fetch(this.webexTokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    client_id: this.clientId,
                    client_secret: localStorage.getItem('webexClientSecret'),
                    code: code,
                    grant_type: 'authorization_code',
                    redirect_uri: this.redirectUri
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Token exchange failed');
            }

            this.setTokens(data);
            await this.getCurrentUser();
            this.isLoggedIn = true;

            console.log('✅ Webex SSO Login successful');
            this.emit('login-success', this.user);

            return true;
        } catch (error) {
            console.error('Token exchange error:', error);
            this.emit('login-error', error);
            throw error;
        }
    }

    /**
     * Set tokens in session storage
     */
    setTokens(tokenData) {
        this.accessToken = tokenData.access_token;
        this.refreshToken = tokenData.refresh_token;
        const expiresIn = tokenData.expires_in || 3600;
        this.tokenExpiresAt = Date.now() + (expiresIn * 1000);

        sessionStorage.setItem('webexAccessToken', this.accessToken);
        sessionStorage.setItem('webexRefreshToken', this.refreshToken);
        sessionStorage.setItem('webexTokenExpiresAt', this.tokenExpiresAt.toString());

        console.log('Tokens stored in session');
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshAccessToken() {
        try {
            if (!this.refreshToken) {
                throw new Error('No refresh token available');
            }

            const response = await fetch(this.webexTokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    client_id: this.clientId,
                    client_secret: localStorage.getItem('webexClientSecret'),
                    grant_type: 'refresh_token',
                    refresh_token: this.refreshToken
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Token refresh failed');
            }

            this.setTokens(data);
            console.log('✅ Token refreshed successfully');
            this.emit('token-refreshed', null);

            return true;
        } catch (error) {
            console.error('Token refresh error:', error);
            this.logout();
            this.emit('token-refresh-error', error);
            return false;
        }
    }

    /**
     * Get current logged-in user information
     */
    async getCurrentUser() {
        try {
            if (!this.accessToken) {
                throw new Error('No access token available');
            }

            const response = await fetch('https://webexapis.com/v1/people/me', {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // Token expired, try to refresh
                    await this.refreshAccessToken();
                    return this.getCurrentUser();
                }
                throw new Error('Failed to get user info');
            }

            const userData = await response.json();
            this.user = {
                id: userData.id,
                displayName: userData.displayName,
                email: userData.emails ? userData.emails[0] : null,
                avatar: userData.avatar
            };

            sessionStorage.setItem('webexUser', JSON.stringify(this.user));
            console.log('User info retrieved:', this.user.displayName);

            return this.user;
        } catch (error) {
            console.error('Error getting user info:', error);
            throw error;
        }
    }

    /**
     * Create a meeting using Webex API
     */
    async createMeeting(config) {
        try {
            if (!this.accessToken) {
                throw new Error('Not authenticated with Webex');
            }

            // Auto-refresh if needed
            if (this.isTokenExpired()) {
                await this.refreshAccessToken();
            }

            const meetingData = {
                title: config.title || 'Webex Meeting',
                start: config.startTime || new Date().toISOString(),
                end: config.endTime || new Date(Date.now() + config.duration * 60000).toISOString(),
                description: config.description || '',
                enabledAutoRecordMeeting: config.recordingEnabled || false,
                allowAnyoneToBeCoHost: false,
                allowUnauthorizedDevices: true
            };

            const response = await fetch('https://webexapis.com/v1/meetings', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(meetingData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to create meeting');
            }

            console.log('✅ Meeting created:', data.id);
            this.emit('meeting-created', data);

            return {
                meetingId: data.id,
                meetingNumber: data.meetingNumber,
                meetingUrl: data.meetingUrl,
                joinUrl: data.webLink,
                password: data.password,
                sipAddress: data.sipAddress,
                hostEmail: this.user.email,
                status: 'active'
            };
        } catch (error) {
            console.error('Error creating meeting:', error);
            this.emit('meeting-creation-error', error);
            throw error;
        }
    }

    /**
     * Get list of recent meetings
     */
    async getRecentMeetings(limit = 10) {
        try {
            if (!this.accessToken) {
                throw new Error('Not authenticated with Webex');
            }

            const response = await fetch(`https://webexapis.com/v1/meetings?max=${limit}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to get meetings');
            }

            return data.items || [];
        } catch (error) {
            console.error('Error getting recent meetings:', error);
            return [];
        }
    }

    /**
     * Logout from Webex
     */
    logout() {
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiresAt = 0;
        this.isLoggedIn = false;
        this.user = null;

        sessionStorage.removeItem('webexAccessToken');
        sessionStorage.removeItem('webexRefreshToken');
        sessionStorage.removeItem('webexTokenExpiresAt');
        sessionStorage.removeItem('webexUser');
        sessionStorage.removeItem('webexOAuthState');

        console.log('Logged out from Webex');
        this.emit('logout', null);
    }

    /**
     * Open Webex User Hub
     */
    openWebexHub() {
        if (!this.isUserLoggedIn()) {
            console.warn('User not logged in. Please log in first.');
            return false;
        }

        const hubUrl = 'https://userhub-by.webex.com/webappng/hub/meeting/home';
        window.open(hubUrl, 'webexhub');
        console.log('Opening Webex User Hub:', hubUrl);
        return true;
    }

    /**
     * Open Webex User Hub in new tab and focus it
     */
    openWebexHubNewTab() {
        if (!this.isUserLoggedIn()) {
            console.warn('User not logged in. Please log in first.');
            return false;
        }

        const hubUrl = 'https://userhub-by.webex.com/webappng/hub/meeting/home';
        const popup = window.open(hubUrl, '_blank');
        if (popup) {
            popup.focus();
            console.log('Opened Webex User Hub in new tab');
        }
        return true;
    }

    /**
     * Redirect to Webex User Hub
     */
    redirectToWebexHub() {
        if (!this.isUserLoggedIn()) {
            console.warn('User not logged in. Please log in first.');
            return false;
        }

        const hubUrl = 'https://userhub-by.webex.com/webappng/hub/meeting/home';
        window.location.href = hubUrl;
        console.log('Redirecting to Webex User Hub:', hubUrl);
        return true;
    }
    on(event, callback) {
        if (!window.webexEvents) {
            window.webexEvents = {};
        }
        if (!window.webexEvents[event]) {
            window.webexEvents[event] = [];
        }
        window.webexEvents[event].push(callback);
    }

    emit(event, data) {
        if (window.webexEvents && window.webexEvents[event]) {
            window.webexEvents[event].forEach(callback => callback(data));
        }
    }
}

// Initialize global instance
let webexSSO = null;

// Auto-initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing Webex SSO...');
    webexSSO = new WebexSSO();

    // Check for existing session on page load
    const hasSession = await webexSSO.checkExistingSession();

    if (hasSession) {
        console.log('✅ Webex session is active');
        document.body.setAttribute('data-webex-logged-in', 'true');
    } else {
        console.log('⚠️ No active Webex session');
        document.body.setAttribute('data-webex-logged-in', 'false');
    }
});

// Make available globally
if (typeof window !== 'undefined') {
    window.WebexSSO = WebexSSO;
}
