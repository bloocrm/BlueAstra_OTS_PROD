/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   YAHOO MAIL SSO IMPLEMENTATION
   ===================================================== */

class YahooSSO {
    constructor() {
        this.clientId = localStorage.getItem('yahooClientId') || 'YOUR_YAHOO_CLIENT_ID';
        this.clientSecret = localStorage.getItem('yahooClientSecret') || 'YOUR_YAHOO_CLIENT_SECRET';
        this.redirectUri = `${window.location.origin}/yahoo-callback.html`;
        this.accessToken = sessionStorage.getItem('yahooAccessToken');
        this.refreshToken = sessionStorage.getItem('yahooRefreshToken');
        this.tokenExpiresAt = parseInt(sessionStorage.getItem('yahooTokenExpiresAt')) || 0;
        this.isLoggedIn = this.accessToken && !this.isTokenExpired();
        this.user = null;
        this.userEmail = null;
        this.userHubUrl = 'https://mail.yahoo.com/';
        this.state = this.generateState();
    }

    generateState() {
        return 'yahoo_' + Math.random().toString(36).substring(7);
    }

    async checkExistingSession() {
        try {
            if (this.accessToken && !this.isTokenExpired()) {
                this.isLoggedIn = true;
                await this.getCurrentUser();
                this.emit('session-active', this.user);
                return true;
            }
            const params = new URLSearchParams(window.location.search);
            const code = params.get('code');
            if (code) {
                await this.exchangeCodeForToken(code);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error checking Yahoo session:', error);
            return false;
        }
    }

    isTokenExpired() {
        return Date.now() >= this.tokenExpiresAt;
    }

    startSSOLogin() {
        sessionStorage.setItem('yahooState', this.state);

        const authUrl = `https://api.login.yahoo.com/oauth2/request_auth?` +
            `client_id=${this.clientId}&` +
            `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
            `response_type=code&` +
            `state=${this.state}`;

        window.location.href = authUrl;
    }

    async exchangeCodeForToken(code) {
        try {
            const response = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    code: code,
                    redirect_uri: this.redirectUri,
                    grant_type: 'authorization_code'
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error_description || 'Token exchange failed');

            this.accessToken = data.access_token;
            this.refreshToken = data.refresh_token || this.refreshToken;
            this.tokenExpiresAt = Date.now() + ((data.expires_in || 3599) * 1000);

            sessionStorage.setItem('yahooAccessToken', this.accessToken);
            if (this.refreshToken) sessionStorage.setItem('yahooRefreshToken', this.refreshToken);
            sessionStorage.setItem('yahooTokenExpiresAt', this.tokenExpiresAt.toString());

            await this.getCurrentUser();
            this.emit('login-success', this.user);
            return this.user;
        } catch (error) {
            console.error('Yahoo token exchange error:', error);
            throw error;
        }
    }

    async refreshAccessToken() {
        if (!this.refreshToken) throw new Error('No refresh token available');

        try {
            const response = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    refresh_token: this.refreshToken,
                    grant_type: 'refresh_token'
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error('Token refresh failed');

            this.accessToken = data.access_token;
            this.tokenExpiresAt = Date.now() + ((data.expires_in || 3599) * 1000);
            sessionStorage.setItem('yahooAccessToken', this.accessToken);

            this.emit('token-refreshed', { provider: 'yahoo' });
            return this.accessToken;
        } catch (error) {
            console.error('Yahoo token refresh error:', error);
            this.emit('token-expired', { provider: 'yahoo' });
            throw error;
        }
    }

    async getCurrentUser() {
        try {
            if (!this.accessToken) throw new Error('No access token');

            const response = await fetch('https://social.yahooapis.com/v1/me/profile?format=json', {
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
            });

            if (!response.ok) throw new Error('Failed to get user info');

            const userData = await response.json();
            this.user = {
                id: userData.profile.guid,
                displayName: userData.profile.givenName + ' ' + userData.profile.familyName,
                email: userData.profile.emails[0].handle,
                avatar: userData.profile.image?.imageUrl
            };
            this.userEmail = userData.profile.emails[0].handle;
            this.isLoggedIn = true;

            sessionStorage.setItem('yahooUser', JSON.stringify(this.user));
            return this.user;
        } catch (error) {
            console.error('Error getting Yahoo user info:', error);
            throw error;
        }
    }

    openUserHub() {
        window.open(this.userHubUrl, '_blank');
    }

    logout() {
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiresAt = 0;
        this.isLoggedIn = false;
        this.user = null;
        this.userEmail = null;

        sessionStorage.removeItem('yahooAccessToken');
        sessionStorage.removeItem('yahooRefreshToken');
        sessionStorage.removeItem('yahooTokenExpiresAt');
        sessionStorage.removeItem('yahooUser');

        console.log('Logged out from Yahoo');
        this.emit('logout', null);
    }

    isUserLoggedIn() {
        return this.isLoggedIn && this.accessToken && !this.isTokenExpired();
    }

    on(event, callback) {
        if (!window.yahooEvents) window.yahooEvents = {};
        if (!window.yahooEvents[event]) window.yahooEvents[event] = [];
        window.yahooEvents[event].push(callback);
    }

    emit(event, data) {
        if (window.yahooEvents && window.yahooEvents[event]) {
            window.yahooEvents[event].forEach(callback => callback(data));
        }
    }
}

if (typeof window !== 'undefined') {
    window.YahooSSO = YahooSSO;
}
