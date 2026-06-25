/* =====================================================
   GOOGLE CALENDAR SSO IMPLEMENTATION
   ===================================================== */

class GoogleCalendarSso {
    constructor() {
        this.provider = 'google-calendar';
        this.clientId = localStorage.getItem('googleCalendarClientId') || '';
        this.redirectUri = localStorage.getItem('googleCalendarRedirectUri') || `${window.location.origin}/google-calendar-callback.html`;
        this.accessToken = sessionStorage.getItem('googleCalendarAccessToken') || null;
        this.refreshToken = sessionStorage.getItem('googleCalendarRefreshToken') || null;
        this.currentUser = JSON.parse(sessionStorage.getItem('googleCalendarUser') || 'null');
    }

    async startSSOLogin() {
        if (!this.clientId) {
            throw new Error('Google Calendar Client ID not configured');
        }

        // Generate PKCE code verifier and challenge
        const codeVerifier = this.generateRandomString(64);
        const codeChallenge = await this.generateCodeChallenge(codeVerifier);
        sessionStorage.setItem('googleCalendarCodeVerifier', codeVerifier);

        // Generate state for CSRF protection
        const state = this.generateRandomString(32);
        sessionStorage.setItem('googleCalendarOAuthState', state);

        // Google OAuth endpoint
        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.append('client_id', this.clientId);
        authUrl.searchParams.append('redirect_uri', this.redirectUri);
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('scope', 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile');
        authUrl.searchParams.append('state', state);
        authUrl.searchParams.append('access_type', 'offline');
        authUrl.searchParams.append('prompt', 'consent');
        authUrl.searchParams.append('code_challenge', codeChallenge);
        authUrl.searchParams.append('code_challenge_method', 'S256');

        window.location.href = authUrl.toString();
    }

    async exchangeCodeForToken(code, state) {
        // Verify state parameter
        const savedState = sessionStorage.getItem('googleCalendarOAuthState');
        if (state !== savedState) {
            throw new Error('Invalid state parameter - CSRF validation failed');
        }

        try {
            const response = await fetch('/api/calendar/oauth/callback/google-calendar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, state })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Token exchange failed');

            this.accessToken = data.accessToken;
            this.refreshToken = data.refreshToken;
            this.currentUser = data.user;

            sessionStorage.setItem('googleCalendarAccessToken', data.accessToken);
            if (data.refreshToken) sessionStorage.setItem('googleCalendarRefreshToken', data.refreshToken);
            sessionStorage.setItem('googleCalendarUser', JSON.stringify(data.user));
            sessionStorage.setItem('googleCalendarConnectionId', data.connectionId);

            return { success: true, ...data };
        } catch (error) {
            console.error('Google Calendar token exchange error:', error);
            throw error;
        }
    }

    async refreshToken() {
        try {
            const connectionId = sessionStorage.getItem('googleCalendarConnectionId');
            if (!connectionId) throw new Error('No connection found');

            const response = await fetch(`/api/calendar/oauth/refresh/${connectionId}`, {
                method: 'POST'
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Token refresh failed');

            this.accessToken = data.accessToken;
            sessionStorage.setItem('googleCalendarAccessToken', data.accessToken);

            return data;
        } catch (error) {
            console.error('Google Calendar token refresh error:', error);
            this.accessToken = null;
            sessionStorage.removeItem('googleCalendarAccessToken');
            throw error;
        }
    }

    isUserLoggedIn() {
        return !!this.accessToken && !!this.currentUser;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    async generateCodeChallenge(codeVerifier) {
        const encoder = new TextEncoder();
        const data = encoder.encode(codeVerifier);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return this.base64UrlEncode(hash);
    }

    base64UrlEncode(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }

    generateRandomString(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    setCredentials(clientId, redirectUri) {
        this.clientId = clientId;
        this.redirectUri = redirectUri;
        localStorage.setItem('googleCalendarClientId', clientId);
        localStorage.setItem('googleCalendarRedirectUri', redirectUri);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GoogleCalendarSso;
}
