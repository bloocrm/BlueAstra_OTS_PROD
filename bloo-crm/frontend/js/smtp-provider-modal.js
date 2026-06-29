/* =====================================================
   SMTP PROVIDER SETUP MODAL COMPONENT
   ===================================================== */

class SMTPProviderModal {
    constructor(userId, accountId) {
        this.userId = userId;
        this.accountId = accountId;
        this.apiBase = 'http://localhost:5000/api';
        this.currentProvider = null;
        this.currentTab = 'smtp';
        this.providerId = null;
        this.onSuccess = null;
        this.init();
    }

    init() {
        this.createModalHTML();
        this.attachEventListeners();
    }

    createModalHTML() {
        const html = `
            <div class="smtp-modal-overlay" id="smtpModalOverlay">
                <div class="smtp-modal-container">
                    <!-- Header -->
                    <div class="smtp-modal-header">
                        <h2>
                            <span class="smtp-modal-header-icon">📧</span>
                            Connect Email Provider
                        </h2>
                        <button class="smtp-modal-close" id="smtpModalClose">&times;</button>
                    </div>

                    <!-- Tabs -->
                    <div class="smtp-tabs-container">
                        <button class="smtp-tab-button active" data-tab="smtp">
                            <span class="smtp-tab-icon">⚙️</span>
                            SMTP Providers
                        </button>
                        <button class="smtp-tab-button" data-tab="sso">
                            <span class="smtp-tab-icon">🔐</span>
                            Single Sign-On
                        </button>
                    </div>

                    <!-- Body -->
                    <div class="smtp-modal-body">
                        <!-- SMTP Tab -->
                        <div class="smtp-tab-content active" id="smtpTab">
                            <div class="smtp-section-header">
                                <span class="smtp-section-icon">🔧</span>
                                Select SMTP Provider
                            </div>

                            <div class="smtp-provider-grid" id="providerGrid">
                                <!-- Dynamically populated -->
                            </div>

                            <!-- Provider-specific forms -->
                            <div id="providerForms"></div>
                        </div>

                        <!-- SSO Tab -->
                        <div class="smtp-tab-content" id="ssoTab">
                            <div class="smtp-section-header">
                                <span class="smtp-section-icon">🔑</span>
                                Single Sign-On Authentication
                            </div>

                            <div class="smtp-info-box">
                                <strong>ℹ️ Note:</strong> You can authenticate using your email provider's native login system.
                            </div>

                            <div class="smtp-field-group">
                                <div class="smtp-field-group-title">Authentication Method</div>

                                <div class="smtp-form-group">
                                    <label>
                                        <input type="radio" name="ssoMethod" value="credentials" checked>
                                        Username & Password
                                    </label>
                                </div>

                                <div id="credentialsForm" class="smtp-form-group">
                                    <label>Username / Email <span class="required">*</span></label>
                                    <input type="email" id="ssoUsername" placeholder="your@email.com">

                                    <label style="margin-top: 12px;">Password <span class="required">*</span></label>
                                    <input type="password" id="ssoPassword" placeholder="Enter your password">

                                    <p class="smtp-help-text">
                                        ✓ Your credentials are encrypted and stored securely
                                    </p>
                                </div>

                                <div class="smtp-form-group">
                                    <label>
                                        <input type="radio" name="ssoMethod" value="oauth2">
                                        OAuth 2.0
                                    </label>
                                </div>

                                <div id="oauth2Form" style="display: none;" class="smtp-form-group">
                                    <label>Client ID <span class="required">*</span></label>
                                    <input type="text" id="clientId" placeholder="Your OAuth Client ID">

                                    <label style="margin-top: 12px;">Client Secret <span class="required">*</span></label>
                                    <input type="password" id="clientSecret" placeholder="Your OAuth Client Secret">

                                    <label style="margin-top: 12px;">Redirect URI</label>
                                    <input type="text" id="redirectUri" placeholder="https://yourdomain.com/callback" value="http://localhost:3000/email-client.html">

                                    <p class="smtp-help-text">
                                        Configure these values in your email provider's OAuth application settings.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="smtp-modal-footer">
                        <button class="smtp-btn smtp-btn-secondary" id="smtpBtnCancel">Cancel</button>
                        <button class="smtp-btn smtp-btn-test" id="smtpBtnTest" style="display: none;">🧪 Test Connection</button>
                        <button class="smtp-btn smtp-btn-primary" id="smtpBtnSave">Save & Continue</button>
                    </div>
                </div>
            </div>
        `;

        // Insert into DOM
        if (!document.getElementById('smtpModalOverlay')) {
            document.body.insertAdjacentHTML('beforeend', html);
        }

        // Link CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'css/smtp-provider-modal.css';
        if (!document.querySelector('link[href="css/smtp-provider-modal.css"]')) {
            document.head.appendChild(link);
        }
    }

    attachEventListeners() {
        // Tab switching
        document.querySelectorAll('.smtp-tab-button').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.closest('.smtp-tab-button').dataset.tab));
        });

        // Close modal
        document.getElementById('smtpModalClose')?.addEventListener('click', () => this.close());
        document.getElementById('smtpBtnCancel')?.addEventListener('click', () => this.close());

        // Provider selection
        document.addEventListener('click', (e) => {
            if (e.target.closest('.smtp-provider-card')) {
                this.selectProvider(e.target.closest('.smtp-provider-card').dataset.provider);
            }
        });

        // SSO method toggle
        document.querySelectorAll('input[name="ssoMethod"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                document.getElementById('credentialsForm').style.display =
                    e.target.value === 'credentials' ? 'block' : 'none';
                document.getElementById('oauth2Form').style.display =
                    e.target.value === 'oauth2' ? 'block' : 'none';
            });
        });

        // Save button
        document.getElementById('smtpBtnSave')?.addEventListener('click', () => this.save());
        document.getElementById('smtpBtnTest')?.addEventListener('click', () => this.testConnection());
    }

    switchTab(tab) {
        this.currentTab = tab;

        // Update tabs
        document.querySelectorAll('.smtp-tab-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        document.querySelectorAll('.smtp-tab-content').forEach(content => {
            content.classList.toggle('active', content.id === tab + 'Tab');
        });

        // Update footer buttons
        if (tab === 'smtp') {
            document.getElementById('smtpBtnTest').style.display = this.currentProvider ? 'inline-flex' : 'none';
        } else {
            document.getElementById('smtpBtnTest').style.display = 'none';
        }
    }

    selectProvider(provider) {
        this.currentProvider = provider;

        // Update UI
        document.querySelectorAll('.smtp-provider-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.provider === provider);
        });

        // Render provider form
        this.renderProviderForm(provider);
    }

    renderProviderForm(provider) {
        const container = document.getElementById('providerForms');
        let html = '';

        const providers = {
            'amazon-ses': {
                name: 'Amazon SES',
                icon: '📦',
                fields: [
                    { name: 'accessKey', label: 'Access Key', type: 'password', required: true, hint: 'AWS Access Key ID' },
                    { name: 'secretKey', label: 'Secret Access Key', type: 'password', required: true, hint: 'AWS Secret Access Key' },
                    { name: 'sesRegion', label: 'SES Region', type: 'select', required: true, options: [
                        { value: 'us-east-1', label: 'us-east-1 (N. Virginia)' },
                        { value: 'us-west-2', label: 'us-west-2 (Oregon)' },
                        { value: 'eu-west-1', label: 'eu-west-1 (Ireland)' },
                        { value: 'ap-southeast-1', label: 'ap-southeast-1 (Singapore)' }
                    ]},
                    { name: 'fromEmail', label: 'From Email Address', type: 'email', required: false, hint: 'Must be verified in SES' }
                ]
            },
            'postmark': {
                name: 'Postmark',
                icon: '📮',
                fields: [
                    { name: 'accountToken', label: 'Account Token', type: 'password', required: true, hint: 'Your Postmark Account Token' },
                    { name: 'serverToken', label: 'Server Token', type: 'password', required: true, hint: 'Your Postmark Server Token' },
                    { name: 'serverId', label: 'Server ID', type: 'text', required: false, hint: 'Optional: Server ID for tracking' }
                ]
            },
            'mailgun': {
                name: 'Mailgun',
                icon: '💌',
                fields: [
                    { name: 'apiKey', label: 'API Key', type: 'password', required: true, hint: 'Your Mailgun API Key' },
                    { name: 'domain', label: 'Domain Name', type: 'text', required: true, hint: 'e.g., mail.example.com' },
                    { name: 'region', label: 'Region', type: 'select', required: false, options: [
                        { value: 'us', label: 'United States' },
                        { value: 'eu', label: 'European Union' }
                    ]}
                ]
            },
            'smtp2go': {
                name: 'SMTP2Go',
                icon: '🚀',
                fields: [
                    { name: 'apiKey', label: 'API Key', type: 'password', required: true, hint: 'Your SMTP2Go API Key' }
                ]
            }
        };

        if (providers[provider]) {
            const config = providers[provider];
            html = `
                <div class="smtp-field-group" style="margin-top: 20px;">
                    <div class="smtp-field-group-title">
                        <span>${config.icon}</span>
                        ${config.name} Configuration
                    </div>
                    <div class="smtp-form-row">
                        ${config.fields.map(field => `
                            <div class="smtp-form-group ${field.type === 'email' ? 'smtp-form-row-full' : ''}">
                                <label>
                                    ${field.label}
                                    ${field.required ? '<span class="required">*</span>' : ''}
                                    ${field.hint ? `<br><span class="hint">${field.hint}</span>` : ''}
                                </label>
                                ${field.type === 'select' ? `
                                    <select id="${field.name}">
                                        <option value="">Select ${field.label}</option>
                                        ${field.options.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('')}
                                    </select>
                                ` : `
                                    <input type="${field.type}" id="${field.name}" placeholder="Enter ${field.label.toLowerCase()}">
                                `}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
    }

    async save() {
        try {
            // Create provider if new
            if (!this.providerId) {
                const providerRes = await fetch(`${this.apiBase}/email/smtp-provider/setup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: this.userId,
                        accountId: this.accountId,
                        providerType: this.currentProvider,
                        displayName: `${this.currentProvider} - ${new Date().toLocaleDateString()}`,
                        email: 'smtp@provider.com'
                    })
                });
                const providerData = await providerRes.json();
                this.providerId = providerData.provider.id;
            }

            if (this.currentTab === 'smtp') {
                await this.saveSMTPCredentials();
            } else {
                await this.saveSSO();
            }

            this.showSuccess('Provider configured successfully!');

            // Trigger callback if provided
            if (this.onSuccess) {
                this.onSuccess({
                    providerId: this.providerId,
                    providerType: this.currentProvider,
                    accountId: this.accountId
                });
            }

            setTimeout(() => this.close(), 1500);
        } catch (error) {
            console.error('Save error:', error);
            alert('Failed to save provider: ' + error.message);
        }
    }

    async saveSMTPCredentials() {
        const endpoint = `${this.apiBase}/email/smtp-provider/${this.providerId}/${this.currentProvider}`;

        let data = {};
        document.querySelectorAll('.smtp-form-group input, .smtp-form-group select').forEach(field => {
            if (field.value) {
                data[field.id] = field.value;
            }
        });

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('Failed to save SMTP credentials');
        }
    }

    async saveSSO() {
        const method = document.querySelector('input[name="ssoMethod"]:checked').value;
        const data = { provider: this.currentProvider };

        if (method === 'credentials') {
            data.username = document.getElementById('ssoUsername').value;
            data.password = document.getElementById('ssoPassword').value;

            if (!data.username || !data.password) {
                throw new Error('Username and password are required');
            }
        } else {
            data.clientId = document.getElementById('clientId').value;
            data.clientSecret = document.getElementById('clientSecret').value;
            data.redirectUri = document.getElementById('redirectUri').value;

            if (!data.clientId || !data.clientSecret) {
                throw new Error('Client ID and Secret are required');
            }
        }

        const response = await fetch(`${this.apiBase}/email/smtp-provider/${this.providerId}/sso`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('Failed to save SSO configuration');
        }
    }

    async testConnection() {
        const testEmail = prompt('Enter test email address:', 'test@example.com');
        if (!testEmail) return;

        try {
            document.getElementById('smtpBtnTest').disabled = true;
            document.getElementById('smtpBtnTest').innerHTML = '<span class="smtp-spinner"></span> Testing...';

            const response = await fetch(`${this.apiBase}/email/smtp-provider/${this.providerId}/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ testEmail })
            });

            const result = await response.json();

            if (response.ok) {
                this.showSuccess('✓ Test email sent successfully!');
            } else {
                alert('Test failed: ' + result.error);
            }
        } catch (error) {
            alert('Test connection error: ' + error.message);
        } finally {
            document.getElementById('smtpBtnTest').disabled = false;
            document.getElementById('smtpBtnTest').innerHTML = '🧪 Test Connection';
        }
    }

    showSuccess(message) {
        const toast = document.createElement('div');
        toast.className = 'toast success';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    open() {
        document.getElementById('smtpModalOverlay').classList.add('active');
        this.renderProviders();
    }

    close() {
        document.getElementById('smtpModalOverlay').classList.remove('active');
    }

    renderProviders() {
        const grid = document.getElementById('providerGrid');
        const providers = [
            { id: 'amazon-ses', name: 'Amazon\nSES', icon: '📦', badge: 'AWS' },
            { id: 'postmark', name: 'Postmark', icon: '📮', badge: 'SMTP' },
            { id: 'mailgun', name: 'Mailgun', icon: '💌', badge: 'API' },
            { id: 'smtp2go', name: 'SMTP2Go', icon: '🚀', badge: 'Cloud' }
        ];

        grid.innerHTML = providers.map(p => `
            <div class="smtp-provider-card" data-provider="${p.id}">
                <div class="smtp-provider-logo">${p.icon}</div>
                <div class="smtp-provider-name">${p.name}</div>
                <div class="smtp-provider-badge">${p.badge}</div>
            </div>
        `).join('');
    }
}

// Export for use in email client
window.SMTPProviderModal = SMTPProviderModal;
