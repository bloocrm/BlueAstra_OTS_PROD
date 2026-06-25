/* =====================================================
   OUTLOOK SSO IMPLEMENTATION
   ===================================================== */

class OutlookSSO {
    constructor() {
        this.clientId = localStorage.getItem('outlookClientId') || 'YOUR_OUTLOOK_CLIENT_ID';
        this.clientSecret = localStorage.getItem('outlookClientSecret') || 'YOUR_OUTLOOK_CLIENT_SECRET';
        this.tenantId = localStorage.getItem('outlookTenantId') || 'common';
        this.redirectUri = `${window.location.origin}/outlook-callback.html`;
        this.accessToken = sessionStorage.getItem('outlookAccessToken');
        this.refreshToken = sessionStorage.getItem('outlookRefreshToken');
        this.tokenExpiresAt = parseInt(sessionStorage.getItem('outlookTokenExpiresAt')) || 0;
        this.isLoggedIn = this.accessToken && !this.isTokenExpired();
        this.user = null;
        this.userEmail = null;
        this.userHubUrl = 'https://outlook.office.com/';
        this.graphApiUrl = 'https://graph.microsoft.com/v1.0';
        this.state = this.generateState();
    }

    generateState() {
        return 'outlook_' + Math.random().toString(36).substring(7);
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
            console.error('Error checking Outlook session:', error);
            return false;
        }
    }

    isTokenExpired() {
        return Date.now() >= this.tokenExpiresAt;
    }

    startSSOLogin() {
        sessionStorage.setItem('outlookState', this.state);

        const authUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/authorize?` +
            `client_id=${this.clientId}&` +
            `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
            `response_type=code&` +
            `scope=${encodeURIComponent('Mail.Read User.Read offline_access')}&` +
            `state=${this.state}&` +
            `response_mode=query`;

        window.location.href = authUrl;
    }

    async exchangeCodeForToken(code) {
        try {
            const response = await fetch(
                `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        client_id: this.clientId,
                        client_secret: this.clientSecret,
                        code: code,
                        redirect_uri: this.redirectUri,
                        grant_type: 'authorization_code',
                        scope: 'Mail.Read User.Read offline_access'
                    })
                }
            );

            const data = await response.json();
            if (!response.ok) throw new Error(data.error_description || 'Token exchange failed');

            this.accessToken = data.access_token;
            this.refreshToken = data.refresh_token || this.refreshToken;
            this.tokenExpiresAt = Date.now() + ((data.expires_in || 3599) * 1000);

            sessionStorage.setItem('outlookAccessToken', this.accessToken);
            if (this.refreshToken) sessionStorage.setItem('outlookRefreshToken', this.refreshToken);
            sessionStorage.setItem('outlookTokenExpiresAt', this.tokenExpiresAt.toString());

            await this.getCurrentUser();
            this.emit('login-success', this.user);
            return this.user;
        } catch (error) {
            console.error('Outlook token exchange error:', error);
            throw error;
        }
    }

    async refreshAccessToken() {
        if (!this.refreshToken) throw new Error('No refresh token available');

        try {
            const response = await fetch(
                `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        client_id: this.clientId,
                        client_secret: this.clientSecret,
                        refresh_token: this.refreshToken,
                        grant_type: 'refresh_token',
                        scope: 'Mail.Read User.Read offline_access'
                    })
                }
            );

            const data = await response.json();
            if (!response.ok) throw new Error('Token refresh failed');

            this.accessToken = data.access_token;
            this.tokenExpiresAt = Date.now() + ((data.expires_in || 3599) * 1000);
            sessionStorage.setItem('outlookAccessToken', this.accessToken);

            this.emit('token-refreshed', { provider: 'outlook' });
            return this.accessToken;
        } catch (error) {
            console.error('Outlook token refresh error:', error);
            this.emit('token-expired', { provider: 'outlook' });
            throw error;
        }
    }

    async getCurrentUser() {
        try {
            if (!this.accessToken) throw new Error('No access token');

            const response = await fetch(`${this.graphApiUrl}/me`, {
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
            });

            if (!response.ok) throw new Error('Failed to get user info');

            const userData = await response.json();
            this.user = {
                id: userData.id,
                displayName: userData.displayName,
                email: userData.mail || userData.userPrincipalName,
                avatar: null
            };
            this.userEmail = userData.mail || userData.userPrincipalName;
            this.isLoggedIn = true;

            sessionStorage.setItem('outlookUser', JSON.stringify(this.user));
            return this.user;
        } catch (error) {
            console.error('Error getting Outlook user info:', error);
            throw error;
        }
    }

    async getEmails(maxResults = 10) {
        try {
            if (!this.accessToken) throw new Error('Not authenticated');

            if (this.isTokenExpired()) {
                await this.refreshAccessToken();
            }

            const response = await fetch(
                `${this.graphApiUrl}/me/mailFolders/inbox/messages?$top=${maxResults}&$orderby=receivedDateTime desc`,
                { headers: { 'Authorization': `Bearer ${this.accessToken}` } }
            );

            if (!response.ok) throw new Error('Failed to fetch emails');

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching Outlook messages:', error);
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
                `${this.graphApiUrl}/me/messages/${messageId}`,
                { headers: { 'Authorization': `Bearer ${this.accessToken}` } }
            );

            if (!response.ok) throw new Error('Failed to fetch email details');

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching Outlook message details:', error);
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

        sessionStorage.removeItem('outlookAccessToken');
        sessionStorage.removeItem('outlookRefreshToken');
        sessionStorage.removeItem('outlookTokenExpiresAt');
        sessionStorage.removeItem('outlookUser');

        console.log('Logged out from Outlook');
        this.emit('logout', null);
    }

    isUserLoggedIn() {
        return this.isLoggedIn && this.accessToken && !this.isTokenExpired();
    }

    on(event, callback) {
        if (!window.outlookEvents) window.outlookEvents = {};
        if (!window.outlookEvents[event]) window.outlookEvents[event] = [];
        window.outlookEvents[event].push(callback);
    }

    emit(event, data) {
        if (window.outlookEvents && window.outlookEvents[event]) {
            window.outlookEvents[event].forEach(callback => callback(data));
        }
    }
}

if (typeof window !== 'undefined') {
    window.OutlookSSO = OutlookSSO;
}
