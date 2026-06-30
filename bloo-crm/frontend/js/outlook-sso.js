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

    async getSyncedEmails(maxResults = 10) {
        try {
            if (!this.isUserLoggedIn()) {
                throw new Error('User not authenticated');
            }

            const endpoint = `${this.config.apiUrl}/me/mailFolders/Inbox/messages?$top=${maxResults}`;
            const response = await this.makeApiCall(endpoint);

            if (!response.ok) {
                throw new Error(`Failed to fetch emails: ${response.statusText}`);
            }

            const data = await response.json();
            return data.value || [];
        } catch (error) {
            console.error('Error fetching Outlook emails:', error);
            throw error;
        }
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
            // Full-page OAuth redirect (not a popup) — return to the email client
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
