/* =====================================================
   EMAIL CLIENT JAVASCRIPT
   ===================================================== */

class EmailClient {
    constructor() {
        this.currentFolder = 'inbox';
        this.currentEmail = null;
        this.emails = new Map();
        this.connections = [];
        this.currentAccount = null;
        this.draftedEmails = new Map();
        this.selectedEmails = new Set();
        this.autoRefreshInterval = 5;
        this.settings = {
            autoRefreshInterval: 5,
            autoDownloadAttachments: false,
            previewPane: false,
            defaultReplyAction: 'reply',
            autoSignature: false,
            signature: ''
        };

        this.initializeEventListeners();
        this.loadConnections();
        this.loadSettings();
    }

    initializeEventListeners() {
        // Compose and modals
        document.getElementById('btnCompose').addEventListener('click', () => this.openComposeModal());
        document.getElementById('btnCloseCompose').addEventListener('click', () => this.closeComposeModal());
        document.getElementById('btnSendEmail').addEventListener('click', () => this.sendEmail());
        document.getElementById('btnSaveDraft').addEventListener('click', () => this.saveDraft());

        // Folder navigation
        document.querySelectorAll('.folder-item').forEach(item => {
            item.addEventListener('click', (e) => this.switchFolder(e.target.closest('.folder-item').dataset.folder));
        });

        // Email list
        document.addEventListener('click', (e) => {
            if (e.target.closest('.email-item')) {
                const emailElement = e.target.closest('.email-item');
                const emailId = emailElement.dataset.emailId;
                this.openEmail(emailId);
            }
        });

        // Detail view actions
        document.getElementById('btnBack').addEventListener('click', () => this.backToList());
        document.getElementById('btnReply').addEventListener('click', () => this.openReplyModal('reply'));
        document.getElementById('btnReplyAll').addEventListener('click', () => this.openReplyModal('replyAll'));
        document.getElementById('btnForward').addEventListener('click', () => this.openReplyModal('forward'));
        document.getElementById('btnDelete').addEventListener('click', () => this.deleteEmail(this.currentEmail?.id));
        document.getElementById('btnStar').addEventListener('click', () => this.toggleStar(this.currentEmail?.id));

        // Search
        document.getElementById('searchInput').addEventListener('input', (e) => this.searchEmails(e.target.value));

        // Sync
        document.getElementById('btnSync').addEventListener('click', () => this.syncEmails());
        document.getElementById('btnRefresh').addEventListener('click', () => this.refreshEmails());

        // Add account
        document.getElementById('btnAddAccount').addEventListener('click', () => this.openAddAccountModal());
        document.getElementById('btnCloseAccount').addEventListener('click', () => this.closeAddAccountModal());

        // Settings
        document.getElementById('btnSettings').addEventListener('click', () => this.openSettingsModal());
        document.getElementById('btnCloseSettings').addEventListener('click', () => this.closeSettingsModal());

        // Account selector
        document.getElementById('accountSelect').addEventListener('change', (e) => this.switchAccount(e.target.value));

        // File upload
        document.getElementById('uploadZone').addEventListener('click', () => document.getElementById('fileInput').click());
        document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileUpload(e));
        document.getElementById('uploadZone').addEventListener('dragover', (e) => e.preventDefault());
        document.getElementById('uploadZone').addEventListener('drop', (e) => {
            e.preventDefault();
            this.handleFileUpload(e);
        });

        // Reply form
        document.getElementById('btnSendReply').addEventListener('click', () => this.sendReply());
        document.getElementById('btnSaveReplyDraft').addEventListener('click', () => this.saveDraftReply());
        document.getElementById('btnCloseReply').addEventListener('click', () => this.closeReplyModal());

        // Settings tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Text formatting
        document.getElementById('btnBold').addEventListener('click', () => this.formatText('bold'));
        document.getElementById('btnItalic').addEventListener('click', () => this.formatText('italic'));
        document.getElementById('btnUnderline').addEventListener('click', () => this.formatText('underline'));
        document.getElementById('btnLink').addEventListener('click', () => this.insertLink());
        document.getElementById('btnAttach').addEventListener('click', () => document.getElementById('fileInput').click());

        // Select all checkbox
        document.getElementById('selectAll').addEventListener('change', (e) => this.selectAllEmails(e.target.checked));

        // Reply input - add recipients as tags
        ['toInput', 'ccInput', 'bccInput'].forEach(id => {
            const input = document.getElementById(id);
            input.addEventListener('blur', () => this.parseRecipients(id));
        });

        // Sync configuration
        if (document.getElementById('btnSyncConfig')) {
            document.getElementById('btnSyncConfig').addEventListener('click', () => this.openSyncConfigModal());
        }
        if (document.getElementById('btnCloseSyncConfig')) {
            document.getElementById('btnCloseSyncConfig').addEventListener('click', () => this.closeSyncConfigModal());
        }
        if (document.getElementById('btnCancelSyncConfig')) {
            document.getElementById('btnCancelSyncConfig').addEventListener('click', () => this.closeSyncConfigModal());
        }
        if (document.getElementById('btnSaveSyncConfig')) {
            document.getElementById('btnSaveSyncConfig').addEventListener('click', () => this.saveSyncConfig());
        }
    }

    async loadConnections() {
        this.connections = [];
        const mgr = window.emailManager;
        if (!mgr || !mgr.ssoInstances) {
            // Manager not ready yet — retry shortly
            setTimeout(() => this.loadConnections(), 400);
            return;
        }

        // A provider is "connected" if it has a valid OAuth token (single source of truth)
        for (const provider of ['outlook', 'gmail']) {
            const sso = mgr.ssoInstances[provider];
            if (!sso) continue;
            try { await sso.checkExistingSession(); } catch (e) { /* not connected */ }
            if (sso.isUserLoggedIn && sso.isUserLoggedIn()) {
                this.connections.push({
                    id: provider,
                    provider: provider,
                    email: sso.userEmail || provider,
                    sso: sso
                });
            }
        }

        this.populateAccountDropdown();

        if (this.connections.length > 0) {
            const sel = document.getElementById('accountSelect');
            if (sel) sel.value = this.connections[0].id;
            this.switchAccount(this.connections[0].id);
        } else {
            const emailList = document.getElementById('emailList');
            if (emailList) {
                emailList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔌</div><div class="empty-state-text">No email account connected. Click the + button to connect Outlook or Gmail.</div></div>';
            }
        }
    }

    populateAccountDropdown() {
        const select = document.getElementById('accountSelect');
        if (select) {
            // Always offer Outlook + Gmail; show connection status
            const providers = [
                { id: 'outlook', name: 'Microsoft Outlook' },
                { id: 'gmail', name: 'Gmail' }
            ];
            select.innerHTML = '';
            providers.forEach(p => {
                const conn = this.connections.find(c => c.id === p.id);
                const option = document.createElement('option');
                option.value = p.id;
                option.textContent = conn ? `${conn.email} — ${p.name}` : `${p.name} (not connected)`;
                select.appendChild(option);
            });
        }

        // "From" dropdown in compose: connected accounts only
        const fromSelect = document.getElementById('fromSelect');
        if (fromSelect) {
            fromSelect.innerHTML = '';
            this.connections.forEach(conn => {
                const option = document.createElement('option');
                option.value = conn.id;
                option.textContent = conn.email;
                fromSelect.appendChild(option);
            });
        }
    }

    switchAccount(providerId) {
        const conn = this.connections.find(c => c.id === providerId);
        if (conn) {
            this.currentAccount = conn;
            // Download from the provider into MongoDB, then display from MongoDB
            this.syncEmails();
        } else {
            // Selected provider isn't connected yet — start the OAuth connect
            this.currentAccount = null;
            const name = providerId === 'gmail' ? 'Gmail' : 'Microsoft Outlook';
            const emailList = document.getElementById('emailList');
            if (emailList) {
                emailList.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔌</div><div class="empty-state-text">${name} isn't connected — redirecting to sign in…</div></div>`;
            }
            if (typeof this.connectProvider === 'function') this.connectProvider(providerId);
        }
    }

    switchFolder(folder) {
        this.currentFolder = folder;
        document.querySelectorAll('.folder-item').forEach(item => {
            item.classList.toggle('active', item.dataset.folder === folder);
        });
        this.backToList();
        this.loadEmails();
    }

    // Authenticated call to our backend (JWT from the CRM login in localStorage)
    async apiCall(path, options = {}) {
        const base = window.API_BASE_URL || '/api';
        const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
        const token = localStorage.getItem('authToken');
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const resp = await fetch(base + path, {
            method: options.method || 'GET',
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(data.message || data.error || `Request failed (${resp.status})`);
        return data;
    }

    // Map a stored MongoDB email doc to the UI shape (text only; attachments are metadata)
    mapStoredEmail(d) {
        return {
            id: d._id,
            externalId: d.externalId,
            provider: d.provider,
            from: (d.from && (d.from.email || d.from.name)) || 'Unknown',
            to: (d.to && d.to[0] && d.to[0].email) || '',
            subject: d.subject || '(No subject)',
            date: d.receivedDate || d.createdAt,
            body: d.bodyPlain || d.body || '',
            read: !!d.isRead,
            hasAttachments: !!d.hasAttachments,
            attachments: d.attachments || []
        };
    }

    // First page: fetch 30 emails from MongoDB and render
    async loadEmails() {
        const emailList = document.getElementById('emailList');
        if (!this.currentAccount) {
            if (emailList) emailList.innerHTML = '<div class="empty-state"><div class="empty-state-text">Select a connected account.</div></div>';
            return;
        }
        this.page = 1;
        this.hasMore = false;
        this.loadingPage = false;
        this.emails.clear();
        if (emailList) emailList.innerHTML = '<div class="empty-state"><div class="empty-state-text">Loading emails…</div></div>';
        this.bindInfiniteScroll();

        try {
            const res = await this.apiCall(`/emails?provider=${encodeURIComponent(this.currentAccount.provider)}&page=1&limit=30`);
            const docs = (res && res.emails) || [];
            this.hasMore = !!res.hasMore;
            emailList.innerHTML = '';
            if (docs.length === 0) {
                emailList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">No emails in MongoDB yet — click Sync to download your mailbox.</div></div>';
                return;
            }
            this.appendEmails(docs);
        } catch (error) {
            console.error('Failed to load emails from MongoDB:', error);
            emailList.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-text">Could not load emails: ${error.message}.</div></div>`;
        }
    }

    // Append a batch of emails using a fragment (one reflow → stays responsive for 100s/1000s)
    appendEmails(docs) {
        const emailList = document.getElementById('emailList');
        const frag = document.createDocumentFragment();
        docs.forEach(d => {
            const email = this.mapStoredEmail(d);
            this.emails.set(email.id, email);
            frag.appendChild(this.createEmailListItem(email));
        });
        emailList.appendChild(frag);
    }

    // Infinite scroll: pull the next 30 from MongoDB
    async loadMoreEmails() {
        if (!this.hasMore || this.loadingPage || !this.currentAccount) return;
        this.loadingPage = true;
        this.page += 1;
        try {
            const res = await this.apiCall(`/emails?provider=${encodeURIComponent(this.currentAccount.provider)}&page=${this.page}&limit=30`);
            const docs = (res && res.emails) || [];
            this.hasMore = !!res.hasMore;
            this.appendEmails(docs);
        } catch (error) {
            console.error('Load-more failed:', error);
            this.page -= 1;
        } finally {
            this.loadingPage = false;
        }
    }

    bindInfiniteScroll() {
        if (this._scrollBound) return;
        const handler = (e) => {
            const el = e.currentTarget;
            if (el.scrollTop + el.clientHeight >= el.scrollHeight - 250) {
                this.loadMoreEmails();
            }
        };
        ['emailList', 'emailListContainer'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('scroll', handler);
        });
        this._scrollBound = true;
    }

    // Map a provider message into the MongoDB store payload
    toStorePayload(m, provider) {
        if (provider === 'outlook') {
            const addr = m.from && m.from.emailAddress;
            return {
                externalId: m.id,
                from: (addr && addr.address) || '',
                fromName: (addr && addr.name) || '',
                to: (m.toRecipients && m.toRecipients[0] && m.toRecipients[0].emailAddress && m.toRecipients[0].emailAddress.address) || '',
                subject: m.subject || '(No subject)',
                body: m.bodyPreview || (m.body && m.body.content) || '',
                date: m.receivedDateTime || m.sentDateTime || new Date().toISOString(),
                isRead: !!m.isRead,
                hasAttachments: !!m.hasAttachments,
                attachments: (m.attachments || []).map(a => ({
                    filename: a.name || 'attachment',
                    mimetype: a.contentType || '',
                    size: a.size || 0,
                    attachmentId: a.id || ''
                }))
            };
        }
        return {
            externalId: m.id || ('e_' + Math.random().toString(36).slice(2)),
            from: m.from || '',
            fromName: '',
            to: m.to || '',
            subject: m.subject || '(No subject)',
            body: m.body || m.snippet || '',
            date: m.date || new Date().toISOString(),
            isRead: m.read || false
        };
    }

    createEmailListItem(email) {
        const div = document.createElement('div');
        div.className = `email-item ${email.read ? '' : 'unread'}`;
        div.dataset.emailId = email.id;

        const date = new Date(email.date);
        const dateStr = date.toLocaleDateString() === new Date().toLocaleDateString() ?
            date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
            date.toLocaleDateString();

        div.innerHTML = `
            <input type="checkbox" class="email-item-checkbox" data-email-id="${email.id}">
            <div class="email-item-from">${this.truncate(email.from || 'Unknown', 20)}</div>
            <div class="email-item-subject">${this.truncate(email.subject || '(No subject)', 40)}</div>
            <div class="email-item-date">${dateStr}</div>
        `;

        div.querySelector('.email-item-checkbox').addEventListener('change', (e) => {
            if (e.target.checked) {
                this.selectedEmails.add(email.id);
            } else {
                this.selectedEmails.delete(email.id);
            }
        });

        return div;
    }

    openEmail(emailId) {
        const email = this.emails.get(emailId);
        if (!email) return;

        this.currentEmail = email;

        document.getElementById('emailListContainer').style.display = 'none';
        document.getElementById('emailDetailContainer').style.display = 'flex';

        // Populate detail view
        document.getElementById('detailFrom').textContent = email.from || 'Unknown';
        document.getElementById('detailTo').textContent = email.to || '';
        document.getElementById('detailDate').textContent = new Date(email.date).toLocaleString();
        document.getElementById('detailSubject').textContent = email.subject || '(No subject)';
        document.getElementById('emailBody').textContent = email.body || '(Empty message)';

        // Show CC if present
        if (email.cc) {
            document.getElementById('ccRow').style.display = 'grid';
            document.getElementById('detailCc').textContent = email.cc;
        } else {
            document.getElementById('ccRow').style.display = 'none';
        }

        // Show attachments if present
        if (email.attachments && email.attachments.length > 0) {
            this.displayAttachments(email.attachments);
        } else {
            document.getElementById('attachmentsSection').style.display = 'none';
        }

        // Mark as read
        if (!email.read) {
            email.read = true;
            this.updateEmailReadStatus(emailId, true);
        }
    }

    displayAttachments(attachments) {
        const section = document.getElementById('attachmentsSection');
        const list = document.getElementById('attachmentsList');
        list.innerHTML = '';

        attachments.forEach(att => {
            const div = document.createElement('div');
            div.className = 'attachment-item';
            const icon = this.getFileIcon(att.filename);
            div.innerHTML = `
                <div class="attachment-icon">${icon}</div>
                <div class="attachment-name">${this.truncate(att.filename, 15)}</div>
                <div class="attachment-size">${this.formatFileSize(att.size)}</div>
                <button class="attachment-download-btn">Download</button>
            `;
            div.querySelector('.attachment-download-btn').addEventListener('click', () => {
                this.downloadAttachment(att);
            });
            list.appendChild(div);
        });

        section.style.display = 'block';
    }

    backToList() {
        document.getElementById('emailListContainer').style.display = 'flex';
        document.getElementById('emailDetailContainer').style.display = 'none';
        this.currentEmail = null;
    }

    openComposeModal() {
        document.getElementById('composeModal').classList.add('active');
    }

    closeComposeModal() {
        document.getElementById('composeModal').classList.remove('active');
        document.getElementById('composeForm').reset();
        document.getElementById('uploadedFiles').innerHTML = '';
    }

    async sendEmail() {
        const from = document.getElementById('fromSelect').value;
        const to = document.getElementById('toInput').value;
        const cc = document.getElementById('ccInput').value;
        const bcc = document.getElementById('bccInput').value;
        const subject = document.getElementById('subjectInput').value;
        const body = document.getElementById('bodyInput').value;

        if (!from || !to || !subject || !body) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('connectionId', from);
            formData.append('to', to);
            formData.append('cc', cc);
            formData.append('bcc', bcc);
            formData.append('subject', subject);
            formData.append('body', body);

            // Add attachments
            const files = document.getElementById('fileInput').files;
            for (let i = 0; i < files.length; i++) {
                formData.append('attachments', files[i]);
            }

            const response = await fetch('/api/email/send', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                this.showToast('Email sent successfully', 'success');
                this.closeComposeModal();
                this.loadEmails();
            } else {
                this.showToast('Failed to send email', 'error');
            }
        } catch (error) {
            console.error('Failed to send email:', error);
            this.showToast('Error sending email', 'error');
        }
    }

    saveDraft() {
        const from = document.getElementById('fromSelect').value;
        const to = document.getElementById('toInput').value;
        const cc = document.getElementById('ccInput').value;
        const subject = document.getElementById('subjectInput').value;
        const body = document.getElementById('bodyInput').value;

        const draft = {
            id: 'draft_' + Date.now(),
            from,
            to,
            cc,
            subject,
            body,
            timestamp: new Date().toISOString()
        };

        this.draftedEmails.set(draft.id, draft);
        localStorage.setItem('emailDrafts', JSON.stringify(Array.from(this.draftedEmails.entries())));

        this.showToast('Draft saved', 'success');
    }

    async deleteEmail(emailId) {
        if (!confirm('Are you sure you want to delete this email?')) return;

        try {
            const response = await fetch(`/api/email/delete/${emailId}`, {
                method: 'POST'
            });

            if (response.ok) {
                this.showToast('Email deleted', 'success');
                this.backToList();
                this.loadEmails();
            }
        } catch (error) {
            console.error('Failed to delete email:', error);
            this.showToast('Failed to delete email', 'error');
        }
    }

    toggleStar(emailId) {
        const email = this.emails.get(emailId);
        if (email) {
            email.starred = !email.starred;
            document.getElementById('btnStar').textContent = email.starred ? '⭐' : '☆';
        }
    }

    updateEmailReadStatus(emailId, read) {
        // Update in memory
        const email = this.emails.get(emailId);
        if (email) email.read = read;

        // Update in UI
        const element = document.querySelector(`[data-email-id="${emailId}"]`);
        if (element) {
            element.classList.toggle('unread', !read);
        }
    }

    openReplyModal(mode) {
        const email = this.currentEmail;
        if (!email) return;

        document.getElementById('replyModalTitle').textContent =
            mode === 'forward' ? 'Forward Email' :
            mode === 'replyAll' ? 'Reply All' : 'Reply';

        document.getElementById('originalFrom').textContent = email.from;
        document.getElementById('originalDate').textContent = new Date(email.date).toLocaleString();
        document.getElementById('originalBody').textContent = email.body || '(Empty message)';

        document.getElementById('replyBodyInput').value =
            `\n\n---------- Original Message ----------\nFrom: ${email.from}\nDate: ${new Date(email.date).toLocaleString()}\nSubject: ${email.subject}\n\n${email.body}`;

        document.getElementById('replyModal').classList.add('active');

        // Store reply mode
        document.getElementById('replyModal').dataset.mode = mode;
    }

    closeReplyModal() {
        document.getElementById('replyModal').classList.remove('active');
    }

    async sendReply() {
        const body = document.getElementById('replyBodyInput').value;
        const subject = `Re: ${this.currentEmail.subject}`;

        if (!body) {
            this.showToast('Reply cannot be empty', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/email/reply/${this.currentEmail.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject, body })
            });

            if (response.ok) {
                this.showToast('Reply sent', 'success');
                this.closeReplyModal();
            }
        } catch (error) {
            console.error('Failed to send reply:', error);
            this.showToast('Failed to send reply', 'error');
        }
    }

    saveDraftReply() {
        const body = document.getElementById('replyBodyInput').value;
        const subject = `Re: ${this.currentEmail.subject}`;

        const draft = {
            id: 'reply_draft_' + Date.now(),
            replyTo: this.currentEmail.id,
            subject,
            body,
            timestamp: new Date().toISOString()
        };

        this.draftedEmails.set(draft.id, draft);
        localStorage.setItem('emailDrafts', JSON.stringify(Array.from(this.draftedEmails.entries())));

        this.showToast('Reply draft saved', 'success');
    }

    searchEmails(query) {
        const emailList = document.getElementById('emailList');
        const filtered = Array.from(this.emails.values()).filter(email =>
            email.from.toLowerCase().includes(query.toLowerCase()) ||
            email.subject.toLowerCase().includes(query.toLowerCase()) ||
            email.body.toLowerCase().includes(query.toLowerCase())
        );

        emailList.innerHTML = '';
        if (filtered.length === 0) {
            emailList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-text">No emails found</div>
                </div>
            `;
            return;
        }

        filtered.forEach(email => {
            emailList.appendChild(this.createEmailListItem(email));
        });
    }

    async syncEmails() {
        if (!this.currentAccount) {
            this.showToast('❌ No account selected. Connect Outlook or Gmail first (+).', 'error');
            return;
        }
        const sso = this.currentAccount.sso;
        this.showToast(`⏳ Downloading ${this.currentAccount.email} into MongoDB…`, 'info');
        try {
            // Pull from the provider (Graph/Gmail) using the OAuth token...
            const raw = (sso && sso.getSyncedEmails) ? await sso.getSyncedEmails(25) : [];
            const payload = (raw || []).map(m => this.toStorePayload(m, this.currentAccount.provider));
            // ...and persist them to MongoDB
            const res = await this.apiCall('/email-store', {
                method: 'POST',
                body: { provider: this.currentAccount.provider, emails: payload }
            });
            this.showToast(`✅ Downloaded ${res.stored} email(s) into MongoDB.`, 'success');
        } catch (error) {
            console.error('Email download error:', error);
            this.showToast(`❌ Download failed: ${error.message}`, 'error');
        }
        // Display from MongoDB
        await this.loadEmails();
    }

    async refreshEmails() {
        this.loadEmails();
    }

    openAddAccountModal() {
        const modal = document.getElementById('addAccountModal');
        const list = document.getElementById('providerList');
        list.innerHTML = '';

        const providers = [
            { name: 'Gmail', icon: '📧', id: 'gmail', type: 'imap' },
            { name: 'Outlook', icon: '📨', id: 'outlook', type: 'imap' }
        ];

        // Email providers section
        const emailSection = document.createElement('div');
        emailSection.className = 'provider-section';
        emailSection.innerHTML = '<h4>Email Providers</h4>';

        providers.forEach(provider => {
            const card = document.createElement('div');
            card.className = 'provider-card';
            card.innerHTML = `
                <div class="provider-logo">${provider.icon}</div>
                <div class="provider-name">${provider.name}</div>
                <button class="btn-connect" data-provider="${provider.id}">Connect</button>
            `;
            card.querySelector('.btn-connect').addEventListener('click', (e) => {
                e.stopPropagation();
                this.connectProvider(provider.id);
            });
            emailSection.appendChild(card);
        });
        list.appendChild(emailSection);

        // SMTP providers section
        const smtpSection = document.createElement('div');
        smtpSection.className = 'provider-section';
        smtpSection.innerHTML = '<h4>SMTP Sending Services</h4>';

        const smtpProviders = [
            { name: 'Amazon\nSES', icon: '📦', id: 'amazon-ses' },
            { name: 'Postmark', icon: '📮', id: 'postmark' },
            { name: 'Mailgun', icon: '💌', id: 'mailgun' },
            { name: 'SMTP2Go', icon: '🚀', id: 'smtp2go' }
        ];

        smtpProviders.forEach(provider => {
            const card = document.createElement('div');
            card.className = 'provider-card smtp-provider-card';
            card.innerHTML = `
                <div class="provider-logo">${provider.icon}</div>
                <div class="provider-name">${provider.name}</div>
                <button class="btn-connect smtp-connect" data-provider="${provider.id}">Setup</button>
            `;
            card.querySelector('.btn-connect').addEventListener('click', (e) => {
                e.stopPropagation();
                this.openSMTPProviderModal(provider.id);
            });
            smtpSection.appendChild(card);
        });
        list.appendChild(smtpSection);

        modal.classList.add('active');
    }

    openSMTPProviderModal(providerId) {
        const userId = this.getCurrentUserId();
        const accountId = this.currentAccount || 'default-account';

        const modal = new SMTPProviderModal(userId, accountId);

        modal.onSuccess = (data) => {
            this.showToast(`${data.providerType} provider configured successfully!`, 'success');
        };

        modal.open();

        // Pre-select the provider
        modal.selectProvider(providerId);

        this.closeAddAccountModal();
    }

    getCurrentUserId() {
        return localStorage.getItem('userId') || 'user-' + Date.now();
    }

    closeAddAccountModal() {
        document.getElementById('addAccountModal').classList.remove('active');
    }

    async connectProvider(provider) {
        try {
            if (!provider) {
                throw new Error('Provider ID is required');
            }

            console.log(`🔐 Starting OAuth flow for provider: ${provider}`);

            // Validate provider exists
            if (!window.emailManager) {
                throw new Error('Email manager not initialized. Please refresh the page.');
            }

            if (!window.emailManager.platforms || !window.emailManager.platforms[provider]) {
                throw new Error(`Unknown email provider: ${provider}`);
            }

            // Show connecting status
            this.showToast(`⏳ Connecting to ${provider.toUpperCase()}...`, 'info');

            // Get the SSO instance for the provider
            const sso = window.emailManager.ssoInstances[provider];
            if (!sso) {
                throw new Error(`${provider} authentication module not loaded`);
            }

            // Start OAuth flow
            if (sso.startSSOLogin) {
                await sso.startSSOLogin();
                // Note: User will be redirected to provider's login page
            } else {
                throw new Error(`${provider} does not support SSO login`);
            }

            // Close modal on redirect
            this.closeAddAccountModal();

        } catch (error) {
            console.error(`Connection error for ${provider}:`, error);
            this.showToast(`❌ Connection failed: ${error.message || 'Unknown error occurred'}`, 'error');

            // Log error for debugging
            if (window.console && window.console.error) {
                console.error('Full error details:', {
                    provider,
                    errorMessage: error.message,
                    errorStack: error.stack,
                    timestamp: new Date().toISOString()
                });
            }
        }
    }

    openSettingsModal() {
        document.getElementById('settingsModal').classList.add('active');
        this.loadSettingsUI();
    }

    closeSettingsModal() {
        document.getElementById('settingsModal').classList.remove('active');
        this.saveSettings();
    }

    loadSettingsUI() {
        document.getElementById('autoRefreshInterval').value = this.settings.autoRefreshInterval;
        document.getElementById('autoDownloadAttachments').checked = this.settings.autoDownloadAttachments;
        document.getElementById('previewPane').checked = this.settings.previewPane;
        document.getElementById('defaultReplyAction').value = this.settings.defaultReplyAction;
        document.getElementById('autoSignature').checked = this.settings.autoSignature;
        document.getElementById('signatureInput').value = this.settings.signature;
    }

    saveSettings() {
        this.settings.autoRefreshInterval = parseInt(document.getElementById('autoRefreshInterval').value);
        this.settings.autoDownloadAttachments = document.getElementById('autoDownloadAttachments').checked;
        this.settings.previewPane = document.getElementById('previewPane').checked;
        this.settings.defaultReplyAction = document.getElementById('defaultReplyAction').value;
        this.settings.autoSignature = document.getElementById('autoSignature').checked;
        this.settings.signature = document.getElementById('signatureInput').value;

        localStorage.setItem('emailClientSettings', JSON.stringify(this.settings));
        this.showToast('Settings saved', 'success');
    }

    openSyncConfigModal() {
        const modal = document.getElementById('syncConfigModal');
        if (modal) {
            modal.classList.add('active');
            this.loadSyncConfig();
        }
    }

    closeSyncConfigModal() {
        const modal = document.getElementById('syncConfigModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    loadSyncConfig() {
        const syncConfig = JSON.parse(localStorage.getItem('emailSyncConfig') || '{}');

        document.getElementById('syncUserId').value = syncConfig.userId || '';
        document.getElementById('syncPassword').value = syncConfig.password || '';
        document.getElementById('sesAccessKey').value = syncConfig.sesAccessKey || '';
        document.getElementById('sesSecretKey').value = syncConfig.sesSecretKey || '';
        document.getElementById('sesRegion').value = syncConfig.sesRegion || '';
        document.getElementById('postmarkAccountToken').value = syncConfig.postmarkAccountToken || '';
        document.getElementById('postmarkServerToken').value = syncConfig.postmarkServerToken || '';
        document.getElementById('mailgunApiKey').value = syncConfig.mailgunApiKey || '';
        document.getElementById('mailgunDomain').value = syncConfig.mailgunDomain || '';
        document.getElementById('smtp2goApiKey').value = syncConfig.smtp2goApiKey || '';
    }

    saveSyncConfig() {
        const syncConfig = {
            userId: document.getElementById('syncUserId').value,
            password: document.getElementById('syncPassword').value,
            sesAccessKey: document.getElementById('sesAccessKey').value,
            sesSecretKey: document.getElementById('sesSecretKey').value,
            sesRegion: document.getElementById('sesRegion').value,
            postmarkAccountToken: document.getElementById('postmarkAccountToken').value,
            postmarkServerToken: document.getElementById('postmarkServerToken').value,
            mailgunApiKey: document.getElementById('mailgunApiKey').value,
            mailgunDomain: document.getElementById('mailgunDomain').value,
            smtp2goApiKey: document.getElementById('smtp2goApiKey').value
        };

        localStorage.setItem('emailSyncConfig', JSON.stringify(syncConfig));
        this.showToast('Email Sync Configuration saved successfully!', 'success');
        this.closeSyncConfigModal();
    }

    loadSettings() {
        const saved = localStorage.getItem('emailClientSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
    }

    switchTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        document.getElementById(tab + 'Tab').classList.add('active');
    }

    handleFileUpload(event) {
        const files = event.target.files || event.dataTransfer?.files;
        const uploadedDiv = document.getElementById('uploadedFiles');

        Array.from(files).forEach(file => {
            if (file.size > 25 * 1024 * 1024) {
                this.showToast(`File ${file.name} exceeds 25MB limit`, 'error');
                return;
            }

            const fileDiv = document.createElement('div');
            fileDiv.className = 'uploaded-file';
            const icon = this.getFileIcon(file.name);
            fileDiv.innerHTML = `
                <div class="uploaded-file-info">
                    <span class="uploaded-file-icon">${icon}</span>
                    <span class="uploaded-file-name">${file.name}</span>
                    <span>${this.formatFileSize(file.size)}</span>
                </div>
                <button type="button" class="btn-remove-file">×</button>
            `;

            fileDiv.querySelector('.btn-remove-file').addEventListener('click', () => {
                fileDiv.remove();
            });

            uploadedDiv.appendChild(fileDiv);
        });
    }

    formatText(command) {
        document.execCommand(command, false, null);
    }

    insertLink() {
        const url = prompt('Enter URL:');
        if (url) {
            document.execCommand('createLink', false, url);
        }
    }

    parseRecipients(inputId) {
        const input = document.getElementById(inputId);
        const tagsDiv = document.getElementById(inputId.replace('Input', 'Tags'));
        const emails = input.value.split(/[,;]/).map(e => e.trim()).filter(e => e);

        tagsDiv.innerHTML = '';
        emails.forEach(email => {
            const tag = document.createElement('div');
            tag.className = 'recipient-tag';
            tag.innerHTML = `
                ${email}
                <span class="recipient-tag-remove">×</span>
            `;
            tag.querySelector('.recipient-tag-remove').addEventListener('click', () => tag.remove());
            tagsDiv.appendChild(tag);
        });

        input.value = '';
    }

    selectAllEmails(checked) {
        document.querySelectorAll('.email-item-checkbox').forEach(checkbox => {
            checkbox.checked = checked;
            const emailId = checkbox.dataset.emailId;
            if (checked) {
                this.selectedEmails.add(emailId);
            } else {
                this.selectedEmails.delete(emailId);
            }
        });
    }

    // Downloads an attachment's content ONLY when the user clicks it (never automatically)
    async downloadAttachment(attachment) {
        const email = this.currentEmail;
        const sso = this.currentAccount && this.currentAccount.sso;
        if (!email || !email.externalId || !attachment.attachmentId) {
            this.showToast('Attachment reference unavailable.', 'error');
            return;
        }
        if (!sso || !sso.accessToken) {
            this.showToast('Reconnect the account to download attachments.', 'error');
            return;
        }
        try {
            this.showToast(`⬇️ Downloading ${attachment.filename}…`, 'info');
            const url = `https://graph.microsoft.com/v1.0/me/messages/${email.externalId}/attachments/${attachment.attachmentId}`;
            const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${sso.accessToken}` } });
            if (!resp.ok) throw new Error('Graph error ' + resp.status);
            const data = await resp.json();
            if (!data.contentBytes) throw new Error('No downloadable content');
            const blob = this.b64ToBlob(data.contentBytes, data.contentType || attachment.mimetype || 'application/octet-stream');
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = attachment.filename || data.name || 'attachment';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(a.href);
        } catch (e) {
            console.error('Attachment download error:', e);
            this.showToast(`Download failed: ${e.message}`, 'error');
        }
    }

    b64ToBlob(b64, type) {
        const bytes = atob(b64);
        const arr = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
        return new Blob([arr], { type });
    }

    truncate(text, length) {
        return text && text.length > length ? text.substring(0, length) + '...' : text;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            'pdf': '📄', 'doc': '📄', 'docx': '📄', 'txt': '📄',
            'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️',
            'mp3': '🎵', 'mp4': '🎬', 'avi': '🎬',
            'zip': '📦', 'rar': '📦', '7z': '📦',
            'xls': '📊', 'xlsx': '📊', 'csv': '📊',
            'ppt': '📈', 'pptx': '📈'
        };
        return icons[ext] || '📎';
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close">×</button>
        `;

        toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
        container.appendChild(toast);

        setTimeout(() => toast.remove(), 5000);
    }
}

// Initialize Email Client
document.addEventListener('DOMContentLoaded', () => {
    window.emailClient = new EmailClient();
});
