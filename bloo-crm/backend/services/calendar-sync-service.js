/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   CALENDAR SYNC SERVICE
   ===================================================== */

class CalendarSyncService {
    constructor() {
        this.syncSessions = new Map();
        this.internalCalendar = [];
        this.syncConflicts = [];
    }

    async syncGoogleCalendarEvents(accessToken, startDate = null, maxResults = 50) {
        try {
            let url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=${maxResults}`;

            if (startDate) {
                url += `&timeMin=${startDate.toISOString()}&orderBy=startTime&singleEvents=true`;
            }

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (!response.ok) throw new Error('Failed to fetch Google Calendar events');

            const data = await response.json();
            const events = (data.items || []).map(event => this.normalizeGoogleCalendarEvent(event));

            return events;
        } catch (error) {
            console.error('Google Calendar sync error:', error);
            throw error;
        }
    }

    async syncOutlookCalendarEvents(accessToken, startDate = null, maxResults = 50) {
        try {
            const endDate = new Date(Date.now() + 30 * 24 * 3600 * 1000);
            let url = `https://graph.microsoft.com/v1.0/me/calendarview?$top=${maxResults}&$orderby=start/dateTime desc`;

            if (startDate) {
                url += `&startDateTime=${startDate.toISOString()}&endDateTime=${endDate.toISOString()}`;
            }

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (!response.ok) throw new Error('Failed to fetch Outlook Calendar events');

            const data = await response.json();
            const events = (data.value || []).map(event => this.normalizeOutlookCalendarEvent(event));

            return events;
        } catch (error) {
            console.error('Outlook Calendar sync error:', error);
            throw error;
        }
    }

    async syncCalendlyEvents(accessToken, maxResults = 50) {
        try {
            const response = await fetch(`https://api.calendly.com/scheduled_events?limit=${maxResults}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (!response.ok) throw new Error('Failed to fetch Calendly events');

            const data = await response.json();
            const events = (data.collection || []).map(event => this.normalizeCalendlyEvent(event));

            return events;
        } catch (error) {
            console.error('Calendly sync error:', error);
            throw error;
        }
    }

    async syncZoomEvents(accessToken, maxResults = 50) {
        try {
            const response = await fetch(`https://zoom.us/v1/users/me/meetings?page_size=${maxResults}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (!response.ok) throw new Error('Failed to fetch Zoom meetings');

            const data = await response.json();
            const events = (data.meetings || []).map(meeting => this.normalizeZoomEvent(meeting));

            return events;
        } catch (error) {
            console.error('Zoom sync error:', error);
            throw error;
        }
    }

    normalizeGoogleCalendarEvent(event) {
        return {
            id: event.id,
            provider: 'google-calendar',
            title: event.summary || 'Untitled',
            description: event.description || '',
            start: event.start.dateTime || event.start.date,
            end: event.end.dateTime || event.end.date,
            isAllDay: !event.start.dateTime,
            location: event.location || '',
            attendees: (event.attendees || []).map(a => ({
                email: a.email,
                name: a.displayName || a.email,
                status: a.responseStatus
            })),
            recurring: !!event.recurringEventId,
            icalUID: event.iCalUID,
            htmlLink: event.htmlLink,
            timezone: event.start.timeZone || 'UTC'
        };
    }

    normalizeOutlookCalendarEvent(event) {
        return {
            id: event.id,
            provider: 'outlook-calendar',
            title: event.subject || 'Untitled',
            description: event.bodyPreview || '',
            start: event.start.dateTime,
            end: event.end.dateTime,
            isAllDay: event.isAllDay || false,
            location: event.locations?.[0]?.displayName || '',
            attendees: (event.attendees || []).map(a => ({
                email: a.emailAddress.address,
                name: a.emailAddress.name || a.emailAddress.address,
                status: a.status?.response
            })),
            recurring: event.recurrence !== null,
            changeKey: event.changeKey,
            webLink: event.webLink,
            timezone: event.start.timeZone || 'UTC'
        };
    }

    normalizeCalendlyEvent(event) {
        return {
            id: event.uri.split('/').pop(),
            provider: 'calendly',
            title: event.name || 'Calendly Event',
            description: event.name || '',
            start: event.start_time,
            end: event.end_time,
            isAllDay: false,
            location: '',
            attendees: [],
            recurring: false,
            status: event.status,
            timezone: 'UTC'
        };
    }

    normalizeZoomEvent(meeting) {
        return {
            id: meeting.id,
            provider: 'zoom',
            title: meeting.topic || 'Zoom Meeting',
            description: meeting.agenda || '',
            start: meeting.start_time,
            end: new Date(new Date(meeting.start_time).getTime() + meeting.duration * 60000).toISOString(),
            isAllDay: false,
            location: `https://zoom.us/j/${meeting.id}`,
            attendees: [],
            recurring: !!meeting.recurrence,
            joinUrl: meeting.join_url,
            timezone: meeting.timezone || 'UTC'
        };
    }

    async addToInternalCalendar(event) {
        const internalEvent = {
            ...event,
            internalId: 'internal_' + Date.now() + '_' + Math.random().toString(36).substring(7),
            syncedAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };

        this.internalCalendar.push(internalEvent);
        return internalEvent;
    }

    async detectConflicts(newEvent) {
        const conflicts = this.internalCalendar.filter(existing => {
            const newStart = new Date(newEvent.start).getTime();
            const newEnd = new Date(newEvent.end).getTime();
            const existingStart = new Date(existing.start).getTime();
            const existingEnd = new Date(existing.end).getTime();

            return (newStart < existingEnd && newEnd > existingStart) &&
                   existing.provider !== newEvent.provider;
        });

        return conflicts;
    }

    async resolveConflict(conflict, strategy = 'newer') {
        if (strategy === 'newer') {
            const time1 = new Date(conflict.event1.lastUpdated || conflict.event1.syncedAt).getTime();
            const time2 = new Date(conflict.event2.lastUpdated || conflict.event2.syncedAt).getTime();
            return time1 > time2 ? conflict.event1 : conflict.event2;
        } else if (strategy === 'priority') {
            const providerPriority = { 'google-calendar': 3, 'outlook-calendar': 2, 'calendly': 1 };
            return providerPriority[conflict.event1.provider] > providerPriority[conflict.event2.provider] ?
                   conflict.event1 : conflict.event2;
        } else if (strategy === 'manual') {
            return null;
        }
    }

    convertToICalFormat(event) {
        const formatDate = (date) => {
            const d = new Date(date);
            return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };

        const iCalEvent = [
            'BEGIN:VEVENT',
            `UID:${event.internalId}@bloocalendar.local`,
            `DTSTAMP:${formatDate(new Date())}`,
            `DTSTART:${formatDate(event.start)}`,
            `DTEND:${formatDate(event.end)}`,
            `SUMMARY:${event.title}`,
            `DESCRIPTION:${event.description}`,
            `LOCATION:${event.location}`,
            event.attendees.length > 0 ? event.attendees.map(a => `ATTENDEE;EMAIL=${a.email}:${a.name}`).join('\n') : '',
            `STATUS:${event.status || 'CONFIRMED'}`,
            'END:VEVENT'
        ].filter(line => line).join('\n');

        return iCalEvent;
    }

    generateCalendarICS(events) {
        const icsEvents = events.map(event => this.convertToICalFormat(event)).join('\n');

        return [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Bloo CRM//Calendar//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            `X-WR-CALNAME:Bloo Synchronized Calendar`,
            `X-WR-TIMEZONE:UTC`,
            `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
            icsEvents,
            'END:VCALENDAR'
        ].join('\n');
    }

    createSyncSession(connectionId) {
        const sessionId = 'cal_sync_' + Date.now();
        this.syncSessions.set(sessionId, {
            sessionId,
            connectionId,
            status: 'initializing',
            progress: 0,
            downloaded: 0,
            total: 0,
            startTime: Date.now(),
            errors: [],
            conflicts: []
        });
        return sessionId;
    }

    updateSyncProgress(sessionId, progress, downloaded, total) {
        const session = this.syncSessions.get(sessionId);
        if (session) {
            session.status = 'in-progress';
            session.progress = Math.min(progress, 100);
            session.downloaded = downloaded;
            session.total = total;
        }
    }

    completeSyncSession(sessionId) {
        const session = this.syncSessions.get(sessionId);
        if (session) {
            session.status = 'completed';
            session.endTime = Date.now();
        }
    }

    getSyncStatus(sessionId) {
        return this.syncSessions.get(sessionId);
    }

    getInternalCalendarEvents(filters = {}) {
        let events = this.internalCalendar;

        if (filters.provider) {
            events = events.filter(e => e.provider === filters.provider);
        }

        if (filters.startDate) {
            const start = new Date(filters.startDate).getTime();
            events = events.filter(e => new Date(e.start).getTime() >= start);
        }

        if (filters.endDate) {
            const end = new Date(filters.endDate).getTime();
            events = events.filter(e => new Date(e.end).getTime() <= end);
        }

        if (filters.title) {
            events = events.filter(e => e.title.toLowerCase().includes(filters.title.toLowerCase()));
        }

        return events;
    }

    getConflictingEvents(event) {
        return this.internalCalendar.filter(existing => {
            const eventStart = new Date(event.start).getTime();
            const eventEnd = new Date(event.end).getTime();
            const existingStart = new Date(existing.start).getTime();
            const existingEnd = new Date(existing.end).getTime();

            return eventStart < existingEnd && eventEnd > existingStart;
        });
    }

    convertTimezone(date, fromTz, toTz) {
        // Simplified timezone conversion - in production use moment-timezone or date-fns
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: toTz,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        return new Date(formatter.format(date));
    }

    async pushEventToProvider(event, connectionId, connection) {
        if (connection.provider === 'google-calendar') {
            return this.pushToGoogleCalendar(event, connection);
        } else if (connection.provider === 'outlook-calendar') {
            return this.pushToOutlookCalendar(event, connection);
        } else if (connection.provider === 'calendly') {
            return this.pushToCalendly(event, connection);
        }
    }

    async pushToGoogleCalendar(event, connection) {
        const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${connection.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                summary: event.title,
                description: event.description,
                start: { dateTime: event.start, timeZone: event.timezone },
                end: { dateTime: event.end, timeZone: event.timezone },
                location: event.location,
                attendees: event.attendees.map(a => ({ email: a.email, displayName: a.name }))
            })
        });

        return response.json();
    }

    async pushToOutlookCalendar(event, connection) {
        const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${connection.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                subject: event.title,
                body: { contentType: 'HTML', content: event.description },
                start: { dateTime: event.start, timeZone: event.timezone },
                end: { dateTime: event.end, timeZone: event.timezone },
                location: { displayName: event.location },
                attendees: event.attendees.map(a => ({
                    emailAddress: { address: a.email, name: a.name },
                    type: 'required'
                }))
            })
        });

        return response.json();
    }

    async pushToCalendly(event, connection) {
        // Calendly requires special handling for invitees
        const response = await fetch('https://api.calendly.com/scheduled_events', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${connection.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: event.title,
                description: event.description,
                start_time: event.start,
                end_time: event.end
            })
        });

        return response.json();
    }
}

// Export for use in backend routes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CalendarSyncService;
}
