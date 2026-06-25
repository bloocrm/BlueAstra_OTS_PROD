/* =====================================================
   UNIFIED MEETING PLATFORM MANAGER
   ===================================================== */

class MeetingPlatformManager {
    constructor() {
        this.platforms = {
            'webex': { name: 'Cisco Webex', icon: '#00A1F3', ssoClass: 'WebexSSO' },
            'zoom': { name: 'Zoom', icon: '#2D8CFF', ssoClass: 'ZoomSSO' },
            'google-meet': { name: 'Google Meet', icon: '#EA4335', ssoClass: 'GoogleMeetSSO' },
            'microsoft-teams': { name: 'Microsoft Teams', icon: '#6264A7', ssoClass: 'MicrosoftTeamsSSO' },
            'jitsi': { name: 'Jitsi Meet', icon: '#25A643', ssoClass: 'JitsiMeetSSO' },
            'whereby': { name: 'Whereby', icon: '#FF6B6B', ssoClass: 'WherebySSO' }
        };

        this.currentPlatform = localStorage.getItem('selectedMeetingPlatform') || 'webex';
        this.ssoInstances = {};
        this.initializeAllPlatforms();
    }

    initializeAllPlatforms() {
        for (const platformId in this.platforms) {
            const platform = this.platforms[platformId];
            const SSOClass = window[platform.ssoClass];
            if (SSOClass) {
                this.ssoInstances[platformId] = new SSOClass();
                console.log(`✅ Initialized ${platform.name}`);
            }
        }
    }

    async setCurrentPlatform(platformId) {
        if (!this.platforms[platformId]) {
            throw new Error(`Unknown platform: ${platformId}`);
        }

        this.currentPlatform = platformId;
        localStorage.setItem('selectedMeetingPlatform', platformId);
        console.log(`Platform switched to: ${this.platforms[platformId].name}`);

        return this.ssoInstances[platformId];
    }

    getCurrentSSO() {
        return this.ssoInstances[this.currentPlatform];
    }

    getPlatformInfo(platformId) {
        return this.platforms[platformId || this.currentPlatform];
    }

    async startLogin(platformId) {
        const sso = this.ssoInstances[platformId || this.currentPlatform];
        if (!sso) throw new Error('Platform not initialized');

        await sso.checkExistingSession();
        if (!sso.isUserLoggedIn()) {
            if (sso.startSSOLogin) {
                sso.startSSOLogin();
            }
        }
    }

    async createMeeting(config, platformId) {
        const sso = this.ssoInstances[platformId || this.currentPlatform];
        if (!sso) throw new Error('Platform not initialized');

        if (!sso.isUserLoggedIn()) {
            throw new Error(`Not logged in to ${this.platforms[platformId || this.currentPlatform].name}`);
        }

        return await sso.createMeeting(config);
    }

    logout(platformId) {
        const sso = this.ssoInstances[platformId || this.currentPlatform];
        if (sso && sso.logout) {
            sso.logout();
        }
    }

    isLoggedIn(platformId) {
        const sso = this.ssoInstances[platformId || this.currentPlatform];
        return sso && sso.isUserLoggedIn();
    }

    getLoginStatus(platformId) {
        const sso = this.ssoInstances[platformId || this.currentPlatform];
        if (!sso) return null;

        return {
            platform: this.platforms[platformId || this.currentPlatform].name,
            isLoggedIn: sso.isUserLoggedIn(),
            user: sso.user,
            hubUrl: sso.userHubUrl
        };
    }

    getAllStatus() {
        const status = {};
        for (const platformId in this.ssoInstances) {
            const sso = this.ssoInstances[platformId];
            status[platformId] = {
                platform: this.platforms[platformId].name,
                isLoggedIn: sso.isUserLoggedIn(),
                user: sso.user
            };
        }
        return status;
    }

    openUserHub(platformId) {
        const sso = this.ssoInstances[platformId || this.currentPlatform];
        if (sso && sso.openUserHub) {
            sso.openUserHub();
        }
    }

    on(event, platformId, callback) {
        const sso = this.ssoInstances[platformId || this.currentPlatform];
        if (sso && sso.on) {
            sso.on(event, callback);
        }
    }
}

// Global instance
let meetingManager = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing Meeting Platform Manager...');
    meetingManager = new MeetingPlatformManager();

    // Check existing sessions for all platforms
    for (const platformId in meetingManager.ssoInstances) {
        try {
            await meetingManager.ssoInstances[platformId].checkExistingSession();
        } catch (error) {
            console.warn(`Error checking ${platformId} session:`, error);
        }
    }
});

// Make available globally
if (typeof window !== 'undefined') {
    window.MeetingPlatformManager = MeetingPlatformManager;
}
