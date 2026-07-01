/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   UNIFIED EMAIL PLATFORM MANAGER
   ===================================================== */

class EmailPlatformManager {
    constructor() {
        this.platforms = {
            'gmail': { name: 'Gmail', icon: '#EA4335', ssoClass: 'GmailSSO' },
            'outlook': { name: 'Microsoft Outlook', icon: '#0078D4', ssoClass: 'OutlookSSO' },
            'yahoo': { name: 'Yahoo Mail', icon: '#7B0099', ssoClass: 'YahooSSO' },
            'protonmail': { name: 'ProtonMail', icon: '#6D4AFF', ssoClass: 'ProtonMailSSO' },
            'tutamail': { name: 'Tutamail', icon: '#FF6B35', ssoClass: 'TutamailSSO' },
            'mailchimp': { name: 'MailChimp', icon: '#FFE01B', ssoClass: 'MailChimpSSO' }
        };

        this.currentProvider = localStorage.getItem('selectedEmailProvider') || 'gmail';
        this.ssoInstances = {};
        this.connections = [];
        this.initializeAllPlatforms();
    }

    initializeAllPlatforms() {
        for (const platformId in this.platforms) {
            const platform = this.platforms[platformId];
            const SSOClass = window[platform.ssoClass];
            if (SSOClass) {
                try {
                    this.ssoInstances[platformId] = new SSOClass();
                    console.log(`✅ Initialized ${platform.name}`);
                } catch (error) {
                    console.warn(`⚠️ Could not initialize ${platform.name}:`, error.message);
                }
            } else {
                console.warn(`⚠️ ${platform.ssoClass} not loaded for ${platform.name}`);
            }
        }
    }

    async setCurrentProvider(providerId) {
        if (!this.platforms[providerId]) {
            throw new Error(`Unknown provider: ${providerId}`);
        }

        this.currentProvider = providerId;
        localStorage.setItem('selectedEmailProvider', providerId);
        console.log(`Provider switched to: ${this.platforms[providerId].name}`);

        return this.ssoInstances[providerId];
    }

    getCurrentSSO() {
        return this.ssoInstances[this.currentProvider];
    }

    getPlatformInfo(providerId) {
        return this.platforms[providerId || this.currentProvider];
    }

    async startLogin(providerId) {
        const sso = this.ssoInstances[providerId || this.currentProvider];
        if (!sso) throw new Error('Email provider not initialized');

        await sso.checkExistingSession();
        if (!sso.isUserLoggedIn()) {
            if (sso.startSSOLogin) {
                sso.startSSOLogin();
            }
        }
    }

    async connectProvider(providerId) {
        const sso = this.ssoInstances[providerId];
        if (!sso) throw new Error('Email provider not initialized');

        try {
            await sso.startSSOLogin();
            return { status: 'pending', message: 'Redirecting to authentication...' };
        } catch (error) {
            console.error('Connection error:', error);
            throw error;
        }
    }

    async addConnection(connectionData) {
        this.connections.push({
            id: 'conn_' + Date.now(),
            ...connectionData,
            connectedAt: new Date().toISOString()
        });
        this.emit('connection-added', connectionData);
        return this.connections[this.connections.length - 1];
    }

    getConnections() {
        return this.connections;
    }

    getConnection(connectionId) {
        return this.connections.find(c => c.id === connectionId);
    }

    async removeConnection(connectionId) {
        const index = this.connections.findIndex(c => c.id === connectionId);
        if (index > -1) {
            const connection = this.connections[index];
            this.connections.splice(index, 1);
            this.emit('connection-removed', connection);
            return { status: 'success', message: 'Connection removed' };
        }
        throw new Error('Connection not found');
    }

    async startSync(connectionId, options = {}) {
        const connection = this.getConnection(connectionId);
        if (!connection) throw new Error('Connection not found');

        const syncId = 'sync_' + Date.now();
        this.emit('sync-started', { syncId, connectionId, provider: connection.provider });

        return {
            syncId,
            status: 'started',
            provider: connection.provider,
            email: connection.email
        };
    }

    getSyncStatus(syncId) {
        return {
            syncId,
            status: 'in-progress',
            progress: 50,
            downloaded: 25,
            total: 50
        };
    }

    logout(providerId) {
        const sso = this.ssoInstances[providerId || this.currentProvider];
        if (sso && sso.logout) {
            sso.logout();
            this.emit('logout', { provider: this.platforms[providerId].name });
        }
    }

    isLoggedIn(providerId) {
        const sso = this.ssoInstances[providerId || this.currentProvider];
        return sso && sso.isUserLoggedIn?.();
    }

    getLoginStatus(providerId) {
        const sso = this.ssoInstances[providerId || this.currentProvider];
        if (!sso) return null;

        return {
            provider: this.platforms[providerId || this.currentProvider].name,
            isLoggedIn: sso.isUserLoggedIn?.(),
            user: sso.user,
            email: sso.userEmail
        };
    }

    getAllStatus() {
        const status = {};
        for (const providerId in this.ssoInstances) {
            const sso = this.ssoInstances[providerId];
            status[providerId] = {
                provider: this.platforms[providerId].name,
                isLoggedIn: sso.isUserLoggedIn?.(),
                user: sso.user,
                email: sso.userEmail
            };
        }
        return status;
    }

    openUserHub(providerId) {
        const sso = this.ssoInstances[providerId || this.currentProvider];
        if (sso && sso.openUserHub) {
            sso.openUserHub();
        }
    }

    on(event, callback) {
        if (!window.emailManagerEvents) window.emailManagerEvents = {};
        if (!window.emailManagerEvents[event]) window.emailManagerEvents[event] = [];
        window.emailManagerEvents[event].push(callback);
    }

    emit(event, data) {
        if (window.emailManagerEvents && window.emailManagerEvents[event]) {
            window.emailManagerEvents[event].forEach(callback => callback(data));
        }
    }
}

let emailManager = null;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing Email Platform Manager...');
    emailManager = new EmailPlatformManager();
    window.emailManager = emailManager; // expose to other scripts (email-client.js uses window.emailManager)

    // Check existing sessions for all providers
    for (const providerId in emailManager.ssoInstances) {
        try {
            await emailManager.ssoInstances[providerId].checkExistingSession();
        } catch (error) {
            console.warn(`Error checking ${providerId} session:`, error);
        }
    }
});

if (typeof window !== 'undefined') {
    window.EmailPlatformManager = EmailPlatformManager;
}
