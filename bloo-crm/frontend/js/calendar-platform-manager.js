/* =====================================================
   CALENDAR PLATFORM MANAGER
   Unified coordinator for all calendar provider SSO
   ===================================================== */

class CalendarPlatformManager {
    constructor() {
        this.providers = new Map();
        this.currentProvider = null;
        this.eventListeners = new Map();
        this.connections = new Map();
        this.initializeProviders();
    }

    initializeProviders() {
        // Initialize all calendar provider SSO instances
        const providers = [
            'calendly', 'google-calendar', 'outlook-calendar', 'apple-calendar',
            'zoom', 'monday', 'asana', 'trello', 'microsoft-teams', 'slack', 'notion'
        ];

        for (const provider of providers) {
            const className = this.getProviderClassName(provider);
            if (typeof window[className] !== 'undefined') {
                this.providers.set(provider, new window[className]());
            }
        }
    }

    getProviderClassName(provider) {
        const map = {
            'calendly': 'CalendlySso',
            'google-calendar': 'GoogleCalendarSso',
            'outlook-calendar': 'OutlookCalendarSso',
            'apple-calendar': 'AppleCalendarSso',
            'zoom': 'ZoomSso',
            'monday': 'MondaySso',
            'asana': 'AsanaSso',
            'trello': 'TrelloSso',
            'microsoft-teams': 'MicrosoftTeamsSso',
            'slack': 'SlackSso',
            'notion': 'NotionSso'
        };
        return map[provider];
    }

    setCurrentProvider(provider) {
        if (!this.providers.has(provider)) {
            throw new Error(`Provider ${provider} not found`);
        }
        this.currentProvider = provider;
        this.emit('provider-changed', { provider });
    }

    async connectProvider(provider) {
        const ssoInstance = this.providers.get(provider);
        if (!ssoInstance) {
            throw new Error(`Provider ${provider} not initialized`);
        }

        try {
            this.emit('connection-start', { provider });
            await ssoInstance.startSSOLogin();
            this.emit('connection-success', { provider });
        } catch (error) {
            this.emit('connection-error', { provider, error: error.message });
            throw error;
        }
    }

    async disconnectProvider(provider, connectionId) {
        try {
            const response = await fetch(`/api/calendar/disconnect/${connectionId}`, {
                method: 'POST'
            });
            const data = await response.json();
            this.emit('disconnection-success', { provider, connectionId });
            return data;
        } catch (error) {
            this.emit('disconnection-error', { provider, error: error.message });
            throw error;
        }
    }

    async startSync(connectionId, options = {}) {
        const { daysBack = 30, maxResults = 100, includeAttendees = true, includeRecurring = true } = options;

        try {
            this.emit('sync-start', { connectionId });

            const response = await fetch(`/api/calendar/sync/start/${connectionId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ daysBack, maxResults, includeAttendees, includeRecurring })
            });

            const data = await response.json();
            this.emit('sync-initiated', data);
            return data;
        } catch (error) {
            this.emit('sync-error', { connectionId, error: error.message });
            throw error;
        }
    }

    async getSyncStatus(syncId) {
        try {
            const response = await fetch(`/api/calendar/sync/status/${syncId}`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Failed to get sync status:', error);
            throw error;
        }
    }

    async getConnections() {
        try {
            const response = await fetch('/api/calendar/connections');
            const data = await response.json();
            this.connections = new Map(data.connections.map(c => [c.id, c]));
            return data.connections;
        } catch (error) {
            console.error('Failed to get connections:', error);
            return [];
        }
    }

    getLoginStatus(provider) {
        const ssoInstance = this.providers.get(provider);
        if (!ssoInstance) return 'not-initialized';
        return ssoInstance.isUserLoggedIn() ? 'logged-in' : 'logged-out';
    }

    getAllStatus() {
        const status = {};
        for (const [provider, ssoInstance] of this.providers) {
            status[provider] = {
                isLoggedIn: ssoInstance.isUserLoggedIn(),
                currentUser: ssoInstance.getCurrentUser()
            };
        }
        return status;
    }

    async getCurrentUser(provider) {
        const ssoInstance = this.providers.get(provider);
        if (!ssoInstance) return null;
        return ssoInstance.getCurrentUser();
    }

    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    async getCalendarEvents(connectionId, filters = {}) {
        try {
            const query = new URLSearchParams(filters).toString();
            const response = await fetch(`/api/calendar/events/${connectionId}?${query}`);
            const data = await response.json();
            return data.events || [];
        } catch (error) {
            console.error('Failed to get calendar events:', error);
            return [];
        }
    }

    async createCalendarEvent(connectionId, eventData) {
        try {
            const response = await fetch(`/api/calendar/events/${connectionId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eventData)
            });
            const data = await response.json();
            this.emit('event-created', data);
            return data;
        } catch (error) {
            console.error('Failed to create calendar event:', error);
            throw error;
        }
    }

    async updateCalendarEvent(connectionId, eventId, eventData) {
        try {
            const response = await fetch(`/api/calendar/events/${connectionId}/${eventId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eventData)
            });
            const data = await response.json();
            this.emit('event-updated', data);
            return data;
        } catch (error) {
            console.error('Failed to update calendar event:', error);
            throw error;
        }
    }

    async deleteCalendarEvent(connectionId, eventId) {
        try {
            const response = await fetch(`/api/calendar/events/${connectionId}/${eventId}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            this.emit('event-deleted', { connectionId, eventId });
            return data;
        } catch (error) {
            console.error('Failed to delete calendar event:', error);
            throw error;
        }
    }
}

// Create global instance
window.calendarManager = new CalendarPlatformManager();
