/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   MAILCHIMP SSO IMPLEMENTATION
   ===================================================== */

class MailChimpSSO {
    constructor() {
        this.apiKey = sessionStorage.getItem('mailchimpApiKey') || '';
        this.dataCenter = sessionStorage.getItem('mailchimpDataCenter') || '';
        this.isLoggedIn = this.apiKey && this.dataCenter;
        this.user = null;
        this.userEmail = null;
        this.userHubUrl = 'https://mailchimp.com/';
        this.apiUrl = `https://${this.dataCenter}.api.mailchimp.com/3.0`;
    }

    startSSOLogin() {
        this.showMailChimpSetupDialog();
    }

    showMailChimpSetupDialog() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'mailchimpSetupModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 15px;
            max-width: 500px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        `;

        content.innerHTML = `
            <h2 style="margin-top: 0; color: #333; text-align: center;">MailChimp API Setup</h2>
            <p style="color: #666; margin: 20px 0;">
                1. Go to <strong>Account Settings → Extras → API keys</strong><br>
                2. Copy your API key<br>
                3. The data center is shown after the last dash in your API key (e.g., "us19")
            </p>
            <div style="margin: 20px 0;">
                <label style="display: block; margin-bottom: 10px; color: #333; font-weight: 600;">MailChimp API Key</label>
                <input type="password" id="mailchimpApiKey" placeholder="e.g., abc123def456ghi789jkl-us19" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box; font-family: monospace;">
            </div>
            <div style="margin: 20px 0;">
                <label style="display: block; margin-bottom: 10px; color: #333; font-weight: 600;">Data Center (from API key suffix)</label>
                <input type="text" id="mailchimpDataCenter" placeholder="e.g., us19" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box;">
            </div>
            <div style="background: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #FFE01B;">
                <p style="margin: 0; font-size: 12px; color: #666;">
                    <strong>Example API key:</strong> <code style="background: #eee; padding: 2px 5px;">a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p-us19</code><br>
                    <strong>Data center:</strong> <code style="background: #eee; padding: 2px 5px;">us19</code>
                </p>
            </div>
            <div style="display: flex; gap: 10px; justify-content: center; margin-top: 30px;">
                <button onclick="document.getElementById('mailchimpSetupModal').remove()" style="
                    background: #e5e7eb;
                    color: #333;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-weight: 600;
                ">
                    Cancel
                </button>
                <button onclick="window.mailChimpSSO && window.mailChimpSSO.authenticateWithApiKey()" style="
                    background: #FFE01B;
                    color: #333;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-weight: 600;
                ">
                    Connect
                </button>
            </div>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);
    }

    async authenticateWithApiKey() {
        const apiKey = document.getElementById('mailchimpApiKey')?.value;
        const dataCenter = document.getElementById('mailchimpDataCenter')?.value;

        if (!apiKey || !dataCenter) {
            alert('Please enter both API key and data center');
            return;
        }

        try {
            this.apiKey = apiKey;
            this.dataCenter = dataCenter;
            this.apiUrl = `https://${dataCenter}.api.mailchimp.com/3.0`;

            sessionStorage.setItem('mailchimpApiKey', apiKey);
            sessionStorage.setItem('mailchimpDataCenter', dataCenter);

            const modal = document.getElementById('mailchimpSetupModal');
            if (modal) modal.remove();

            await this.getCurrentUser();
            this.emit('login-success', this.user);
        } catch (error) {
            console.error('MailChimp authentication error:', error);
            alert('Authentication failed: ' + error.message);
        }
    }

    async getCurrentUser() {
        try {
            if (!this.apiKey || !this.dataCenter) throw new Error('API key not configured');

            // Test API key validity
            const response = await fetch(`${this.apiUrl}/`, {
                headers: {
                    'Authorization': 'Basic ' + btoa('anystring:' + this.apiKey),
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Invalid API key');

            const data = await response.json();

            this.user = {
                id: data.account_id || 'mailchimp-' + this.apiKey.substring(0, 8),
                displayName: data.account_name || 'MailChimp Account',
                email: data.contact?.email || 'api@mailchimp.com',
                avatar: null
            };
            this.userEmail = this.user.email;
            this.isLoggedIn = true;

            sessionStorage.setItem('mailchimpUser', JSON.stringify(this.user));
            return this.user;
        } catch (error) {
            console.error('Error getting MailChimp user info:', error);
            throw error;
        }
    }

    async getLists() {
        try {
            if (!this.apiKey) throw new Error('Not authenticated');

            const response = await fetch(`${this.apiUrl}/lists`, {
                headers: {
                    'Authorization': 'Basic ' + btoa('anystring:' + this.apiKey),
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to fetch lists');
            return await response.json();
        } catch (error) {
            console.error('Error fetching MailChimp lists:', error);
            throw error;
        }
    }

    async getCampaigns() {
        try {
            if (!this.apiKey) throw new Error('Not authenticated');

            const response = await fetch(`${this.apiUrl}/campaigns`, {
                headers: {
                    'Authorization': 'Basic ' + btoa('anystring:' + this.apiKey),
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to fetch campaigns');
            return await response.json();
        } catch (error) {
            console.error('Error fetching MailChimp campaigns:', error);
            throw error;
        }
    }

    openUserHub() {
        window.open(this.userHubUrl, '_blank');
    }

    logout() {
        this.apiKey = null;
        this.dataCenter = null;
        this.isLoggedIn = false;
        this.user = null;
        this.userEmail = null;

        sessionStorage.removeItem('mailchimpApiKey');
        sessionStorage.removeItem('mailchimpDataCenter');
        sessionStorage.removeItem('mailchimpUser');

        console.log('Logged out from MailChimp');
        this.emit('logout', null);
    }

    isUserLoggedIn() {
        return this.isLoggedIn && this.apiKey && this.dataCenter;
    }

    on(event, callback) {
        if (!window.mailchimpEvents) window.mailchimpEvents = {};
        if (!window.mailchimpEvents[event]) window.mailchimpEvents[event] = [];
        window.mailchimpEvents[event].push(callback);
    }

    emit(event, data) {
        if (window.mailchimpEvents && window.mailchimpEvents[event]) {
            window.mailchimpEvents[event].forEach(callback => callback(data));
        }
    }
}

if (typeof window !== 'undefined') {
    window.MailChimpSSO = MailChimpSSO;
    window.mailChimpSSO = null;
}
