/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   MICROSOFT TEAMS SSO IMPLEMENTATION
   ===================================================== */

class MicrosoftTeamsSSO {
    constructor() {
        this.clientId = localStorage.getItem('microsoftClientId') || 'YOUR_MICROSOFT_CLIENT_ID';
        this.tenantId = localStorage.getItem('microsoftTenantId') || 'common';
        this.redirectUri = `${window.location.origin}/teams-callback.html`;
        this.accessToken = sessionStorage.getItem('teamsAccessToken');
        this.refreshToken = sessionStorage.getItem('teamsRefreshToken');
        this.tokenExpiresAt = parseInt(sessionStorage.getItem('teamsTokenExpiresAt')) || 0;
        this.microsoftAuthorizationUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/authorize`;
        this.microsoftTokenUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
        this.isLoggedIn = this.accessToken && !this.isTokenExpired();
        this.user = null;
        this.userHubUrl = 'https://teams.microsoft.com/';
        this.scopes = [
            'Calendars.ReadWrite',
            'User.Read',
            'openid',
            'profile',
            'email'
        ];
    }

    async checkExistingSession() {
        try {
            if (this.accessToken && !this.isTokenExpired()) {
                this.isLoggedIn = true;
                await this.getCurrentUser();
                this.emit('session-active', this.user);
                return true;
            }
            if (this.refreshToken && this.isTokenExpired()) {
                await this.refreshAccessToken();
                return true;
            }
            const params = new URLSearchParams(window.location.hash.substring(1));
            const code = params.get('code');
            if (code) {
                await this.exchangeCodeForToken(code);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error checking Teams session:', error);
            return false;
        }
    }

    isTokenExpired() {
        return Date.now() >= this.tokenExpiresAt;
    }

    startSSOLogin() {
        const state = Math.random().toString(36).substring(7);
        sessionStorage.setItem('teamsOAuthState', state);

        const authUrl = new URL(this.microsoftAuthorizationUrl);
        authUrl.searchParams.set('client_id', this.clientId);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('redirect_uri', this.redirectUri);
        authUrl.searchParams.set('scope', `${this.scopes.join(' ')}`);
        authUrl.searchParams.set('state', state);
        authUrl.searchParams.set('response_mode', 'query');

        window.location.href = authUrl.toString();
    }

    async exchangeCodeForToken(code) {
        try {
            const response = await fetch('/api/meetings/teams/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, clientId: this.clientId })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Token exchange failed');

            this.setTokens(data);
            await this.getCurrentUser();
            this.isLoggedIn = true;

            console.log('✅ Microsoft Teams SSO Login successful');
            this.emit('login-success', this.user);
            return true;
        } catch (error) {
            console.error('Teams token exchange error:', error);
            this.emit('login-error', error);
            throw error;
        }
    }

    setTokens(tokenData) {
        this.accessToken = tokenData.access_token;
        this.refreshToken = tokenData.refresh_token;
        const expiresIn = tokenData.expires_in || 3600;
        this.tokenExpiresAt = Date.now() + (expiresIn * 1000);

        sessionStorage.setItem('teamsAccessToken', this.accessToken);
        sessionStorage.setItem('teamsRefreshToken', this.refreshToken);
        sessionStorage.setItem('teamsTokenExpiresAt', this.tokenExpiresAt.toString());
    }

    async refreshAccessToken() {
        try {
            if (!this.refreshToken) throw new Error('No refresh token available');

            const response = await fetch('/api/meetings/teams/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: this.refreshToken })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Token refresh failed');

            this.setTokens(data);
            console.log('✅ Teams token refreshed successfully');
            this.emit('token-refreshed', null);
            return true;
        } catch (error) {
            console.error('Teams token refresh error:', error);
            this.logout();
            this.emit('token-refresh-error', error);
            return false;
        }
    }

    async getCurrentUser() {
        try {
            if (!this.accessToken) throw new Error('No access token available');

            const response = await fetch('https://graph.microsoft.com/v1.0/me', {
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    await this.refreshAccessToken();
                    return this.getCurrentUser();
                }
                throw new Error('Failed to get user info');
            }

            const userData = await response.json();
            this.user = {
                id: userData.id,
                displayName: userData.displayName,
                email: userData.userPrincipalName,
                avatar: null
            };

            sessionStorage.setItem('teamsUser', JSON.stringify(this.user));
            return this.user;
        } catch (error) {
            console.error('Error getting Teams user info:', error);
            throw error;
        }
    }

    async createMeeting(config) {
        try {
            if (!this.accessToken) throw new Error('Not authenticated with Teams');
            if (this.isTokenExpired()) await this.refreshAccessToken();

            const event = {
                subject: config.title || 'Microsoft Teams Meeting',
                body: {
                    contentType: 'HTML',
                    content: config.description || ''
                },
                start: {
                    dateTime: config.startTime || new Date().toISOString(),
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                },
                end: {
                    dateTime: config.endTime || new Date(Date.now() + config.duration * 60000).toISOString(),
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                },
                isOnlineMeeting: true,
                onlineMeetingProvider: 'teamsForBusiness',
                allowNewTimeProposals: true
            };

            const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(event)
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || 'Failed to create meeting');

            console.log('✅ Teams meeting created:', data.id);
            this.emit('meeting-created', data);

            return {
                meetingId: data.id,
                meetingNumber: data.id,
                meetingUrl: data.onlineMeeting?.joinUrl || data.webLink,
                joinUrl: data.onlineMeeting?.joinUrl || data.webLink,
                eventLink: data.webLink,
                status: 'active'
            };
        } catch (error) {
            console.error('Error creating Teams meeting:', error);
            this.emit('meeting-creation-error', error);
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

        sessionStorage.removeItem('teamsAccessToken');
        sessionStorage.removeItem('teamsRefreshToken');
        sessionStorage.removeItem('teamsTokenExpiresAt');
        sessionStorage.removeItem('teamsUser');
        sessionStorage.removeItem('teamsOAuthState');

        console.log('Logged out from Microsoft Teams');
        this.emit('logout', null);
    }

    isUserLoggedIn() {
        return this.isLoggedIn && this.accessToken && !this.isTokenExpired();
    }

    on(event, callback) {
        if (!window.teamsEvents) window.teamsEvents = {};
        if (!window.teamsEvents[event]) window.teamsEvents[event] = [];
        window.teamsEvents[event].push(callback);
    }

    emit(event, data) {
        if (window.teamsEvents && window.teamsEvents[event]) {
            window.teamsEvents[event].forEach(callback => callback(data));
        }
    }
}

if (typeof window !== 'undefined') {
    window.MicrosoftTeamsSSO = MicrosoftTeamsSSO;
}
