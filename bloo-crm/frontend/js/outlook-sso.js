/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   OUTLOOK SSO IMPLEMENTATION - OAUTH 2.0
   ===================================================== */

class OutlookSSO extends OAuthBase {
    constructor() {
        super('outlook', {
            // clientId is provided by the backend /auth/oauth-config/outlook endpoint
            // (from OUTLOOK_CLIENT_ID in the server .env); never reference process.env in the browser.
            scope: 'Mail.Read User.Read offline_access',
            apiUrl: 'https://graph.microsoft.com/v1.0',
            userInfoUrl: 'https://graph.microsoft.com/v1.0/me'
        });
        this.loadStoredTokens();
    }

    async startSSOLogin() {
        try {
            console.log('Starting Outlook OAuth flow...');
            await this.startOAuthFlow();
        } catch (error) {
            console.error('Outlook login error:', error);
            throw error;
        }
    }

    async getCurrentUser() {
        try {
            if (!this.accessToken) {
                throw new Error('No access token available');
            }

            const response = await this.makeApiCall(this.config.userInfoUrl);

            if (!response.ok) {
                throw new Error(`Failed to get user info: ${response.statusText}`);
            }

            const userData = await response.json();
            this.user = userData.displayName;
            this.userEmail = userData.userPrincipalName || userData.mail;
            this.isLoggedIn = true;

            console.log('✅ Outlook user authenticated:', this.userEmail);
            return userData;
        } catch (error) {
            console.error('Error getting Outlook user info:', error);
            throw error;
        }
    }

    async getSyncedEmails(maxPerFolder = 25) {
        if (!this.isUserLoggedIn()) {
            throw new Error('User not authenticated');
        }

        // Pull every mailbox section. Each Graph well-known folder maps to our
        // stored folder enum; each message is tagged with __folder so it lands in
        // the right place in MongoDB / the client.
        const folders = [
            ['Inbox', 'inbox'],
            ['SentItems', 'sent'],
            ['Drafts', 'drafts'],
            ['DeletedItems', 'trash'],
            ['Archive', 'archive'],
            ['JunkEmail', 'spam']
        ];
        // TEXT only (bodyPreview) + attachment METADATA — no contentBytes, so
        // nothing (including images) is downloaded automatically.
        const select = '$select=id,subject,from,toRecipients,receivedDateTime,sentDateTime,bodyPreview,isRead,hasAttachments';
        const expand = '$expand=attachments($select=id,name,contentType,size)';

        const all = [];
        for (const [graphName, folderKey] of folders) {
            try {
                // No $orderby: it isn't valid for every folder (e.g. Drafts have no
                // receivedDateTime); the store/read layer sorts by date anyway.
                const endpoint = `${this.config.apiUrl}/me/mailFolders/${graphName}/messages?$top=${maxPerFolder}&${select}&${expand}`;
                const response = await this.makeApiCall(endpoint);
                if (!response.ok) continue;   // folder may not exist (e.g. Archive) — skip it
                const data = await response.json();
                (data.value || []).forEach(m => { m.__folder = folderKey; all.push(m); });
            } catch (error) {
                console.warn(`Outlook folder ${graphName} sync skipped:`, error.message);
            }
        }
        return all;
    }

    async getEmailDetails(messageId) {
        try {
            if (!this.isUserLoggedIn()) {
                throw new Error('User not authenticated');
            }

            const endpoint = `${this.config.apiUrl}/me/messages/${messageId}`;
            const response = await this.makeApiCall(endpoint);

            if (!response.ok) {
                throw new Error(`Failed to fetch email: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching Outlook message:', error);
            throw error;
        }
    }

    openUserHub() {
        window.open('https://outlook.live.com/', '_blank');
    }
}

// Initialize if on callback page
if (window.location.pathname.includes('outlook-callback')) {
    document.addEventListener('DOMContentLoaded', async () => {
        const sso = new OutlookSSO();
        try {
            await sso.handleCallback();
            try { await sso.getCurrentUser(); } catch (e) { /* email best-effort */ }
            try { await sso.persistToServer(); } catch (e) { /* server persist best-effort */ }
            // Opened in a new tab from the email client — tell it we're done and close.
            if (window.opener && !window.opener.closed) {
                try { window.opener.postMessage({ type: 'email-oauth-complete', provider: 'outlook', success: true }, window.location.origin); } catch (e) {}
                window.close();
                return;
            }
            // Fallback (opened directly / same tab): return to the email client.
            window.location.href = '/email-client.html';
        } catch (error) {
            console.error('Outlook callback error:', error);
            const el = document.getElementById('error');
            if (el) {
                el.textContent = 'Authentication failed: ' + error.message;
                el.style.display = 'block';
            } else {
                alert('Authentication failed: ' + error.message);
            }
        }
    });
}

if (typeof window !== 'undefined') {
    window.OutlookSSO = OutlookSSO;
}
