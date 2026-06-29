/* =====================================================
   ZOOM SSO IMPLEMENTATION
   ===================================================== */

class ZoomSSO {
    constructor() {
        this.clientId = localStorage.getItem('zoomClientId') || 'YOUR_ZOOM_CLIENT_ID';
        this.redirectUri = `${window.location.origin}/zoom-callback.html`;
        this.accessToken = sessionStorage.getItem('zoomAccessToken');
        this.refreshToken = sessionStorage.getItem('zoomRefreshToken');
        this.tokenExpiresAt = parseInt(sessionStorage.getItem('zoomTokenExpiresAt')) || 0;
        this.zoomAuthorizationUrl = 'https://zoom.us/oauth/authorize';
        this.zoomTokenUrl = 'https://zoom.us/oauth/token';
        this.isLoggedIn = this.accessToken && !this.isTokenExpired();
        this.user = null;
        this.userHubUrl = 'https://zoom.us/home';
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
            console.error('Error checking Zoom session:', error);
            return false;
        }
    }

    isTokenExpired() {
        return Date.now() >= this.tokenExpiresAt;
    }

    startSSOLogin() {
        const state = Math.random().toString(36).substring(7);
        sessionStorage.setItem('zoomOAuthState', state);

        const authUrl = new URL(this.zoomAuthorizationUrl);
        authUrl.searchParams.set('client_id', this.clientId);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('redirect_uri', this.redirectUri);
        authUrl.searchParams.set('state', state);

        window.location.href = authUrl.toString();
    }

    async exchangeCodeForToken(code) {
        try {
            const response = await fetch('/api/meetings/zoom/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, clientId: this.clientId })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Token exchange failed');

            this.setTokens(data);
            await this.getCurrentUser();
            this.isLoggedIn = true;

            console.log('✅ Zoom SSO Login successful');
            this.emit('login-success', this.user);
            return true;
        } catch (error) {
            console.error('Zoom token exchange error:', error);
            this.emit('login-error', error);
            throw error;
        }
    }

    setTokens(tokenData) {
        this.accessToken = tokenData.access_token;
        this.refreshToken = tokenData.refresh_token;
        const expiresIn = tokenData.expires_in || 3600;
        this.tokenExpiresAt = Date.now() + (expiresIn * 1000);

        sessionStorage.setItem('zoomAccessToken', this.accessToken);
        sessionStorage.setItem('zoomRefreshToken', this.refreshToken);
        sessionStorage.setItem('zoomTokenExpiresAt', this.tokenExpiresAt.toString());
    }

    async refreshAccessToken() {
        try {
            if (!this.refreshToken) throw new Error('No refresh token available');

            const response = await fetch('/api/meetings/zoom/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: this.refreshToken })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Token refresh failed');

            this.setTokens(data);
            console.log('✅ Zoom token refreshed successfully');
            this.emit('token-refreshed', null);
            return true;
        } catch (error) {
            console.error('Zoom token refresh error:', error);
            this.logout();
            this.emit('token-refresh-error', error);
            return false;
        }
    }

    async getCurrentUser() {
        try {
            if (!this.accessToken) throw new Error('No access token available');

            const response = await fetch('https://api.zoom.us/v2/users/me', {
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
                displayName: userData.first_name + ' ' + userData.last_name,
                email: userData.email,
                avatar: userData.pic_url
            };

            sessionStorage.setItem('zoomUser', JSON.stringify(this.user));
            return this.user;
        } catch (error) {
            console.error('Error getting Zoom user info:', error);
            throw error;
        }
    }

    async createMeeting(config) {
        try {
            if (!this.accessToken) throw new Error('Not authenticated with Zoom');
            if (this.isTokenExpired()) await this.refreshAccessToken();

            const meetingData = {
                topic: config.title || 'Zoom Meeting',
                type: 2,
                start_time: config.startTime,
                duration: config.duration || 60,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                settings: {
                    host_video: true,
                    participant_video: true,
                    join_before_host: true,
                    auto_recording: config.recordingEnabled ? 'cloud' : 'none'
                }
            };

            const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(meetingData)
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to create meeting');

            console.log('✅ Zoom meeting created:', data.id);
            this.emit('meeting-created', data);

            return {
                meetingId: data.id,
                meetingNumber: data.id,
                meetingUrl: data.join_url,
                joinUrl: data.join_url,
                password: data.password,
                status: 'active'
            };
        } catch (error) {
            console.error('Error creating Zoom meeting:', error);
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

        sessionStorage.removeItem('zoomAccessToken');
        sessionStorage.removeItem('zoomRefreshToken');
        sessionStorage.removeItem('zoomTokenExpiresAt');
        sessionStorage.removeItem('zoomUser');
        sessionStorage.removeItem('zoomOAuthState');

        console.log('Logged out from Zoom');
        this.emit('logout', null);
    }

    isUserLoggedIn() {
        return this.isLoggedIn && this.accessToken && !this.isTokenExpired();
    }

    on(event, callback) {
        if (!window.zoomEvents) window.zoomEvents = {};
        if (!window.zoomEvents[event]) window.zoomEvents[event] = [];
        window.zoomEvents[event].push(callback);
    }

    emit(event, data) {
        if (window.zoomEvents && window.zoomEvents[event]) {
            window.zoomEvents[event].forEach(callback => callback(data));
        }
    }
}

if (typeof window !== 'undefined') {
    window.ZoomSSO = ZoomSSO;
}
