/* =====================================================
   CALENDLY SSO IMPLEMENTATION
   ===================================================== */

class CalendlySso {
    constructor() {
        this.provider = 'calendly';
        this.clientId = localStorage.getItem('calendlyClientId') || '';
        this.clientSecret = localStorage.getItem('calendlyClientSecret') || '';
        this.redirectUri = localStorage.getItem('calendlyRedirectUri') || `${window.location.origin}/calendly-callback.html`;
        this.accessToken = sessionStorage.getItem('calendlyAccessToken') || null;
        this.currentUser = JSON.parse(sessionStorage.getItem('calendlyUser') || 'null');
    }

    async startSSOLogin() {
        if (!this.clientId) {
            throw new Error('Calendly Client ID not configured');
        }

        // Generate state for CSRF protection
        const state = this.generateRandomString(32);
        sessionStorage.setItem('calendlyOAuthState', state);

        // Calendly OAuth endpoint
        const authUrl = new URL('https://auth.calendly.com/oauth/authorize');
        authUrl.searchParams.append('client_id', this.clientId);
        authUrl.searchParams.append('redirect_uri', this.redirectUri);
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('state', state);
        authUrl.searchParams.append('scope', 'calendar:read calendar:write user:read');

        window.location.href = authUrl.toString();
    }

    async exchangeCodeForToken(code, state) {
        // Verify state parameter
        const savedState = sessionStorage.getItem('calendlyOAuthState');
        if (state !== savedState) {
            throw new Error('Invalid state parameter - CSRF validation failed');
        }

        try {
            const response = await fetch('/api/calendar/oauth/callback/calendly', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, state })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Token exchange failed');

            this.accessToken = data.accessToken;
            this.currentUser = data.user;

            sessionStorage.setItem('calendlyAccessToken', data.accessToken);
            sessionStorage.setItem('calendlyUser', JSON.stringify(data.user));
            sessionStorage.setItem('calendlyConnectionId', data.connectionId);

            return { success: true, ...data };
        } catch (error) {
            console.error('Calendly token exchange error:', error);
            throw error;
        }
    }

    async refreshToken() {
        try {
            const connectionId = sessionStorage.getItem('calendlyConnectionId');
            if (!connectionId) throw new Error('No connection found');

            const response = await fetch(`/api/calendar/oauth/refresh/${connectionId}`, {
                method: 'POST'
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Token refresh failed');

            this.accessToken = data.accessToken;
            sessionStorage.setItem('calendlyAccessToken', data.accessToken);

            return data;
        } catch (error) {
            console.error('Calendly token refresh error:', error);
            this.accessToken = null;
            sessionStorage.removeItem('calendlyAccessToken');
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
        localStorage.setItem('calendlyClientId', clientId);
        localStorage.setItem('calendlyClientSecret', clientSecret);
        localStorage.setItem('calendlyRedirectUri', redirectUri);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CalendlySso;
}
