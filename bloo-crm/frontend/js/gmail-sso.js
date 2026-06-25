/* =====================================================
   GMAIL SSO IMPLEMENTATION
   ===================================================== */

class GmailSSO {
    constructor() {
        this.clientId = localStorage.getItem('gmailClientId') || 'YOUR_GMAIL_CLIENT_ID';
        this.clientSecret = localStorage.getItem('gmailClientSecret') || 'YOUR_GMAIL_CLIENT_SECRET';
        this.redirectUri = `${window.location.origin}/gmail-callback.html`;
        this.accessToken = sessionStorage.getItem('gmailAccessToken');
        this.refreshToken = sessionStorage.getItem('gmailRefreshToken');
        this.tokenExpiresAt = parseInt(sessionStorage.getItem('gmailTokenExpiresAt')) || 0;
        this.isLoggedIn = this.accessToken && !this.isTokenExpired();
        this.user = null;
        this.userEmail = null;
        this.userHubUrl = 'https://mail.google.com/';
        this.gmailApiUrl = 'https://www.googleapis.com/gmail/v1';
        this.state = this.generateState();
    }

    generateState() {
        return 'gmail_' + Math.random().toString(36).substring(7);
    }

    async checkExistingSession() {
        try {
            if (this.accessToken && !this.isTokenExpired()) {
                this.isLoggedIn = true;
                await this.getCurrentUser();
                this.emit('session-active', this.user);
                return true;
            }
            const params = new URLSearchParams(window.location.hash.substring(1));
            const token = params.get('access_token');
            if (token) {
                this.accessToken = token;
                this.tokenExpiresAt = Date.now() + (3599 * 1000);
                sessionStorage.setItem('gmailAccessToken', this.accessToken);
                sessionStorage.setItem('gmailTokenExpiresAt', this.tokenExpiresAt.toString());
                await this.getCurrentUser();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error checking Gmail session:', error);
            return false;
        }
    }

    isTokenExpired() {
        return Date.now() >= this.tokenExpiresAt;
    }

    startSSOLogin() {
        sessionStorage.setItem('gmailState', this.state);

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${this.clientId}&` +
            `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
            `response_type=code&` +
            `scope=${encodeURIComponent('https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile')}&` +
            `state=${this.state}&` +
            `access_type=offline&` +
            `prompt=consent`;

        window.location.href = authUrl;
    }

    async exchangeCodeForToken(code) {
        try {
            const response = await fetch('https://oauth2.googleapis.com/token', {
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

            sessionStorage.setItem('gmailAccessToken', this.accessToken);
            if (this.refreshToken) sessionStorage.setItem('gmailRefreshToken', this.refreshToken);
            sessionStorage.setItem('gmailTokenExpiresAt', this.tokenExpiresAt.toString());

            await this.getCurrentUser();
            this.emit('login-success', this.user);
            return this.user;
        } catch (error) {
            console.error('Gmail token exchange error:', error);
            throw error;
        }
    }

    async refreshAccessToken() {
        if (!this.refreshToken) throw new Error('No refresh token available');

        try {
            const response = await fetch('https://oauth2.googleapis.com/token', {
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
            sessionStorage.setItem('gmailAccessToken', this.accessToken);
            sessionStorage.setItem('gmailTokenExpiresAt', this.tokenExpiresAt.toString());

            this.emit('token-refreshed', { provider: 'gmail' });
            return this.accessToken;
        } catch (error) {
            console.error('Gmail token refresh error:', error);
            this.emit('token-expired', { provider: 'gmail' });
            throw error;
        }
    }

    async getCurrentUser() {
        try {
            if (!this.accessToken) throw new Error('No access token');

            const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
            });

            if (!response.ok) throw new Error('Failed to get user info');

            const userData = await response.json();
            this.user = {
                id: userData.id,
                displayName: userData.name,
                email: userData.email,
                avatar: userData.picture
            };
            this.userEmail = userData.email;
            this.isLoggedIn = true;

            sessionStorage.setItem('gmailUser', JSON.stringify(this.user));
            return this.user;
        } catch (error) {
            console.error('Error getting Gmail user info:', error);
            throw error;
        }
    }

    async getEmails(maxResults = 10, pageToken = null) {
        try {
            if (!this.accessToken) throw new Error('Not authenticated');

            if (this.isTokenExpired()) {
                await this.refreshAccessToken();
            }

            const response = await fetch(
                `${this.gmailApiUrl}/users/me/messages?maxResults=${maxResults}${pageToken ? '&pageToken=' + pageToken : ''}`,
                { headers: { 'Authorization': `Bearer ${this.accessToken}` } }
            );

            if (!response.ok) throw new Error('Failed to fetch emails');

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching Gmail messages:', error);
            throw error;
        }
    }

    async getEmailDetails(messageId) {
        try {
            if (!this.accessToken) throw new Error('Not authenticated');

            if (this.isTokenExpired()) {
                await this.refreshAccessToken();
            }

            const response = await fetch(
                `${this.gmailApiUrl}/users/me/messages/${messageId}`,
                { headers: { 'Authorization': `Bearer ${this.accessToken}` } }
            );

            if (!response.ok) throw new Error('Failed to fetch email details');

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching Gmail message details:', error);
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

        sessionStorage.removeItem('gmailAccessToken');
        sessionStorage.removeItem('gmailRefreshToken');
        sessionStorage.removeItem('gmailTokenExpiresAt');
        sessionStorage.removeItem('gmailUser');

        console.log('Logged out from Gmail');
        this.emit('logout', null);
    }

    isUserLoggedIn() {
        return this.isLoggedIn && this.accessToken && !this.isTokenExpired();
    }

    on(event, callback) {
        if (!window.gmailEvents) window.gmailEvents = {};
        if (!window.gmailEvents[event]) window.gmailEvents[event] = [];
        window.gmailEvents[event].push(callback);
    }

    emit(event, data) {
        if (window.gmailEvents && window.gmailEvents[event]) {
            window.gmailEvents[event].forEach(callback => callback(data));
        }
    }
}

if (typeof window !== 'undefined') {
    window.GmailSSO = GmailSSO;
}
