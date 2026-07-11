/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   GMAIL SSO IMPLEMENTATION - OAUTH 2.0
   ===================================================== */

class GmailSSO extends OAuthBase {
    constructor() {
        super('gmail', {
            clientId: process.env.GMAIL_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
            apiUrl: 'https://www.googleapis.com/gmail/v1',
            userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo'
        });
        this.loadStoredTokens();
    }

    async startSSOLogin() {
        try {
            console.log('Starting Gmail OAuth flow...');
            await this.startOAuthFlow();
        } catch (error) {
            console.error('Gmail login error:', error);
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
            this.user = userData.name;
            this.userEmail = userData.email;
            this.isLoggedIn = true;

            console.log('✅ Gmail user authenticated:', this.userEmail);
            return userData;
        } catch (error) {
            console.error('Error getting Gmail user info:', error);
            throw error;
        }
    }

    async getSyncedEmails(maxResults = 10) {
        try {
            if (!this.isUserLoggedIn()) {
                throw new Error('User not authenticated');
            }

            const endpoint = `${this.config.apiUrl}/users/me/messages?maxResults=${maxResults}`;
            const response = await this.makeApiCall(endpoint);

            if (!response.ok) {
                throw new Error(`Failed to fetch emails: ${response.statusText}`);
            }

            const data = await response.json();
            return data.messages || [];
        } catch (error) {
            console.error('Error fetching Gmail emails:', error);
            throw error;
        }
    }

    async getEmailDetails(messageId) {
        try {
            if (!this.isUserLoggedIn()) {
                throw new Error('User not authenticated');
            }

            const endpoint = `${this.config.apiUrl}/users/me/messages/${messageId}`;
            const response = await this.makeApiCall(endpoint);

            if (!response.ok) {
                throw new Error(`Failed to fetch email: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching Gmail message:', error);
            throw error;
        }
    }

    openUserHub() {
        window.open('https://mail.google.com/', '_blank');
    }
}

// Initialize if on callback page
if (window.location.pathname.includes('gmail-callback')) {
    document.addEventListener('DOMContentLoaded', async () => {
        const sso = new GmailSSO();
        try {
            await sso.handleCallback();
            try { await sso.getCurrentUser(); } catch (e) { /* email best-effort */ }
            try { await sso.persistToServer(); } catch (e) { /* server persist best-effort */ }
            // Notify the email client (opener tab) then close this tab.
            if (window.opener && !window.opener.closed) {
                try { window.opener.postMessage({ type: 'email-oauth-complete', provider: 'gmail', success: true }, window.location.origin); } catch (e) {}
            }
            window.close();
        } catch (error) {
            console.error('Gmail callback error:', error);
            alert('Authentication failed: ' + error.message);
        }
    });
}

if (typeof window !== 'undefined') {
    window.GmailSSO = GmailSSO;
}
