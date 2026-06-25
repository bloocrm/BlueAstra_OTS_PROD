/* =====================================================
   TUTAMAIL SSO IMPLEMENTATION
   ===================================================== */

class TutamailSSO {
    constructor() {
        this.email = sessionStorage.getItem('tutamailEmail') || '';
        this.password = sessionStorage.getItem('tutamailPassword') || '';
        this.sessionToken = sessionStorage.getItem('tutamailSessionToken') || '';
        this.tokenExpiresAt = parseInt(sessionStorage.getItem('tutamailTokenExpiresAt')) || 0;
        this.isLoggedIn = this.sessionToken && !this.isTokenExpired();
        this.user = null;
        this.userEmail = null;
        this.userHubUrl = 'https://tutanota.com/';
        this.apiUrl = 'https://api.tutanota.com';
    }

    isTokenExpired() {
        return Date.now() >= this.tokenExpiresAt;
    }

    startSSOLogin() {
        this.showTutamailLoginDialog();
    }

    showTutamailLoginDialog() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'tutamailLoginModal';
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
            <h2 style="margin-top: 0; color: #333; text-align: center;">Tutamail Login</h2>
            <p style="color: #666; text-align: center; margin: 20px 0;">
                Enter your Tutamail credentials to sync your encrypted emails.
            </p>
            <div style="margin: 20px 0;">
                <label style="display: block; margin-bottom: 10px; color: #333; font-weight: 600;">Email Address</label>
                <input type="email" id="tutamailEmail" placeholder="your@tutanota.com" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box;">
            </div>
            <div style="margin: 20px 0;">
                <label style="display: block; margin-bottom: 10px; color: #333; font-weight: 600;">Password</label>
                <input type="password" id="tutamailPassword" placeholder="••••••••••" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box;">
            </div>
            <div style="display: flex; gap: 10px; justify-content: center; margin-top: 30px;">
                <button onclick="document.getElementById('tutamailLoginModal').remove()" style="
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
                <button onclick="window.tutamailSSO && window.tutamailSSO.authenticateWithCredentials()" style="
                    background: #FF6B35;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-weight: 600;
                ">
                    Sign In
                </button>
            </div>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);
    }

    async authenticateWithCredentials() {
        const email = document.getElementById('tutamailEmail')?.value;
        const password = document.getElementById('tutamailPassword')?.value;

        if (!email || !password) {
            alert('Please enter both email and password');
            return;
        }

        try {
            this.email = email;
            this.password = password;

            // Store credentials (in production, these should be encrypted)
            sessionStorage.setItem('tutamailEmail', email);
            sessionStorage.setItem('tutamailPassword', password);

            // Set session token (in production, derive from API)
            this.sessionToken = btoa(email + ':' + password);
            this.tokenExpiresAt = Date.now() + (24 * 3600 * 1000);
            sessionStorage.setItem('tutamailSessionToken', this.sessionToken);
            sessionStorage.setItem('tutamailTokenExpiresAt', this.tokenExpiresAt.toString());

            const modal = document.getElementById('tutamailLoginModal');
            if (modal) modal.remove();

            await this.getCurrentUser();
            this.emit('login-success', this.user);
        } catch (error) {
            console.error('Tutamail authentication error:', error);
            alert('Authentication failed: ' + error.message);
        }
    }

    async getCurrentUser() {
        try {
            if (!this.sessionToken) throw new Error('No session token');

            // For Tutamail, we set up basic user info
            this.user = {
                id: btoa(this.email),
                displayName: this.email.split('@')[0],
                email: this.email,
                avatar: null
            };
            this.userEmail = this.email;
            this.isLoggedIn = true;

            sessionStorage.setItem('tutamailUser', JSON.stringify(this.user));
            return this.user;
        } catch (error) {
            console.error('Error getting Tutamail user info:', error);
            throw error;
        }
    }

    openUserHub() {
        window.open(this.userHubUrl, '_blank');
    }

    logout() {
        this.email = null;
        this.password = null;
        this.sessionToken = null;
        this.tokenExpiresAt = 0;
        this.isLoggedIn = false;
        this.user = null;
        this.userEmail = null;

        sessionStorage.removeItem('tutamailEmail');
        sessionStorage.removeItem('tutamailPassword');
        sessionStorage.removeItem('tutamailSessionToken');
        sessionStorage.removeItem('tutamailTokenExpiresAt');
        sessionStorage.removeItem('tutamailUser');

        console.log('Logged out from Tutamail');
        this.emit('logout', null);
    }

    isUserLoggedIn() {
        return this.isLoggedIn && this.sessionToken && !this.isTokenExpired();
    }

    on(event, callback) {
        if (!window.tutamailEvents) window.tutamailEvents = {};
        if (!window.tutamailEvents[event]) window.tutamailEvents[event] = [];
        window.tutamailEvents[event].push(callback);
    }

    emit(event, data) {
        if (window.tutamailEvents && window.tutamailEvents[event]) {
            window.tutamailEvents[event].forEach(callback => callback(data));
        }
    }
}

if (typeof window !== 'undefined') {
    window.TutamailSSO = TutamailSSO;
    window.tutamailSSO = null;
}
