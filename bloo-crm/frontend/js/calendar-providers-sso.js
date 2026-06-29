/* =====================================================
   APPLE CALENDAR SSO IMPLEMENTATION
   ===================================================== */

class AppleCalendarSso {
    constructor() {
        this.provider = 'apple-calendar';
        this.clientId = localStorage.getItem('appleCalendarClientId') || '';
        this.teamId = localStorage.getItem('appleCalendarTeamId') || '';
        this.keyId = localStorage.getItem('appleCalendarKeyId') || '';
        this.redirectUri = localStorage.getItem('appleCalendarRedirectUri') || `${window.location.origin}/apple-calendar-callback.html`;
        this.accessToken = sessionStorage.getItem('appleCalendarAccessToken') || null;
        this.currentUser = JSON.parse(sessionStorage.getItem('appleCalendarUser') || 'null');
    }

    async startSSOLogin() {
        if (!this.clientId) {
            throw new Error('Apple Calendar Client ID not configured');
        }

        const state = this.generateRandomString(32);
        sessionStorage.setItem('appleCalendarOAuthState', state);

        // Apple OAuth endpoint (via iCloud)
        const authUrl = new URL('https://appleid.apple.com/auth/oauth2/authorize');
        authUrl.searchParams.append('client_id', this.clientId);
        authUrl.searchParams.append('redirect_uri', this.redirectUri);
        authUrl.searchParams.append('response_type', 'code id_token');
        authUrl.searchParams.append('response_mode', 'fragment');
        authUrl.searchParams.append('scope', 'openid email');
        authUrl.searchParams.append('state', state);

        window.location.href = authUrl.toString();
    }

    async exchangeCodeForToken(code, state) {
        const savedState = sessionStorage.getItem('appleCalendarOAuthState');
        if (state !== savedState) {
            throw new Error('Invalid state parameter - CSRF validation failed');
        }

        try {
            const response = await fetch('/api/calendar/oauth/callback/apple-calendar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, state })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Token exchange failed');

            this.accessToken = data.accessToken;
            this.currentUser = data.user;

            sessionStorage.setItem('appleCalendarAccessToken', data.accessToken);
            sessionStorage.setItem('appleCalendarUser', JSON.stringify(data.user));
            sessionStorage.setItem('appleCalendarConnectionId', data.connectionId);

            return { success: true, ...data };
        } catch (error) {
            console.error('Apple Calendar token exchange error:', error);
            throw error;
        }
    }

    async refreshToken() {
        try {
            const connectionId = sessionStorage.getItem('appleCalendarConnectionId');
            if (!connectionId) throw new Error('No connection found');

            const response = await fetch(`/api/calendar/oauth/refresh/${connectionId}`, {
                method: 'POST'
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Token refresh failed');

            this.accessToken = data.accessToken;
            sessionStorage.setItem('appleCalendarAccessToken', data.accessToken);

            return data;
        } catch (error) {
            console.error('Apple Calendar token refresh error:', error);
            this.accessToken = null;
            sessionStorage.removeItem('appleCalendarAccessToken');
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

    setCredentials(clientId, teamId, keyId, redirectUri) {
        this.clientId = clientId;
        this.teamId = teamId;
        this.keyId = keyId;
        this.redirectUri = redirectUri;
        localStorage.setItem('appleCalendarClientId', clientId);
        localStorage.setItem('appleCalendarTeamId', teamId);
        localStorage.setItem('appleCalendarKeyId', keyId);
        localStorage.setItem('appleCalendarRedirectUri', redirectUri);
    }
}

/* =====================================================
   ZOOM CALENDAR SSO IMPLEMENTATION
   ===================================================== */

class ZoomSso {
    constructor() {
        this.provider = 'zoom';
        this.clientId = localStorage.getItem('zoomClientId') || '';
        this.clientSecret = localStorage.getItem('zoomClientSecret') || '';
        this.redirectUri = localStorage.getItem('zoomRedirectUri') || `${window.location.origin}/zoom-callback.html`;
        this.accessToken = sessionStorage.getItem('zoomAccessToken') || null;
        this.currentUser = JSON.parse(sessionStorage.getItem('zoomUser') || 'null');
    }

    async startSSOLogin() {
        if (!this.clientId) {
            throw new Error('Zoom Client ID not configured');
        }

        const state = this.generateRandomString(32);
        sessionStorage.setItem('zoomOAuthState', state);

        const authUrl = new URL('https://zoom.us/oauth/authorize');
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('client_id', this.clientId);
        authUrl.searchParams.append('redirect_uri', this.redirectUri);
        authUrl.searchParams.append('state', state);
        authUrl.searchParams.append('scope', 'calendar:read calendar:write');

        window.location.href = authUrl.toString();
    }

    async exchangeCodeForToken(code, state) {
        const savedState = sessionStorage.getItem('zoomOAuthState');
        if (state !== savedState) {
            throw new Error('Invalid state parameter - CSRF validation failed');
        }

        try {
            const response = await fetch('/api/calendar/oauth/callback/zoom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, state })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Token exchange failed');

            this.accessToken = data.accessToken;
            this.currentUser = data.user;

            sessionStorage.setItem('zoomAccessToken', data.accessToken);
            sessionStorage.setItem('zoomUser', JSON.stringify(data.user));
            sessionStorage.setItem('zoomConnectionId', data.connectionId);

            return { success: true, ...data };
        } catch (error) {
            console.error('Zoom token exchange error:', error);
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

    setCredentials(clientId, clientSecret, redirectUri) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri;
        localStorage.setItem('zoomClientId', clientId);
        localStorage.setItem('zoomClientSecret', clientSecret);
        localStorage.setItem('zoomRedirectUri', redirectUri);
    }
}

/* =====================================================
   MONDAY.COM CALENDAR SSO IMPLEMENTATION
   ===================================================== */

class MondaySso {
    constructor() {
        this.provider = 'monday';
        this.clientId = localStorage.getItem('mondayClientId') || '';
        this.redirectUri = localStorage.getItem('mondayRedirectUri') || `${window.location.origin}/monday-callback.html`;
        this.accessToken = sessionStorage.getItem('mondayAccessToken') || null;
        this.currentUser = JSON.parse(sessionStorage.getItem('mondayUser') || 'null');
    }

    async startSSOLogin() {
        if (!this.clientId) {
            throw new Error('Monday Client ID not configured');
        }

        const state = this.generateRandomString(32);
        sessionStorage.setItem('mondayOAuthState', state);

        const authUrl = new URL('https://auth.monday.com/oauth2/authorize');
        authUrl.searchParams.append('client_id', this.clientId);
        authUrl.searchParams.append('redirect_uri', this.redirectUri);
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('state', state);
        authUrl.searchParams.append('scope', 'boards:read boards:write');

        window.location.href = authUrl.toString();
    }

    async exchangeCodeForToken(code, state) {
        const savedState = sessionStorage.getItem('mondayOAuthState');
        if (state !== savedState) {
            throw new Error('Invalid state parameter - CSRF validation failed');
        }

        try {
            const response = await fetch('/api/calendar/oauth/callback/monday', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, state })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Token exchange failed');

            this.accessToken = data.accessToken;
            this.currentUser = data.user;

            sessionStorage.setItem('mondayAccessToken', data.accessToken);
            sessionStorage.setItem('mondayUser', JSON.stringify(data.user));
            sessionStorage.setItem('mondayConnectionId', data.connectionId);

            return { success: true, ...data };
        } catch (error) {
            console.error('Monday token exchange error:', error);
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
        localStorage.setItem('mondayClientId', clientId);
        localStorage.setItem('mondayRedirectUri', redirectUri);
    }
}

/* =====================================================
   ASANA CALENDAR SSO IMPLEMENTATION
   ===================================================== */

class AsanaSso {
    constructor() {
        this.provider = 'asana';
        this.clientId = localStorage.getItem('asanaClientId') || '';
        this.redirectUri = localStorage.getItem('asanaRedirectUri') || `${window.location.origin}/asana-callback.html`;
        this.accessToken = sessionStorage.getItem('asanaAccessToken') || null;
        this.currentUser = JSON.parse(sessionStorage.getItem('asanaUser') || 'null');
    }

    async startSSOLogin() {
        if (!this.clientId) {
            throw new Error('Asana Client ID not configured');
        }

        const state = this.generateRandomString(32);
        sessionStorage.setItem('asanaOAuthState', state);

        const authUrl = new URL('https://app.asana.com/-/oauth_authorize');
        authUrl.searchParams.append('client_id', this.clientId);
        authUrl.searchParams.append('redirect_uri', this.redirectUri);
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('state', state);
        authUrl.searchParams.append('scope', 'default');

        window.location.href = authUrl.toString();
    }

    async exchangeCodeForToken(code, state) {
        const savedState = sessionStorage.getItem('asanaOAuthState');
        if (state !== savedState) {
            throw new Error('Invalid state parameter - CSRF validation failed');
        }

        try {
            const response = await fetch('/api/calendar/oauth/callback/asana', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, state })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Token exchange failed');

            this.accessToken = data.accessToken;
            this.currentUser = data.user;

            sessionStorage.setItem('asanaAccessToken', data.accessToken);
            sessionStorage.setItem('asanaUser', JSON.stringify(data.user));
            sessionStorage.setItem('asanaConnectionId', data.connectionId);

            return { success: true, ...data };
        } catch (error) {
            console.error('Asana token exchange error:', error);
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
        localStorage.setItem('asanaClientId', clientId);
        localStorage.setItem('asanaRedirectUri', redirectUri);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AppleCalendarSso, ZoomSso, MondaySso, AsanaSso };
}
