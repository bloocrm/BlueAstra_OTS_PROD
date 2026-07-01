/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   TRELLO CALENDAR SSO IMPLEMENTATION
   ===================================================== */

class TrelloSso {
    constructor() {
        this.provider = 'trello';
        this.clientId = localStorage.getItem('trelloClientId') || '';
        this.redirectUri = localStorage.getItem('trelloRedirectUri') || `${window.location.origin}/trello-callback.html`;
        this.accessToken = sessionStorage.getItem('trelloAccessToken') || null;
        this.currentUser = JSON.parse(sessionStorage.getItem('trelloUser') || 'null');
    }

    async startSSOLogin() {
        if (!this.clientId) {
            throw new Error('Trello API Key not configured');
        }

        const state = this.generateRandomString(32);
        sessionStorage.setItem('trelloOAuthState', state);

        const returnUrl = encodeURIComponent(this.redirectUri);
        const scope = encodeURIComponent('read,write');

        const authUrl = `https://trello.com/app-key/authorize?key=${this.clientId}&name=BlooCalendar&expiration=never&scope=${scope}&return_url=${returnUrl}`;

        window.location.href = authUrl;
    }

    async exchangeCodeForToken(code, state) {
        const savedState = sessionStorage.getItem('trelloOAuthState');
        if (state !== savedState) {
            throw new Error('Invalid state parameter - CSRF validation failed');
        }

        try {
            const response = await fetch('/api/calendar/oauth/callback/trello', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, state })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Token exchange failed');

            this.accessToken = data.accessToken;
            this.currentUser = data.user;

            sessionStorage.setItem('trelloAccessToken', data.accessToken);
            sessionStorage.setItem('trelloUser', JSON.stringify(data.user));
            sessionStorage.setItem('trelloConnectionId', data.connectionId);

            return { success: true, ...data };
        } catch (error) {
            console.error('Trello token exchange error:', error);
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

    setCredentials(clientId, redirectUri) {
        this.clientId = clientId;
        this.redirectUri = redirectUri;
        localStorage.setItem('trelloClientId', clientId);
        localStorage.setItem('trelloRedirectUri', redirectUri);
    }
}

/* =====================================================
   MICROSOFT TEAMS CALENDAR SSO IMPLEMENTATION
   ===================================================== */

class MicrosoftTeamsSso {
    constructor() {
        this.provider = 'microsoft-teams';
        this.clientId = localStorage.getItem('teamsClientId') || '';
        this.tenantId = localStorage.getItem('teamsTenan ID') || 'common';
        this.redirectUri = localStorage.getItem('teamsRedirectUri') || `${window.location.origin}/teams-callback.html`;
        this.accessToken = sessionStorage.getItem('teamsAccessToken') || null;
        this.currentUser = JSON.parse(sessionStorage.getItem('teamsUser') || 'null');
    }

    async startSSOLogin() {
        if (!this.clientId) {
            throw new Error('Microsoft Teams Client ID not configured');
        }

        const state = this.generateRandomString(32);
        sessionStorage.setItem('teamsOAuthState', state);

        const authUrl = new URL(`https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/authorize`);
        authUrl.searchParams.append('client_id', this.clientId);
        authUrl.searchParams.append('redirect_uri', this.redirectUri);
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('scope', 'Calendars.Read Calendars.ReadWrite Team.ReadBasic.All TeamSettings.Read.All User.Read offline_access');
        authUrl.searchParams.append('state', state);
        authUrl.searchParams.append('prompt', 'select_account');

        window.location.href = authUrl.toString();
    }

    async exchangeCodeForToken(code, state) {
        const savedState = sessionStorage.getItem('teamsOAuthState');
        if (state !== savedState) {
            throw new Error('Invalid state parameter - CSRF validation failed');
        }

        try {
            const response = await fetch('/api/calendar/oauth/callback/microsoft-teams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, state })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Token exchange failed');

            this.accessToken = data.accessToken;
            this.currentUser = data.user;

            sessionStorage.setItem('teamsAccessToken', data.accessToken);
            sessionStorage.setItem('teamsUser', JSON.stringify(data.user));
            sessionStorage.setItem('teamsConnectionId', data.connectionId);

            return { success: true, ...data };
        } catch (error) {
            console.error('Microsoft Teams token exchange error:', error);
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
        localStorage.setItem('teamsClientId', clientId);
        localStorage.setItem('teamsTenanId', tenantId);
        localStorage.setItem('teamsRedirectUri', redirectUri);
    }
}

/* =====================================================
   SLACK CALENDAR SSO IMPLEMENTATION
   ===================================================== */

class SlackSso {
    constructor() {
        this.provider = 'slack';
        this.clientId = localStorage.getItem('slackClientId') || '';
        this.redirectUri = localStorage.getItem('slackRedirectUri') || `${window.location.origin}/slack-callback.html`;
        this.accessToken = sessionStorage.getItem('slackAccessToken') || null;
        this.currentUser = JSON.parse(sessionStorage.getItem('slackUser') || 'null');
    }

    async startSSOLogin() {
        if (!this.clientId) {
            throw new Error('Slack Client ID not configured');
        }

        const state = this.generateRandomString(32);
        sessionStorage.setItem('slackOAuthState', state);

        const authUrl = new URL('https://slack.com/oauth_authorize');
        authUrl.searchParams.append('client_id', this.clientId);
        authUrl.searchParams.append('redirect_uri', this.redirectUri);
        authUrl.searchParams.append('scope', 'calendar:read calendar:write users:read');
        authUrl.searchParams.append('state', state);

        window.location.href = authUrl.toString();
    }

    async exchangeCodeForToken(code, state) {
        const savedState = sessionStorage.getItem('slackOAuthState');
        if (state !== savedState) {
            throw new Error('Invalid state parameter - CSRF validation failed');
        }

        try {
            const response = await fetch('/api/calendar/oauth/callback/slack', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, state })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Token exchange failed');

            this.accessToken = data.accessToken;
            this.currentUser = data.user;

            sessionStorage.setItem('slackAccessToken', data.accessToken);
            sessionStorage.setItem('slackUser', JSON.stringify(data.user));
            sessionStorage.setItem('slackConnectionId', data.connectionId);

            return { success: true, ...data };
        } catch (error) {
            console.error('Slack token exchange error:', error);
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

    setCredentials(clientId, redirectUri) {
        this.clientId = clientId;
        this.redirectUri = redirectUri;
        localStorage.setItem('slackClientId', clientId);
        localStorage.setItem('slackRedirectUri', redirectUri);
    }
}

/* =====================================================
   NOTION CALENDAR SSO IMPLEMENTATION
   ===================================================== */

class NotionSso {
    constructor() {
        this.provider = 'notion';
        this.clientId = localStorage.getItem('notionClientId') || '';
        this.redirectUri = localStorage.getItem('notionRedirectUri') || `${window.location.origin}/notion-callback.html`;
        this.accessToken = sessionStorage.getItem('notionAccessToken') || null;
        this.currentUser = JSON.parse(sessionStorage.getItem('notionUser') || 'null');
    }

    async startSSOLogin() {
        if (!this.clientId) {
            throw new Error('Notion Client ID not configured');
        }

        const state = this.generateRandomString(32);
        sessionStorage.setItem('notionOAuthState', state);

        const authUrl = new URL('https://api.notion.com/v1/oauth/authorize');
        authUrl.searchParams.append('client_id', this.clientId);
        authUrl.searchParams.append('redirect_uri', this.redirectUri);
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('state', state);
        authUrl.searchParams.append('owner', 'user');

        window.location.href = authUrl.toString();
    }

    async exchangeCodeForToken(code, state) {
        const savedState = sessionStorage.getItem('notionOAuthState');
        if (state !== savedState) {
            throw new Error('Invalid state parameter - CSRF validation failed');
        }

        try {
            const response = await fetch('/api/calendar/oauth/callback/notion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, state })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Token exchange failed');

            this.accessToken = data.accessToken;
            this.currentUser = data.user;

            sessionStorage.setItem('notionAccessToken', data.accessToken);
            sessionStorage.setItem('notionUser', JSON.stringify(data.user));
            sessionStorage.setItem('notionConnectionId', data.connectionId);

            return { success: true, ...data };
        } catch (error) {
            console.error('Notion token exchange error:', error);
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

    setCredentials(clientId, redirectUri) {
        this.clientId = clientId;
        this.redirectUri = redirectUri;
        localStorage.setItem('notionClientId', clientId);
        localStorage.setItem('notionRedirectUri', redirectUri);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TrelloSso, MicrosoftTeamsSso, SlackSso, NotionSso };
}
