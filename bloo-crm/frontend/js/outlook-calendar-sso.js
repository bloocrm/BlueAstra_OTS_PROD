/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   OUTLOOK CALENDAR SSO IMPLEMENTATION
   ===================================================== */

class OutlookCalendarSso {
    constructor() {
        this.provider = 'outlook-calendar';
        this.clientId = localStorage.getItem('outlookCalendarClientId') || '';
        this.tenantId = localStorage.getItem('outlookCalendarTenantId') || 'common';
        this.redirectUri = localStorage.getItem('outlookCalendarRedirectUri') || `${window.location.origin}/outlook-calendar-callback.html`;
        this.accessToken = sessionStorage.getItem('outlookCalendarAccessToken') || null;
        this.refreshToken = sessionStorage.getItem('outlookCalendarRefreshToken') || null;
        this.currentUser = JSON.parse(sessionStorage.getItem('outlookCalendarUser') || 'null');
    }

    async startSSOLogin() {
        if (!this.clientId) {
            throw new Error('Outlook Calendar Client ID not configured');
        }

        // Generate state for CSRF protection
        const state = this.generateRandomString(32);
        sessionStorage.setItem('outlookCalendarOAuthState', state);

        // Microsoft OAuth endpoint
        const authUrl = new URL(`https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/authorize`);
        authUrl.searchParams.append('client_id', this.clientId);
        authUrl.searchParams.append('redirect_uri', this.redirectUri);
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('scope', 'Calendars.Read Calendars.Read.Shared Calendars.ReadWrite User.Read offline_access');
        authUrl.searchParams.append('state', state);
        authUrl.searchParams.append('prompt', 'select_account');

        window.location.href = authUrl.toString();
    }

    async exchangeCodeForToken(code, state) {
        // Verify state parameter
        const savedState = sessionStorage.getItem('outlookCalendarOAuthState');
        if (state !== savedState) {
            throw new Error('Invalid state parameter - CSRF validation failed');
        }

        try {
            const response = await fetch('/api/calendar/oauth/callback/outlook-calendar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, state })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Token exchange failed');

            this.accessToken = data.accessToken;
            this.refreshToken = data.refreshToken;
            this.currentUser = data.user;

            sessionStorage.setItem('outlookCalendarAccessToken', data.accessToken);
            if (data.refreshToken) sessionStorage.setItem('outlookCalendarRefreshToken', data.refreshToken);
            sessionStorage.setItem('outlookCalendarUser', JSON.stringify(data.user));
            sessionStorage.setItem('outlookCalendarConnectionId', data.connectionId);

            return { success: true, ...data };
        } catch (error) {
            console.error('Outlook Calendar token exchange error:', error);
            throw error;
        }
    }

    async refreshToken() {
        try {
            const connectionId = sessionStorage.getItem('outlookCalendarConnectionId');
            if (!connectionId) throw new Error('No connection found');

            const response = await fetch(`/api/calendar/oauth/refresh/${connectionId}`, {
                method: 'POST'
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Token refresh failed');

            this.accessToken = data.accessToken;
            sessionStorage.setItem('outlookCalendarAccessToken', data.accessToken);

            return data;
        } catch (error) {
            console.error('Outlook Calendar token refresh error:', error);
            this.accessToken = null;
            sessionStorage.removeItem('outlookCalendarAccessToken');
            throw error;
        }
    }

    isUserLoggedIn() {
        return !!this.accessToken && !!this.currentUser;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    generateRandomString(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    setCredentials(clientId, tenantId, redirectUri) {
        this.clientId = clientId;
        this.tenantId = tenantId;
        this.redirectUri = redirectUri;
        localStorage.setItem('outlookCalendarClientId', clientId);
        localStorage.setItem('outlookCalendarTenantId', tenantId);
        localStorage.setItem('outlookCalendarRedirectUri', redirectUri);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = OutlookCalendarSso;
}
