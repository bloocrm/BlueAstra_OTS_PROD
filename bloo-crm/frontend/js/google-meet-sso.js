/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   GOOGLE MEET SSO IMPLEMENTATION
   ===================================================== */

class GoogleMeetSSO {
    constructor() {
        this.clientId = localStorage.getItem('googleClientId') || 'YOUR_GOOGLE_CLIENT_ID';
        this.redirectUri = `${window.location.origin}/google-callback.html`;
        this.accessToken = sessionStorage.getItem('googleAccessToken');
        this.refreshToken = sessionStorage.getItem('googleRefreshToken');
        this.tokenExpiresAt = parseInt(sessionStorage.getItem('googleTokenExpiresAt')) || 0;
        this.googleAuthorizationUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
        this.googleTokenUrl = 'https://oauth2.googleapis.com/token';
        this.isLoggedIn = this.accessToken && !this.isTokenExpired();
        this.user = null;
        this.userHubUrl = 'https://meet.google.com/';
        this.scopes = [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile'
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
            console.error('Error checking Google Meet session:', error);
            return false;
        }
    }

    isTokenExpired() {
        return Date.now() >= this.tokenExpiresAt;
    }

    startSSOLogin() {
        const state = Math.random().toString(36).substring(7);
        sessionStorage.setItem('googleOAuthState', state);

        const authUrl = new URL(this.googleAuthorizationUrl);
        authUrl.searchParams.set('client_id', this.clientId);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('redirect_uri', this.redirectUri);
        authUrl.searchParams.set('scope', this.scopes.join(' '));
        authUrl.searchParams.set('state', state);
        authUrl.searchParams.set('access_type', 'offline');
        authUrl.searchParams.set('prompt', 'consent');

        window.location.href = authUrl.toString();
    }

    async exchangeCodeForToken(code) {
        try {
            const response = await fetch('/api/meetings/google/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, clientId: this.clientId })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Token exchange failed');

            this.setTokens(data);
            await this.getCurrentUser();
            this.isLoggedIn = true;

            console.log('✅ Google Meet SSO Login successful');
            this.emit('login-success', this.user);
            return true;
        } catch (error) {
            console.error('Google Meet token exchange error:', error);
            this.emit('login-error', error);
            throw error;
        }
    }

    setTokens(tokenData) {
        this.accessToken = tokenData.access_token;
        this.refreshToken = tokenData.refresh_token || this.refreshToken;
        const expiresIn = tokenData.expires_in || 3600;
        this.tokenExpiresAt = Date.now() + (expiresIn * 1000);

        sessionStorage.setItem('googleAccessToken', this.accessToken);
        if (this.refreshToken) sessionStorage.setItem('googleRefreshToken', this.refreshToken);
        sessionStorage.setItem('googleTokenExpiresAt', this.tokenExpiresAt.toString());
    }

    async refreshAccessToken() {
        try {
            if (!this.refreshToken) throw new Error('No refresh token available');

            const response = await fetch('/api/meetings/google/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: this.refreshToken })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Token refresh failed');

            this.setTokens(data);
            console.log('✅ Google Meet token refreshed successfully');
            this.emit('token-refreshed', null);
            return true;
        } catch (error) {
            console.error('Google Meet token refresh error:', error);
            this.logout();
            this.emit('token-refresh-error', error);
            return false;
        }
    }

    async getCurrentUser() {
        try {
            if (!this.accessToken) throw new Error('No access token available');

            const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
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
                displayName: userData.name,
                email: userData.email,
                avatar: userData.picture
            };

            sessionStorage.setItem('googleUser', JSON.stringify(this.user));
            return this.user;
        } catch (error) {
            console.error('Error getting Google Meet user info:', error);
            throw error;
        }
    }

    async createMeeting(config) {
        try {
            if (!this.accessToken) throw new Error('Not authenticated with Google Meet');
            if (this.isTokenExpired()) await this.refreshAccessToken();

            const event = {
                summary: config.title || 'Google Meet',
                description: config.description || '',
                start: {
                    dateTime: config.startTime || new Date().toISOString(),
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                },
                end: {
                    dateTime: config.endTime || new Date(Date.now() + config.duration * 60000).toISOString(),
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                },
                conferenceData: {
                    createRequest: {
                        requestId: Math.random().toString(36).substring(7),
                        conferenceSolutionKey: {
                            key: 'hangoutsMeet'
                        }
                    }
                }
            };

            const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(event)
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || 'Failed to create meeting');

            console.log('✅ Google Meet created:', data.id);
            this.emit('meeting-created', data);

            return {
                meetingId: data.id,
                meetingNumber: data.id,
                meetingUrl: data.conferenceData?.entryPoints?.[0]?.uri || data.htmlLink,
                joinUrl: data.conferenceData?.entryPoints?.[0]?.uri || data.htmlLink,
                eventLink: data.htmlLink,
                status: 'active'
            };
        } catch (error) {
            console.error('Error creating Google Meet:', error);
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

        sessionStorage.removeItem('googleAccessToken');
        sessionStorage.removeItem('googleRefreshToken');
        sessionStorage.removeItem('googleTokenExpiresAt');
        sessionStorage.removeItem('googleUser');
        sessionStorage.removeItem('googleOAuthState');

        console.log('Logged out from Google Meet');
        this.emit('logout', null);
    }

    isUserLoggedIn() {
        return this.isLoggedIn && this.accessToken && !this.isTokenExpired();
    }

    on(event, callback) {
        if (!window.googleMeetEvents) window.googleMeetEvents = {};
        if (!window.googleMeetEvents[event]) window.googleMeetEvents[event] = [];
        window.googleMeetEvents[event].push(callback);
    }

    emit(event, data) {
        if (window.googleMeetEvents && window.googleMeetEvents[event]) {
            window.googleMeetEvents[event].forEach(callback => callback(data));
        }
    }
}

if (typeof window !== 'undefined') {
    window.GoogleMeetSSO = GoogleMeetSSO;
}
