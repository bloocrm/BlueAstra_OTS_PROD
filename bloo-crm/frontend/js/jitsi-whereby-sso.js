/* =====================================================
   JITSI MEET IMPLEMENTATION (No OAuth)
   ===================================================== */

class JitsiMeetSSO {
    constructor() {
        this.isLoggedIn = false;
        this.user = null;
        this.userHubUrl = 'https://meet.jit.si/';
        this.jitsiInstanceUrl = 'https://meet.jit.si/';
    }

    async checkExistingSession() {
        // Jitsi doesn't require authentication
        this.isLoggedIn = true;
        this.user = { displayName: 'Jitsi User', email: null };
        this.emit('session-active', this.user);
        return true;
    }

    startSSOLogin() {
        // Jitsi doesn't require login - show info
        console.log('ℹ️ Jitsi Meet is an open platform - no login required');
        this.isLoggedIn = true;
        this.emit('login-success', this.user);
    }

    async createMeeting(config) {
        try {
            // Generate random meeting name if not provided
            const meetingName = config.title
                ? config.title.toLowerCase().replace(/\s+/g, '-').substring(0, 30)
                : 'meeting-' + Math.random().toString(36).substring(7);

            const meetingUrl = `${this.jitsiInstanceUrl}${meetingName}`;

            console.log('✅ Jitsi meeting link generated:', meetingUrl);
            this.emit('meeting-created', { url: meetingUrl });

            return {
                meetingId: meetingName,
                meetingNumber: meetingName,
                meetingUrl: meetingUrl,
                joinUrl: meetingUrl,
                status: 'active',
                note: 'Jitsi Meet is open - anyone with the link can join'
            };
        } catch (error) {
            console.error('Error creating Jitsi meeting:', error);
            this.emit('meeting-creation-error', error);
            throw error;
        }
    }

    openUserHub() {
        window.open(this.userHubUrl, '_blank');
    }

    logout() {
        // Jitsi doesn't maintain sessions
        console.log('Jitsi Meet session ended');
        this.emit('logout', null);
    }

    isUserLoggedIn() {
        return true; // Jitsi always available
    }

    on(event, callback) {
        if (!window.jitsiEvents) window.jitsiEvents = {};
        if (!window.jitsiEvents[event]) window.jitsiEvents[event] = [];
        window.jitsiEvents[event].push(callback);
    }

    emit(event, data) {
        if (window.jitsiEvents && window.jitsiEvents[event]) {
            window.jitsiEvents[event].forEach(callback => callback(data));
        }
    }
}

if (typeof window !== 'undefined') {
    window.JitsiMeetSSO = JitsiMeetSSO;
}

/* =====================================================
   WHEREBY (APPEAR.IN) SSO IMPLEMENTATION
   ===================================================== */

class WherebySSO {
    constructor() {
        this.clientId = localStorage.getItem('wherebyClientId') || 'YOUR_WHEREBY_CLIENT_ID';
        this.apiKey = localStorage.getItem('wherebyApiKey') || 'YOUR_WHEREBY_API_KEY';
        this.redirectUri = `${window.location.origin}/whereby-callback.html`;
        this.accessToken = sessionStorage.getItem('wherebyAccessToken');
        this.tokenExpiresAt = parseInt(sessionStorage.getItem('wherebyTokenExpiresAt')) || 0;
        this.isLoggedIn = this.accessToken && !this.isTokenExpired();
        this.user = null;
        this.userHubUrl = 'https://app.whereby.com/';
        this.wherebyApiUrl = 'https://api.whereby.com/v1';
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
                this.tokenExpiresAt = Date.now() + (3600 * 1000);
                sessionStorage.setItem('wherebyAccessToken', this.accessToken);
                sessionStorage.setItem('wherebyTokenExpiresAt', this.tokenExpiresAt.toString());
                await this.getCurrentUser();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error checking Whereby session:', error);
            return false;
        }
    }

    isTokenExpired() {
        return Date.now() >= this.tokenExpiresAt;
    }

    startSSOLogin() {
        const authUrl = `https://app.whereby.com/`;
        window.location.href = authUrl;
    }

    async getCurrentUser() {
        try {
            if (!this.apiKey && !this.accessToken) throw new Error('No credentials available');

            const response = await fetch(`${this.wherebyApiUrl}/user`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken || this.apiKey}`
                }
            });

            if (!response.ok) throw new Error('Failed to get user info');

            const userData = await response.json();
            this.user = {
                id: userData.id,
                displayName: userData.name || userData.email,
                email: userData.email,
                avatar: null
            };

            sessionStorage.setItem('wherebyUser', JSON.stringify(this.user));
            this.isLoggedIn = true;
            return this.user;
        } catch (error) {
            console.error('Error getting Whereby user info:', error);
            throw error;
        }
    }

    async createMeeting(config) {
        try {
            if (!this.apiKey && !this.accessToken) throw new Error('Not authenticated with Whereby');

            const meetingData = {
                name: config.title || 'Whereby Meeting',
                description: config.description || '',
                duration: config.duration || 60,
                recordingEnabled: config.recordingEnabled || false
            };

            const response = await fetch(`${this.wherebyApiUrl}/rooms`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken || this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(meetingData)
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to create meeting');

            console.log('✅ Whereby meeting created:', data.id);
            this.emit('meeting-created', data);

            return {
                meetingId: data.id,
                meetingNumber: data.id,
                meetingUrl: data.roomUrl,
                joinUrl: data.roomUrl,
                status: 'active'
            };
        } catch (error) {
            console.error('Error creating Whereby meeting:', error);
            this.emit('meeting-creation-error', error);
            throw error;
        }
    }

    openUserHub() {
        window.open(this.userHubUrl, '_blank');
    }

    logout() {
        this.accessToken = null;
        this.tokenExpiresAt = 0;
        this.isLoggedIn = false;
        this.user = null;

        sessionStorage.removeItem('wherebyAccessToken');
        sessionStorage.removeItem('wherebyTokenExpiresAt');
        sessionStorage.removeItem('wherebyUser');

        console.log('Logged out from Whereby');
        this.emit('logout', null);
    }

    isUserLoggedIn() {
        return this.isLoggedIn && (this.accessToken || this.apiKey) && !this.isTokenExpired();
    }

    on(event, callback) {
        if (!window.wherebyEvents) window.wherebyEvents = {};
        if (!window.wherebyEvents[event]) window.wherebyEvents[event] = [];
        window.wherebyEvents[event].push(callback);
    }

    emit(event, data) {
        if (window.wherebyEvents && window.wherebyEvents[event]) {
            window.wherebyEvents[event].forEach(callback => callback(data));
        }
    }
}

if (typeof window !== 'undefined') {
    window.WherebySSO = WherebySSO;
}
