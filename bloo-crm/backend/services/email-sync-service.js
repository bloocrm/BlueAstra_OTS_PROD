/* =====================================================
   EMAIL SYNC SERVICE
   ===================================================== */

class EmailSyncService {
    constructor() {
        this.syncSessions = new Map();
    }

    async syncGmailEmails(accessToken, query = '', startDate = null, maxResults = 50) {
        try {
            let queryString = query;

            if (startDate) {
                const timestamp = Math.floor(startDate.getTime() / 1000);
                queryString += `${queryString ? ' ' : ''}after:${timestamp}`;
            }

            const response = await fetch(
                `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(queryString)}&maxResults=${maxResults}`,
                { headers: { 'Authorization': `Bearer ${accessToken}` } }
            );

            if (!response.ok) throw new Error('Failed to fetch Gmail messages');

            const data = await response.json();
            const messageIds = (data.messages || []).map(m => m.id);

            // Fetch full message details
            const emails = [];
            for (const messageId of messageIds) {
                try {
                    const email = await this.getGmailMessageDetails(accessToken, messageId);
                    emails.push(email);
                } catch (error) {
                    console.error(`Error fetching message ${messageId}:`, error);
                }
            }

            return emails;
        } catch (error) {
            console.error('Gmail sync error:', error);
            throw error;
        }
    }

    async getGmailMessageDetails(accessToken, messageId) {
        const response = await fetch(
            `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
            { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );

        if (!response.ok) throw new Error('Failed to fetch message details');

        const data = await response.json();
        const headers = data.payload.headers;

        const getHeader = (name) => {
            const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
            return header ? header.value : '';
        };

        return {
            messageId: messageId,
            from: getHeader('From'),
            to: getHeader('To'),
            subject: getHeader('Subject'),
            date: new Date(parseInt(data.internalDate)),
            preview: data.snippet,
            body: this.extractGmailBody(data.payload),
            labels: data.labelIds || [],
            read: !data.labelIds?.includes('UNREAD')
        };
    }

    extractGmailBody(payload) {
        if (payload.parts) {
            for (const part of payload.parts) {
                if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
                    if (part.data) {
                        return Buffer.from(part.data, 'base64').toString('utf-8');
                    }
                }
            }
        }
        if (payload.body?.data) {
            return Buffer.from(payload.body.data, 'base64').toString('utf-8');
        }
        return '';
    }

    async syncOutlookEmails(accessToken, filterDate = null, maxResults = 50) {
        try {
            let url = `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=${maxResults}&$orderby=receivedDateTime desc`;

            if (filterDate) {
                const dateStr = filterDate.toISOString().split('T')[0];
                url += `&$filter=receivedDateTime ge ${dateStr}T00:00:00Z`;
            }

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (!response.ok) throw new Error('Failed to fetch Outlook messages');

            const data = await response.json();

            return (data.value || []).map(msg => ({
                messageId: msg.id,
                from: msg.from?.emailAddress?.address || '',
                to: msg.toRecipients?.map(r => r.emailAddress.address).join(', ') || '',
                subject: msg.subject,
                date: new Date(msg.receivedDateTime),
                preview: msg.bodyPreview,
                body: msg.body?.content || '',
                read: msg.isRead,
                categories: msg.categories || []
            }));
        } catch (error) {
            console.error('Outlook sync error:', error);
            throw error;
        }
    }

    async syncYahooEmails(accessToken, startDate = null, maxResults = 50) {
        try {
            // Yahoo Mail API endpoints for email sync
            // Note: Yahoo's email API has specific rate limits and requirements

            let url = `https://mail.yahooapis.com/v1/me/messages?count=${maxResults}`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (!response.ok) throw new Error('Failed to fetch Yahoo emails');

            const data = await response.json();

            return (data.messages || []).map(msg => ({
                messageId: msg.messageId,
                from: msg.from,
                to: msg.to || '',
                subject: msg.subject,
                date: new Date(msg.receivedDate * 1000),
                preview: msg.preview,
                body: msg.content || '',
                read: msg.isUnread === false
            }));
        } catch (error) {
            console.error('Yahoo sync error:', error);
            throw error;
        }
    }

    async syncProtonMailEmails(accessToken, startDate = null, maxResults = 50) {
        try {
            // ProtonMail API for email sync
            const response = await fetch(
                `https://mail.protonmail.com/api/v4/messages?limit=${maxResults}`,
                { headers: { 'Authorization': `Bearer ${accessToken}` } }
            );

            if (!response.ok) throw new Error('Failed to fetch ProtonMail emails');

            const data = await response.json();

            return (data.Messages || []).map(msg => ({
                messageId: msg.ID,
                from: msg.Sender?.Address || '',
                to: msg.ToList?.map(r => r.Address).join(', ') || '',
                subject: msg.Subject,
                date: new Date(msg.Time * 1000),
                preview: msg.Preview,
                body: msg.Body || '',
                read: !msg.Unread,
                labels: msg.LabelIDs || []
            }));
        } catch (error) {
            console.error('ProtonMail sync error:', error);
            throw error;
        }
    }

    async syncTutamailEmails(sessionToken, startDate = null, maxResults = 50) {
        try {
            // Tutamail API for email sync
            // Using session token for authentication

            const response = await fetch(
                'https://api.tutanota.com/rest/tutanota/mailfolderpage',
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${sessionToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) throw new Error('Failed to fetch Tutamail emails');

            const data = await response.json();

            // Parse Tutamail encrypted messages
            return (data.mails || []).slice(0, maxResults).map(msg => ({
                messageId: msg.id,
                from: msg.sender || '',
                to: msg.recipients?.join(', ') || '',
                subject: msg.subject,
                date: new Date(msg.date),
                preview: msg.preview || '',
                body: msg.body || '',
                read: !msg.unread,
                encrypted: true
            }));
        } catch (error) {
            console.error('Tutamail sync error:', error);
            throw error;
        }
    }

    async syncMailChimpEmails(apiKey, dataCenter, maxResults = 50) {
        try {
            // MailChimp API for campaign/email sync
            // Note: MailChimp is primarily for email marketing, not personal email

            const response = await fetch(
                `https://${dataCenter}.api.mailchimp.com/3.0/campaigns?count=${maxResults}`,
                {
                    headers: {
                        'Authorization': `Basic ${Buffer.from('anystring:' + apiKey).toString('base64')}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) throw new Error('Failed to fetch MailChimp campaigns');

            const data = await response.json();

            return (data.campaigns || []).map(campaign => ({
                messageId: campaign.id,
                from: campaign.from_name || '',
                to: campaign.recipients?.list_name || '',
                subject: campaign.settings.subject_line,
                date: new Date(campaign.send_time || campaign.create_time),
                preview: campaign.settings.preview_text || '',
                body: campaign.content?.html || '',
                read: true,
                type: 'campaign',
                stats: {
                    sent: campaign.emails_sent,
                    opened: campaign.report_summary?.opens || 0,
                    clicked: campaign.report_summary?.clicks || 0
                }
            }));
        } catch (error) {
            console.error('MailChimp sync error:', error);
            throw error;
        }
    }

    createSyncSession(connectionId) {
        const sessionId = 'sync_' + Date.now();
        this.syncSessions.set(sessionId, {
            sessionId,
            connectionId,
            status: 'initializing',
            progress: 0,
            downloaded: 0,
            total: 0,
            startTime: Date.now(),
            errors: []
        });
        return sessionId;
    }

    updateSyncProgress(sessionId, progress, downloaded, total) {
        const session = this.syncSessions.get(sessionId);
        if (session) {
            session.status = 'in-progress';
            session.progress = progress;
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
}

// Export for use in backend routes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmailSyncService;
}
