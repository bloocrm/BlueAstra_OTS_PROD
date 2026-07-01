/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   CALENDAR SYNC BACKEND ROUTES
   ===================================================== */

const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

// Calendar Connection Storage (In production, use database)
let calendarConnections = new Map();
let syncSessions = new Map();

// OAuth Token Exchange Routes

router.post('/calendar/oauth/callback/:provider', async (req, res) => {
    try {
        const { provider } = req.params;
        const { code, state } = req.body;
        const userId = req.user?.id || 'default-user';

        console.log(`Processing OAuth callback for calendar provider: ${provider}`);

        // Validate state parameter (CSRF protection)
        const savedState = req.session?.oauthState || {};
        if (state !== savedState[provider]) {
            return res.status(400).json({ error: 'Invalid state parameter - CSRF validation failed' });
        }

        let tokenData;

        if (provider === 'calendly') {
            tokenData = await exchangeCalendlyCode(code, req);
        } else if (provider === 'google-calendar') {
            tokenData = await exchangeGoogleCalendarCode(code, req);
        } else if (provider === 'outlook-calendar') {
            tokenData = await exchangeOutlookCalendarCode(code, req);
        } else if (provider === 'apple-calendar') {
            tokenData = await exchangeAppleCalendarCode(code, req);
        } else if (provider === 'zoom') {
            tokenData = await exchangeZoomCode(code, req);
        } else if (provider === 'monday') {
            tokenData = await exchangeMondayCode(code, req);
        } else if (provider === 'asana') {
            tokenData = await exchangeAsanaCode(code, req);
        } else if (provider === 'trello') {
            tokenData = await exchangeTrelloCode(code, req);
        } else if (provider === 'microsoft-teams') {
            tokenData = await exchangeMicrosoftTeamsCode(code, req);
        } else if (provider === 'slack') {
            tokenData = await exchangeSlackCode(code, req);
        } else if (provider === 'notion') {
            tokenData = await exchangeNotionCode(code, req);
        } else {
            return res.status(400).json({ error: 'Unknown calendar provider' });
        }

        // Store connection
        const connectionId = 'cal_conn_' + Date.now() + '_' + Math.random().toString(36).substring(7);
        calendarConnections.set(connectionId, {
            id: connectionId,
            userId,
            provider,
            email: tokenData.email || tokenData.name,
            accessToken: tokenData.accessToken,
            refreshToken: tokenData.refreshToken,
            tokenExpiresAt: tokenData.expiresAt,
            connectedAt: new Date().toISOString(),
            user: tokenData.user
        });

        res.json({
            status: 'success',
            connectionId,
            provider,
            email: tokenData.email,
            user: tokenData.user,
            message: `Successfully connected to ${provider}`
        });
    } catch (error) {
        console.error('Calendar OAuth callback error:', error);
        res.status(500).json({ error: 'Token exchange failed', message: error.message });
    }
});

// Token Refresh Route
router.post('/calendar/oauth/refresh/:connectionId', async (req, res) => {
    try {
        const { connectionId } = req.params;
        const connection = calendarConnections.get(connectionId);

        if (!connection) {
            return res.status(404).json({ error: 'Connection not found' });
        }

        // Check if token needs refresh
        if (connection.tokenExpiresAt > Date.now()) {
            return res.json({
                status: 'valid',
                accessToken: connection.accessToken,
                expiresIn: Math.floor((connection.tokenExpiresAt - Date.now()) / 1000)
            });
        }

        // Refresh token based on provider
        let newTokenData;

        if (connection.provider === 'google-calendar') {
            newTokenData = await refreshGoogleCalendarToken(connection);
        } else if (connection.provider === 'outlook-calendar') {
            newTokenData = await refreshOutlookCalendarToken(connection);
        } else if (connection.provider === 'calendly') {
            newTokenData = await refreshCalendlyToken(connection);
        } else {
            return res.status(400).json({ error: 'Provider does not support token refresh' });
        }

        // Update connection
        connection.accessToken = newTokenData.accessToken;
        connection.tokenExpiresAt = newTokenData.expiresAt;
        if (newTokenData.refreshToken) {
            connection.refreshToken = newTokenData.refreshToken;
        }

        res.json({
            status: 'refreshed',
            accessToken: newTokenData.accessToken,
            expiresIn: Math.floor((newTokenData.expiresAt - Date.now()) / 1000)
        });
    } catch (error) {
        console.error('Calendar token refresh error:', error);
        res.status(500).json({ error: 'Token refresh failed', message: error.message });
    }
});

// Calendar Sync Routes

router.post('/calendar/sync/start/:connectionId', async (req, res) => {
    try {
        const { connectionId } = req.params;
        const { daysBack = 30, maxResults = 100, includeAttendees = true, includeRecurring = true } = req.body;

        const connection = calendarConnections.get(connectionId);
        if (!connection) {
            return res.status(404).json({ error: 'Connection not found' });
        }

        const syncId = 'cal_sync_' + Date.now();
        const syncDate = new Date(Date.now() - daysBack * 24 * 3600 * 1000);

        console.log(`Starting calendar sync for ${connection.provider} - ${connectionId}`);

        // Store sync session
        syncSessions.set(syncId, {
            syncId,
            connectionId,
            provider: connection.provider,
            status: 'started',
            progress: 0,
            downloaded: 0,
            total: 0,
            startTime: Date.now(),
            errors: []
        });

        // Start async sync process
        startCalendarSync(syncId, connection, syncDate, maxResults, includeAttendees, includeRecurring).catch(error => {
            console.error('Calendar sync error:', error);
            const session = syncSessions.get(syncId);
            if (session) {
                session.status = 'failed';
                session.errors.push(error.message);
            }
        });

        res.json({
            syncId,
            status: 'started',
            provider: connection.provider,
            email: connection.email,
            syncDate: syncDate.toISOString(),
            message: `Calendar sync started for ${connection.email}`
        });
    } catch (error) {
        console.error('Calendar sync start error:', error);
        res.status(500).json({ error: 'Failed to start sync', message: error.message });
    }
});

router.get('/calendar/sync/status/:syncId', (req, res) => {
    const { syncId } = req.params;
    const session = syncSessions.get(syncId);

    if (!session) {
        return res.status(404).json({ error: 'Sync session not found' });
    }

    const estimatedTime = session.total > 0 ?
        Math.ceil((100 - session.progress) * (Date.now() - session.startTime) / session.progress / 1000) :
        'calculating...';

    res.json({
        syncId,
        status: session.status,
        progress: session.progress,
        downloaded: session.downloaded,
        total: session.total,
        estimatedTime: estimatedTime + ' seconds',
        errors: session.errors
    });
});

// Connection Management Routes

router.get('/calendar/connections', (req, res) => {
    const userId = req.user?.id || 'default-user';
    const userConnections = Array.from(calendarConnections.values()).filter(c => c.userId === userId);

    res.json({
        status: 'success',
        connections: userConnections.map(c => ({
            id: c.id,
            provider: c.provider,
            email: c.email,
            name: c.user?.name,
            status: c.tokenExpiresAt > Date.now() ? 'connected' : 'token-expired',
            connectedAt: c.connectedAt,
            lastSync: c.lastSync || null
        }))
    });
});

router.post('/calendar/disconnect/:connectionId', (req, res) => {
    const { connectionId } = req.params;

    if (calendarConnections.has(connectionId)) {
        calendarConnections.delete(connectionId);
        res.json({ status: 'success', message: 'Calendar connection removed' });
    } else {
        res.status(404).json({ error: 'Connection not found' });
    }
});

// Calendar Events Routes

router.get('/calendar/events/:connectionId', async (req, res) => {
    try {
        const { connectionId } = req.params;
        const { from, to, maxResults = 50 } = req.query;

        const connection = calendarConnections.get(connectionId);
        if (!connection) {
            return res.status(404).json({ error: 'Connection not found' });
        }

        let events = [];

        if (connection.provider === 'google-calendar') {
            events = await getGoogleCalendarEvents(connection, from, to, maxResults);
        } else if (connection.provider === 'outlook-calendar') {
            events = await getOutlookCalendarEvents(connection, from, to, maxResults);
        } else if (connection.provider === 'calendly') {
            events = await getCalendlyEvents(connection, maxResults);
        }

        res.json({
            status: 'success',
            provider: connection.provider,
            events,
            count: events.length
        });
    } catch (error) {
        console.error('Failed to get calendar events:', error);
        res.status(500).json({ error: 'Failed to retrieve events', message: error.message });
    }
});

router.post('/calendar/events/:connectionId', async (req, res) => {
    try {
        const { connectionId } = req.params;
        const eventData = req.body;

        const connection = calendarConnections.get(connectionId);
        if (!connection) {
            return res.status(404).json({ error: 'Connection not found' });
        }

        let result;

        if (connection.provider === 'google-calendar') {
            result = await createGoogleCalendarEvent(connection, eventData);
        } else if (connection.provider === 'outlook-calendar') {
            result = await createOutlookCalendarEvent(connection, eventData);
        } else {
            return res.status(400).json({ error: 'Provider does not support event creation' });
        }

        res.json({
            status: 'success',
            provider: connection.provider,
            event: result,
            message: 'Calendar event created successfully'
        });
    } catch (error) {
        console.error('Failed to create calendar event:', error);
        res.status(500).json({ error: 'Failed to create event', message: error.message });
    }
});

router.put('/calendar/events/:connectionId/:eventId', async (req, res) => {
    try {
        const { connectionId, eventId } = req.params;
        const eventData = req.body;

        const connection = calendarConnections.get(connectionId);
        if (!connection) {
            return res.status(404).json({ error: 'Connection not found' });
        }

        let result;

        if (connection.provider === 'google-calendar') {
            result = await updateGoogleCalendarEvent(connection, eventId, eventData);
        } else if (connection.provider === 'outlook-calendar') {
            result = await updateOutlookCalendarEvent(connection, eventId, eventData);
        } else {
            return res.status(400).json({ error: 'Provider does not support event updates' });
        }

        res.json({
            status: 'success',
            provider: connection.provider,
            event: result,
            message: 'Calendar event updated successfully'
        });
    } catch (error) {
        console.error('Failed to update calendar event:', error);
        res.status(500).json({ error: 'Failed to update event', message: error.message });
    }
});

router.delete('/calendar/events/:connectionId/:eventId', async (req, res) => {
    try {
        const { connectionId, eventId } = req.params;

        const connection = calendarConnections.get(connectionId);
        if (!connection) {
            return res.status(404).json({ error: 'Connection not found' });
        }

        if (connection.provider === 'google-calendar') {
            await deleteGoogleCalendarEvent(connection, eventId);
        } else if (connection.provider === 'outlook-calendar') {
            await deleteOutlookCalendarEvent(connection, eventId);
        } else {
            return res.status(400).json({ error: 'Provider does not support event deletion' });
        }

        res.json({
            status: 'success',
            provider: connection.provider,
            message: 'Calendar event deleted successfully'
        });
    } catch (error) {
        console.error('Failed to delete calendar event:', error);
        res.status(500).json({ error: 'Failed to delete event', message: error.message });
    }
});

// OAuth Code Exchange Functions

async function exchangeCalendlyCode(code, req) {
    const clientId = process.env.CALENDLY_CLIENT_ID;
    const clientSecret = process.env.CALENDLY_CLIENT_SECRET;
    const redirectUri = `${process.env.APP_URL}/calendly-callback.html`;

    const response = await fetch('https://auth.calendly.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
        })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error_description || 'Calendly token exchange failed');

    // Get user info
    const userResponse = await fetch('https://api.calendly.com/users/me', {
        headers: { 'Authorization': `Bearer ${data.access_token}` }
    });
    const userData = await userResponse.json();

    return {
        email: userData.resource?.email,
        name: userData.resource?.name,
        user: userData.resource,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + (data.expires_in * 1000)
    };
}

async function exchangeGoogleCalendarCode(code, req) {
    const clientId = process.env.GMAIL_CLIENT_ID; // Reuse Gmail credentials
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;
    const redirectUri = `${process.env.APP_URL}/google-calendar-callback.html`;

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
        })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error_description || 'Google Calendar token exchange failed');

    // Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { 'Authorization': `Bearer ${data.access_token}` }
    });
    const userData = await userResponse.json();

    return {
        email: userData.email,
        name: userData.name,
        user: userData,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + (data.expires_in * 1000)
    };
}

async function exchangeOutlookCalendarCode(code, req) {
    const clientId = process.env.OUTLOOK_CLIENT_ID; // Reuse Outlook credentials
    const clientSecret = process.env.OUTLOOK_CLIENT_SECRET;
    const redirectUri = `${process.env.APP_URL}/outlook-calendar-callback.html`;
    const tenantId = process.env.OUTLOOK_TENANT_ID || 'common';

    const response = await fetch(
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                code,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
                scope: 'Calendars.Read Calendars.ReadWrite User.Read offline_access'
            })
        }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.error_description || 'Outlook Calendar token exchange failed');

    // Get user info
    const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { 'Authorization': `Bearer ${data.access_token}` }
    });
    const userData = await userResponse.json();

    return {
        email: userData.mail || userData.userPrincipalName,
        name: userData.displayName,
        user: userData,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + (data.expires_in * 1000)
    };
}

async function exchangeAppleCalendarCode(code, req) {
    const clientId = process.env.APPLE_CALENDAR_CLIENT_ID;
    const teamId = process.env.APPLE_CALENDAR_TEAM_ID;
    const keyId = process.env.APPLE_CALENDAR_KEY_ID;

    // Apple ID token decoding (simplified)
    const response = await fetch('https://appleid.apple.com/auth/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: `${teamId}.${keyId}`, // Simplified - should use JWT
            code,
            grant_type: 'authorization_code'
        })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Apple Calendar token exchange failed');

    return {
        email: data.email,
        name: 'Apple Calendar User',
        user: { email: data.email },
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + (data.expires_in * 1000)
    };
}

async function exchangeZoomCode(code, req) {
    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;
    const redirectUri = `${process.env.APP_URL}/zoom-callback.html`;

    const response = await fetch('https://zoom.us/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
        })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error_description || 'Zoom token exchange failed');

    // Get user info
    const userResponse = await fetch('https://zoom.us/v1/users/me', {
        headers: { 'Authorization': `Bearer ${data.access_token}` }
    });
    const userData = await userResponse.json();

    return {
        email: userData.email,
        name: userData.first_name + ' ' + userData.last_name,
        user: userData,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + (data.expires_in * 1000)
    };
}

// Simplified implementations for other providers
async function exchangeMondayCode(code, req) {
    return { email: 'user@monday.com', name: 'Monday User', accessToken: code, expiresAt: Date.now() + 3600000 };
}

async function exchangeAsanaCode(code, req) {
    return { email: 'user@asana.com', name: 'Asana User', accessToken: code, expiresAt: Date.now() + 3600000 };
}

async function exchangeTrelloCode(code, req) {
    return { email: 'user@trello.com', name: 'Trello User', accessToken: code, expiresAt: Date.now() + 3600000 };
}

async function exchangeMicrosoftTeamsCode(code, req) {
    return { email: 'user@teams.com', name: 'Teams User', accessToken: code, expiresAt: Date.now() + 3600000 };
}

async function exchangeSlackCode(code, req) {
    return { email: 'user@slack.com', name: 'Slack User', accessToken: code, expiresAt: Date.now() + 3600000 };
}

async function exchangeNotionCode(code, req) {
    return { email: 'user@notion.com', name: 'Notion User', accessToken: code, expiresAt: Date.now() + 3600000 };
}

// Token Refresh Functions

async function refreshCalendlyToken(connection) {
    const clientId = process.env.CALENDLY_CLIENT_ID;
    const clientSecret = process.env.CALENDLY_CLIENT_SECRET;

    const response = await fetch('https://auth.calendly.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: connection.refreshToken,
            grant_type: 'refresh_token'
        })
    });

    const data = await response.json();
    if (!response.ok) throw new Error('Calendly token refresh failed');

    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || connection.refreshToken,
        expiresAt: Date.now() + (data.expires_in * 1000)
    };
}

async function refreshGoogleCalendarToken(connection) {
    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: connection.refreshToken,
            grant_type: 'refresh_token'
        })
    });

    const data = await response.json();
    if (!response.ok) throw new Error('Google Calendar token refresh failed');

    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || connection.refreshToken,
        expiresAt: Date.now() + (data.expires_in * 1000)
    };
}

async function refreshOutlookCalendarToken(connection) {
    const clientId = process.env.OUTLOOK_CLIENT_ID;
    const clientSecret = process.env.OUTLOOK_CLIENT_SECRET;
    const tenantId = process.env.OUTLOOK_TENANT_ID || 'common';

    const response = await fetch(
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: connection.refreshToken,
                grant_type: 'refresh_token',
                scope: 'Calendars.Read Calendars.ReadWrite User.Read offline_access'
            })
        }
    );

    const data = await response.json();
    if (!response.ok) throw new Error('Outlook Calendar token refresh failed');

    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || connection.refreshToken,
        expiresAt: Date.now() + (data.expires_in * 1000)
    };
}

// Calendar Event Functions

async function getGoogleCalendarEvents(connection, from, to, maxResults) {
    const query = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    query.searchParams.append('maxResults', maxResults);
    if (from) query.searchParams.append('timeMin', from);
    if (to) query.searchParams.append('timeMax', to);

    const response = await fetch(query.toString(), {
        headers: { 'Authorization': `Bearer ${connection.accessToken}` }
    });

    const data = await response.json();
    return (data.items || []).map(event => ({
        id: event.id,
        title: event.summary,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        description: event.description,
        attendees: event.attendees?.map(a => a.email) || [],
        location: event.location,
        recurring: !!event.recurringEventId
    }));
}

async function getOutlookCalendarEvents(connection, from, to, maxResults) {
    let url = `https://graph.microsoft.com/v1.0/me/calendarview?$top=${maxResults}&$orderby=start/dateTime`;
    if (from) url += `&startDateTime=${from}`;
    if (to) url += `&endDateTime=${to}`;

    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${connection.accessToken}` }
    });

    const data = await response.json();
    return (data.value || []).map(event => ({
        id: event.id,
        title: event.subject,
        start: event.start.dateTime,
        end: event.end.dateTime,
        description: event.bodyPreview,
        attendees: event.attendees?.map(a => a.emailAddress.address) || [],
        location: event.locations?.[0]?.displayName,
        recurring: event.recurrence !== null
    }));
}

async function getCalendlyEvents(connection, maxResults) {
    // Calendly API returns scheduled events
    const response = await fetch('https://api.calendly.com/scheduled_events?limit=' + maxResults, {
        headers: { 'Authorization': `Bearer ${connection.accessToken}` }
    });

    const data = await response.json();
    return (data.collection || []).map(event => ({
        id: event.uri.split('/').pop(),
        title: event.name,
        start: event.start_time,
        end: event.end_time,
        attendees: [event.invitees_counter?.active?.toString()],
        recurring: false
    }));
}

async function createGoogleCalendarEvent(connection, eventData) {
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${connection.accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            summary: eventData.title,
            description: eventData.description,
            start: { dateTime: eventData.start },
            end: { dateTime: eventData.end },
            attendees: (eventData.attendees || []).map(email => ({ email })),
            location: eventData.location
        })
    });

    return response.json();
}

async function createOutlookCalendarEvent(connection, eventData) {
    const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${connection.accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            subject: eventData.title,
            bodyPreview: eventData.description,
            start: { dateTime: eventData.start, timeZone: 'UTC' },
            end: { dateTime: eventData.end, timeZone: 'UTC' },
            attendees: (eventData.attendees || []).map(email => ({
                emailAddress: { address: email },
                type: 'required'
            })),
            locations: eventData.location ? [{ displayName: eventData.location }] : []
        })
    });

    return response.json();
}

async function updateGoogleCalendarEvent(connection, eventId, eventData) {
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${connection.accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            summary: eventData.title || eventData.summary,
            description: eventData.description,
            start: { dateTime: eventData.start },
            end: { dateTime: eventData.end }
        })
    });

    return response.json();
}

async function updateOutlookCalendarEvent(connection, eventId, eventData) {
    const response = await fetch(`https://graph.microsoft.com/v1.0/me/events/${eventId}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${connection.accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            subject: eventData.title || eventData.subject,
            bodyPreview: eventData.description,
            start: { dateTime: eventData.start, timeZone: 'UTC' },
            end: { dateTime: eventData.end, timeZone: 'UTC' }
        })
    });

    return response.json();
}

async function deleteGoogleCalendarEvent(connection, eventId) {
    await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${connection.accessToken}` }
    });
}

async function deleteOutlookCalendarEvent(connection, eventId) {
    await fetch(`https://graph.microsoft.com/v1.0/me/events/${eventId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${connection.accessToken}` }
    });
}

// Calendar Sync Function
async function startCalendarSync(syncId, connection, startDate, maxResults, includeAttendees, includeRecurring) {
    try {
        console.log(`Syncing calendar for ${connection.email} starting from ${startDate}`);

        const session = syncSessions.get(syncId);
        if (!session) return;

        let events = [];

        if (connection.provider === 'google-calendar') {
            events = await syncGoogleCalendarEvents(connection, startDate, maxResults);
        } else if (connection.provider === 'outlook-calendar') {
            events = await syncOutlookCalendarEvents(connection, startDate, maxResults);
        } else if (connection.provider === 'calendly') {
            events = await syncCalendlyEvents(connection, maxResults);
        }

        session.total = events.length;
        session.downloaded = events.length;
        session.progress = 100;
        session.status = 'completed';
        session.endTime = Date.now();

        connection.lastSync = new Date().toISOString();
        console.log(`Synced ${events.length} calendar events for ${connection.email}`);
    } catch (error) {
        console.error(`Calendar sync error for ${connection.email}:`, error);
        const session = syncSessions.get(syncId);
        if (session) {
            session.status = 'failed';
            session.errors.push(error.message);
        }
        throw error;
    }
}

async function syncGoogleCalendarEvents(connection, startDate, maxResults) {
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.append('timeMin', startDate.toISOString());
    url.searchParams.append('maxResults', maxResults);
    url.searchParams.append('orderBy', 'startTime');
    url.searchParams.append('singleEvents', 'true');

    const response = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${connection.accessToken}` }
    });

    const data = await response.json();
    return data.items || [];
}

async function syncOutlookCalendarEvents(connection, startDate, maxResults) {
    const url = `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${startDate.toISOString()}&endDateTime=${new Date(Date.now() + 30*24*3600*1000).toISOString()}&$top=${maxResults}`;

    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${connection.accessToken}` }
    });

    const data = await response.json();
    return data.value || [];
}

async function syncCalendlyEvents(connection, maxResults) {
    const response = await fetch(`https://api.calendly.com/scheduled_events?limit=${maxResults}`, {
        headers: { 'Authorization': `Bearer ${connection.accessToken}` }
    });

    const data = await response.json();
    return data.collection || [];
}

module.exports = router;
