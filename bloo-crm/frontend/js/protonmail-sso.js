/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   PROTONMAIL SSO IMPLEMENTATION
   ===================================================== */

class ProtonMailSSO {
    constructor() {
        this.clientId = localStorage.getItem('protonmailClientId') || 'YOUR_PROTONMAIL_CLIENT_ID';
        this.clientSecret = localStorage.getItem('protonmailClientSecret') || 'YOUR_PROTONMAIL_CLIENT_SECRET';
        this.redirectUri = `${window.location.origin}/protonmail-callback.html`;
        this.accessToken = sessionStorage.getItem('protonmailAccessToken');
        this.refreshToken = sessionStorage.getItem('protonmailRefreshToken');
        this.tokenExpiresAt = parseInt(sessionStorage.getItem('protonmailTokenExpiresAt')) || 0;
        this.appPassword = sessionStorage.getItem('protonmailAppPassword');
        this.isLoggedIn = (this.accessToken || this.appPassword) && !this.isTokenExpired();
        this.user = null;
        this.userEmail = null;
        this.userHubUrl = 'https://mail.protonmail.com/';
        this.apiUrl = 'https://api.protonmail.ch';
        this.state = this.generateState();
    }

    generateState() {
        return 'protonmail_' + Math.random().toString(36).substring(7);
    }

    async checkExistingSession() {
        try {
            if ((this.accessToken || this.appPassword) && !this.isTokenExpired()) {
                this.isLoggedIn = true;
                await this.getCurrentUser();
                this.emit('session-active', this.user);
                return true;
            }
            const params = new URLSearchParams(window.location.search);
            const code = params.get('code');
            if (code) {
                await this.exchangeCodeForToken(code);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error checking ProtonMail session:', error);
            return false;
        }
    }

    isTokenExpired() {
        return Date.now() >= this.tokenExpiresAt;
    }

    startSSOLogin() {
        // ProtonMail OAuth
        sessionStorage.setItem('protonmailState', this.state);

        const authUrl = `https://mail.protonmail.com/api/auth/authorize?` +
            `client_id=${this.clientId}&` +
            `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
            `response_type=code&` +
            `state=${this.state}`;

        window.location.href = authUrl;
    }

    startAppPasswordLogin() {
        // Show app password modal
        this.showAppPasswordDialog();
    }

    showAppPasswordDialog() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'protonmailAppPasswordModal';
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
            max-width: 450px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        `;

        content.innerHTML = `
            <h2 style="margin-top: 0; color: #333; text-align: center;">ProtonMail App Password</h2>
            <p style="color: #666; text-align: center; margin: 20px 0;">
                Generate an app password in your ProtonMail account settings and enter it below.
            </p>
            <div style="margin: 20px 0;">
                <label style="display: block; margin-bottom: 10px; color: #333; font-weight: 600;">Email Address</label>
                <input type="email" id="protonmailEmail" placeholder="your@protonmail.com" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box;">
            </div>
            <div style="margin: 20px 0;">
                <label style="display: block; margin-bottom: 10px; color: #333; font-weight: 600;">App Password</label>
                <input type="password" id="protonmailPassword" placeholder="•••••••••••" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box;">
            </div>
            <div style="display: flex; gap: 10px; justify-content: center; margin-top: 30px;">
                <button onclick="document.getElementById('protonmailAppPasswordModal').remove()" style="
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
                <button onclick="window.protonMailSSO && window.protonMailSSO.authenticateWithAppPassword()" style="
                    background: #6D4AFF;
                    color: white;
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

    async authenticateWithAppPassword() {
        const email = document.getElementById('protonmailEmail')?.value;
        const password = document.getElementById('protonmailPassword')?.value;

        if (!email || !password) {
            alert('Please enter both email and app password');
            return;
        }

        try {
            this.appPassword = password;
            this.userEmail = email;
            sessionStorage.setItem('protonmailAppPassword', password);
            sessionStorage.setItem('protonmailEmail', email);

            const modal = document.getElementById('protonmailAppPasswordModal');
            if (modal) modal.remove();

            await this.getCurrentUser();
            this.emit('login-success', this.user);
        } catch (error) {
            console.error('App password authentication error:', error);
            alert('Authentication failed: ' + error.message);
        }
    }

    async exchangeCodeForToken(code) {
        try {
            const response = await fetch(`${this.apiUrl}/auth/authorize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    code: code,
                    redirect_uri: this.redirectUri,
                    grant_type: 'authorization_code'
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Token exchange failed');

            this.accessToken = data.access_token;
            this.refreshToken = data.refresh_token || this.refreshToken;
            this.tokenExpiresAt = Date.now() + ((data.expires_in || 3599) * 1000);

            sessionStorage.setItem('protonmailAccessToken', this.accessToken);
            if (this.refreshToken) sessionStorage.setItem('protonmailRefreshToken', this.refreshToken);
            sessionStorage.setItem('protonmailTokenExpiresAt', this.tokenExpiresAt.toString());

            await this.getCurrentUser();
            this.emit('login-success', this.user);
            return this.user;
        } catch (error) {
            console.error('ProtonMail token exchange error:', error);
            // Fallback to app password if OAuth fails
            this.startAppPasswordLogin();
            throw error;
        }
    }

    async getCurrentUser() {
        try {
            let userData;

            if (this.accessToken) {
                const response = await fetch(`${this.apiUrl}/auth/currentuser`, {
                    headers: { 'Authorization': `Bearer ${this.accessToken}` }
                });

                if (!response.ok) throw new Error('Failed to get user info');
                userData = await response.json();
            } else if (this.userEmail && this.appPassword) {
                // App password mode - basic user setup
                userData = {
                    User: {
                        ID: btoa(this.userEmail),
                        Name: this.userEmail.split('@')[0],
                        Email: this.userEmail
                    }
                };
            } else {
                throw new Error('No credentials available');
            }

            this.user = {
                id: userData.User?.ID || userData.id,
                displayName: userData.User?.Name || this.userEmail.split('@')[0],
                email: userData.User?.Email || this.userEmail,
                avatar: null
            };
            this.userEmail = this.user.email;
            this.isLoggedIn = true;

            sessionStorage.setItem('protonmailUser', JSON.stringify(this.user));
            return this.user;
        } catch (error) {
            console.error('Error getting ProtonMail user info:', error);
            throw error;
        }
    }

    openUserHub() {
        window.open(this.userHubUrl, '_blank');
    }

    logout() {
        this.accessToken = null;
        this.refreshToken = null;
        this.appPassword = null;
        this.tokenExpiresAt = 0;
        this.isLoggedIn = false;
        this.user = null;
        this.userEmail = null;

        sessionStorage.removeItem('protonmailAccessToken');
        sessionStorage.removeItem('protonmailRefreshToken');
        sessionStorage.removeItem('protonmailTokenExpiresAt');
        sessionStorage.removeItem('protonmailAppPassword');
        sessionStorage.removeItem('protonmailEmail');
        sessionStorage.removeItem('protonmailUser');

        console.log('Logged out from ProtonMail');
        this.emit('logout', null);
    }

    isUserLoggedIn() {
        return this.isLoggedIn && (this.accessToken || this.appPassword) && !this.isTokenExpired();
    }

    on(event, callback) {
        if (!window.protonmailEvents) window.protonmailEvents = {};
        if (!window.protonmailEvents[event]) window.protonmailEvents[event] = [];
        window.protonmailEvents[event].push(callback);
    }

    emit(event, data) {
        if (window.protonmailEvents && window.protonmailEvents[event]) {
            window.protonmailEvents[event].forEach(callback => callback(data));
        }
    }
}

if (typeof window !== 'undefined') {
    window.ProtonMailSSO = ProtonMailSSO;
    window.protonMailSSO = null; // Will be set by email-platform-manager
}
