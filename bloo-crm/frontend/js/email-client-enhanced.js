/* =====================================================
   EMAIL CLIENT - WITH BACKEND INTEGRATION
   ===================================================== */

class EmailClient {
    constructor(userId = 'default-user') {
        this.userId = userId;
        this.accounts = [];
        this.emails = [];
        this.currentFolder = 'inbox';
        this.currentAccountId = null;
        this.selectedEmail = null;
        this.apiBase = 'http://localhost:5000/api';
        this.view = 'list'; // 'list' or 'detail'
        this.uploadedAttachments = [];

        this.settings = {
            autoRefreshInterval: 5,
            autoDownloadAttachments: false,
            previewPane: true,
            defaultReplyAction: 'reply',
            autoSignature: true,
            signature: ''
        };

        this.initializeEventListeners();
        this.loadAccounts();
        this.loadSettings();
        this.loadEmails();
        this.startAutoSync();
    }

    initializeEventListeners() {
        // Account management
        document.getElementById('btnAddAccount')?.addEventListener('click', () => this.openAddAccountModal());
        document.getElementById('btnSyncAccounts')?.addEventListener('click', () => this.syncAllAccounts());

        // Folder navigation
        document.querySelectorAll('.folder-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const folder = e.currentTarget.dataset.folder;
                this.switchFolder(folder);
            });
        });

        // Compose
        document.getElementById('btnCompose')?.addEventListener('click', () => this.openComposeModal());
        document.getElementById('btnSendEmail')?.addEventListener('click', () => this.sendEmail());
        document.getElementById('btnSaveDraft')?.addEventListener('click', () => this.saveDraft());
        document.getElementById('btnCancelCompose')?.addEventListener('click', () => this.closeComposeModal());

        // Email actions
        document.getElementById('btnReply')?.addEventListener('click', () => this.replyEmail());
        document.getElementById('btnReplyAll')?.addEventListener('click', () => this.replyAllEmail());
        document.getElementById('btnForward')?.addEventListener('click', () => this.forwardEmail());
        document.getElementById('btnDelete')?.addEventListener('click', () => this.deleteEmail());
        document.getElementById('btnArchive')?.addEventListener('click', () => this.archiveEmail());
        document.getElementById('btnSpam')?.addEventListener('click', () => this.markSpam());
        document.getElementById('btnStar')?.addEventListener('click', () => this.toggleStar());
        document.getElementById('btnMarkRead')?.addEventListener('click', () => this.toggleReadStatus());

        // Search
        document.getElementById('emailSearch')?.addEventListener('input', (e) => this.searchEmails(e.target.value));

        // Attachments
        document.getElementById('fileInput')?.addEventListener('change', (e) => this.handleFileUpload(e));
        document.getElementById('btnAttachFile')?.addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        // Settings
        document.getElementById('btnSettings')?.addEventListener('click', () => this.openSettingsModal());
    }

    // =====================================================
    // ACCOUNT MANAGEMENT
    // =====================================================

    async loadAccounts() {
        try {
            const response = await fetch(`${this.apiBase}/email/accounts?userId=${this.userId}`);
            const data = await response.json();

            if (data.status === 'success') {
                this.accounts = data.accounts;
                this.currentAccountId = this.accounts[0]?.id;
                this.populateAccountSelector();
                this.showToast(`Loaded ${data.count} email accounts`, 'info');
            }
        } catch (error) {
            console.error('Failed to load accounts:', error);
            this.showToast('Failed to load email accounts', 'error');
        }
    }

    populateAccountSelector() {
        const selector = document.getElementById('accountSelector');
        if (!selector) return;

        selector.innerHTML = '';
        this.accounts.forEach(account => {
            const option = document.createElement('option');
            option.value = account.id;
            option.textContent = `${account.email} (${account.provider})`;
            option.selected = account.id === this.currentAccountId;
            selector.appendChild(option);
        });

        selector.addEventListener('change', (e) => {
            this.currentAccountId = e.target.value;
            this.loadEmails();
        });
    }

    openAddAccountModal() {
        const modal = document.getElementById('addAccountModal');
        if (modal) {
            modal.classList.add('active');
        }
    }

    // =====================================================
    // EMAIL MANAGEMENT
    // =====================================================

    async loadEmails() {
        try {
            const query = new URLSearchParams({
                userId: this.userId,
                folder: this.currentFolder,
                accountId: this.currentAccountId,
                limit: 50
            });

            const response = await fetch(`${this.apiBase}/email/folder/${this.currentFolder}?${query}`);
            const data = await response.json();

            if (data.status === 'success') {
                this.emails = data.emails;
                this.renderEmailList();
                this.updateFolderCounts();
            }
        } catch (error) {
            console.error('Failed to load emails:', error);
            this.showToast('Failed to load emails', 'error');
        }
    }

    switchFolder(folder) {
        this.currentFolder = folder;
        document.querySelectorAll('.folder-item').forEach(item => {
            item.classList.remove('active');
        });
        event.currentTarget?.classList.add('active');
        this.loadEmails();
    }

    async updateFolderCounts() {
        try {
            const response = await fetch(`${this.apiBase}/email/stats?userId=${this.userId}`);
            const data = await response.json();

            if (data.status === 'success') {
                const stats = data.stats;
                document.querySelector('[data-folder="inbox"]')?.setAttribute('data-count', stats.total - stats.sent);
                document.querySelector('[data-folder="unread"]')?.setAttribute('data-count', stats.unread);
                document.querySelector('[data-folder="starred"]')?.setAttribute('data-count', stats.starred);
                document.querySelector('[data-folder="drafts"]')?.setAttribute('data-count', stats.drafts);
                document.querySelector('[data-folder="sent"]')?.setAttribute('data-count', stats.sent);
                document.querySelector('[data-folder="trash"]')?.setAttribute('data-count', stats.trash);
            }
        } catch (error) {
            console.error('Failed to update folder counts:', error);
        }
    }

    renderEmailList() {
        const container = document.getElementById('emailList');
        if (!container) return;

        if (this.emails.length === 0) {
            container.innerHTML = '<p class="empty-state">No emails in this folder</p>';
            return;
        }

        container.innerHTML = this.emails.map(email => `
            <div class="email-item ${email.isRead ? '' : 'unread'}" data-email-id="${email._id}">
                <div class="email-checkbox">
                    <input type="checkbox" data-email-id="${email._id}">
                </div>
                <div class="email-from">${email.from.name || email.from.email}</div>
                <div class="email-subject">${email.subject || '(No Subject)'}</div>
                <div class="email-preview">${email.snippet || ''}</div>
                <div class="email-date">${this.formatDate(email.receivedDate || email.sentDate)}</div>
                ${email.hasAttachments ? '<div class="email-attachment-icon">📎</div>' : ''}
                <div class="email-star ${email.isStarred ? 'starred' : ''}">⭐</div>
            </div>
        `).join('');

        // Add click handlers
        container.querySelectorAll('.email-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('email-star')) {
                    this.openEmail(item.dataset.emailId);
                }
            });
        });

        // Star handlers
        container.querySelectorAll('.email-star').forEach(star => {
            star.addEventListener('click', (e) => {
                e.stopPropagation();
                const emailId = star.closest('.email-item').dataset.emailId;
                this.toggleStar(emailId);
            });
        });
    }

    async openEmail(emailId) {
        try {
            const response = await fetch(`${this.apiBase}/email/${emailId}`);
            const data = await response.json();

            if (data.status === 'success') {
                this.selectedEmail = data.email;
                this.view = 'detail';
                this.renderEmailDetail();
                this.loadAttachments(emailId);
            }
        } catch (error) {
            console.error('Failed to open email:', error);
            this.showToast('Failed to load email', 'error');
        }
    }

    renderEmailDetail() {
        const container = document.getElementById('emailDetail');
        if (!container) return;

        const email = this.selectedEmail;
        container.innerHTML = `
            <div class="email-detail-header">
                <h2>${email.subject}</h2>
                <div class="email-detail-meta">
                    <div class="email-from">From: <strong>${email.from.name || email.from.email}</strong></div>
                    <div class="email-to">To: ${email.to.map(t => t.email).join(', ')}</div>
                    ${email.cc.length > 0 ? `<div class="email-cc">Cc: ${email.cc.map(c => c.email).join(', ')}</div>` : ''}
                    <div class="email-date">${this.formatDateTime(email.receivedDate || email.sentDate)}</div>
                </div>
            </div>
            <div class="email-body">${email.bodyHtml || this.escapeHtml(email.body)}</div>
            ${email.hasAttachments ? `<div id="attachmentsList" class="attachments-section"></div>` : ''}
            <div class="email-actions">
                <button id="btnReply" class="btn btn-primary">↩️ Reply</button>
                <button id="btnReplyAll" class="btn btn-primary">↩️↩️ Reply All</button>
                <button id="btnForward" class="btn btn-secondary">↪️ Forward</button>
                <button id="btnDelete" class="btn btn-danger">🗑️ Delete</button>
                <button id="btnArchive" class="btn btn-secondary">📦 Archive</button>
                <button id="btnSpam" class="btn btn-secondary">⚠️ Spam</button>
            </div>
        `;

        document.getElementById('btnReply')?.addEventListener('click', () => this.replyEmail());
        document.getElementById('btnReplyAll')?.addEventListener('click', () => this.replyAllEmail());
        document.getElementById('btnForward')?.addEventListener('click', () => this.forwardEmail());
        document.getElementById('btnDelete')?.addEventListener('click', () => this.deleteEmail());
        document.getElementById('btnArchive')?.addEventListener('click', () => this.archiveEmail());
        document.getElementById('btnSpam')?.addEventListener('click', () => this.markSpam());
    }

    async loadAttachments(emailId) {
        try {
            const response = await fetch(`${this.apiBase}/email/attachments/${emailId}`);
            const data = await response.json();

            if (data.status === 'success' && data.count > 0) {
                const container = document.getElementById('attachmentsList');
                if (container) {
                    container.innerHTML = `
                        <h4>Attachments (${data.count})</h4>
                        <div class="attachments-list">
                            ${data.attachments.map(att => `
                                <div class="attachment-item">
                                    <div class="attachment-icon">📄</div>
                                    <div class="attachment-info">
                                        <div class="attachment-name">${att.filename}</div>
                                        <div class="attachment-size">${att.sizeFormatted}</div>
                                    </div>
                                    <a href="${att.downloadUrl}" download class="btn btn-sm btn-secondary">Download</a>
                                </div>
                            `).join('')}
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error('Failed to load attachments:', error);
        }
    }

    async sendEmail() {
        try {
            const to = document.getElementById('emailTo')?.value;
            const cc = document.getElementById('emailCc')?.value;
            const bcc = document.getElementById('emailBcc')?.value;
            const subject = document.getElementById('emailSubject')?.value;
            const body = document.getElementById('emailBody')?.value;

            if (!to || !subject) {
                this.showToast('To and Subject are required', 'error');
                return;
            }

            const response = await fetch(`${this.apiBase}/email/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.userId,
                    accountId: this.currentAccountId,
                    to: to.split(/[,;]/).map(e => ({ email: e.trim() })),
                    cc: cc ? cc.split(/[,;]/).map(e => ({ email: e.trim() })) : [],
                    bcc: bcc ? bcc.split(/[,;]/).map(e => ({ email: e.trim() })) : [],
                    subject,
                    body,
                    attachmentIds: this.uploadedAttachments.map(att => att.id)
                })
            });

            const data = await response.json();

            if (data.status === 'success') {
                this.showToast('Email sent successfully', 'success');
                this.closeComposeModal();
                this.clearComposeForm();
                this.loadEmails();
            } else {
                this.showToast(data.error || 'Failed to send email', 'error');
            }
        } catch (error) {
            console.error('Send error:', error);
            this.showToast('Failed to send email', 'error');
        }
    }

    async saveDraft() {
        try {
            const to = document.getElementById('emailTo')?.value;
            const cc = document.getElementById('emailCc')?.value;
            const bcc = document.getElementById('emailBcc')?.value;
            const subject = document.getElementById('emailSubject')?.value || 'Untitled';
            const body = document.getElementById('emailBody')?.value;

            const response = await fetch(`${this.apiBase}/email/draft`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.userId,
                    accountId: this.currentAccountId,
                    to: to ? to.split(/[,;]/).map(e => ({ email: e.trim() })) : [],
                    cc: cc ? cc.split(/[,;]/).map(e => ({ email: e.trim() })) : [],
                    bcc: bcc ? bcc.split(/[,;]/).map(e => ({ email: e.trim() })) : [],
                    subject,
                    body,
                    attachmentIds: this.uploadedAttachments.map(att => att.id)
                })
            });

            const data = await response.json();

            if (data.status === 'success') {
                this.showToast('Draft saved successfully', 'success');
                this.closeComposeModal();
            } else {
                this.showToast(data.error || 'Failed to save draft', 'error');
            }
        } catch (error) {
            console.error('Draft error:', error);
            this.showToast('Failed to save draft', 'error');
        }
    }

    async deleteEmail(emailId = null) {
        const id = emailId || this.selectedEmail?._id;
        if (!id) return;

        try {
            const response = await fetch(`${this.apiBase}/email/${id}/delete`, {
                method: 'POST'
            });

            const data = await response.json();

            if (data.status === 'success') {
                this.showToast('Email deleted', 'success');
                this.loadEmails();
            }
        } catch (error) {
            console.error('Delete error:', error);
            this.showToast('Failed to delete email', 'error');
        }
    }

    async toggleStar(emailId = null) {
        const id = emailId || this.selectedEmail?._id;
        if (!id) return;

        try {
            const email = this.emails.find(e => e._id === id) || this.selectedEmail;
            const response = await fetch(`${this.apiBase}/email/${id}/star`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ starred: !email.isStarred })
            });

            const data = await response.json();

            if (data.status === 'success') {
                if (email) email.isStarred = !email.isStarred;
                this.renderEmailList();
            }
        } catch (error) {
            console.error('Star error:', error);
        }
    }

    async toggleReadStatus(emailId = null) {
        const id = emailId || this.selectedEmail?._id;
        if (!id) return;

        try {
            const email = this.emails.find(e => e._id === id) || this.selectedEmail;
            const response = await fetch(`${this.apiBase}/email/${id}/read`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ read: !email.isRead })
            });

            const data = await response.json();

            if (data.status === 'success') {
                if (email) email.isRead = !email.isRead;
                this.renderEmailList();
            }
        } catch (error) {
            console.error('Read status error:', error);
        }
    }

    async replyEmail() {
        if (!this.selectedEmail) return;

        this.openComposeModal();
        document.getElementById('emailTo').value = this.selectedEmail.from.email;
        document.getElementById('emailSubject').value = `Re: ${this.selectedEmail.subject}`;

        const quotedBody = `\n\nOn ${this.formatDateTime(this.selectedEmail.receivedDate || this.selectedEmail.sentDate)}, ${this.selectedEmail.from.email} wrote:\n> ${this.selectedEmail.body}`;
        document.getElementById('emailBody').value = quotedBody;
    }

    async replyAllEmail() {
        if (!this.selectedEmail) return;

        this.openComposeModal();
        const recipients = [this.selectedEmail.from.email, ...this.selectedEmail.to.map(t => t.email)];
        document.getElementById('emailTo').value = recipients.join(', ');
        document.getElementById('emailSubject').value = `Re: ${this.selectedEmail.subject}`;

        const quotedBody = `\n\nOn ${this.formatDateTime(this.selectedEmail.receivedDate || this.selectedEmail.sentDate)}, ${this.selectedEmail.from.email} wrote:\n> ${this.selectedEmail.body}`;
        document.getElementById('emailBody').value = quotedBody;
    }

    async forwardEmail() {
        if (!this.selectedEmail) return;

        this.openComposeModal();
        document.getElementById('emailSubject').value = `Fwd: ${this.selectedEmail.subject}`;

        const forwardedBody = `\n\n---------- Forwarded message ---------\nFrom: ${this.selectedEmail.from.email}\nDate: ${this.formatDateTime(this.selectedEmail.receivedDate || this.selectedEmail.sentDate)}\nSubject: ${this.selectedEmail.subject}\n\n${this.selectedEmail.body}`;
        document.getElementById('emailBody').value = forwardedBody;
    }

    async archiveEmail() {
        // Move to archive folder
        this.showToast('Email archived', 'success');
    }

    async markSpam() {
        // Mark as spam
        this.showToast('Email marked as spam', 'success');
    }

    // =====================================================
    // ATTACHMENT HANDLING
    // =====================================================

    async handleFileUpload(event) {
        const files = event.target.files;
        if (!files) return;

        for (let file of files) {
            await this.uploadAttachment(file);
        }
    }

    async uploadAttachment(file) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('userId', this.userId);
            formData.append('accountId', this.currentAccountId);

            const response = await fetch(`${this.apiBase}/email/attachment/upload`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.status === 'success') {
                this.uploadedAttachments.push(data.attachment);
                this.renderAttachmentList();
                this.showToast(`${file.name} uploaded`, 'success');
            } else {
                this.showToast(data.error || 'Upload failed', 'error');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showToast('Failed to upload file', 'error');
        }
    }

    renderAttachmentList() {
        const container = document.getElementById('attachmentsList');
        if (!container) return;

        if (this.uploadedAttachments.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `
            <div class="attachments-preview">
                <h4>Attachments (${this.uploadedAttachments.length})</h4>
                ${this.uploadedAttachments.map((att, idx) => `
                    <div class="attachment-preview-item">
                        <span>${att.filename} (${att.size})</span>
                        <button type="button" onclick="emailClient.removeAttachment(${idx})" class="btn-remove">×</button>
                    </div>
                `).join('')}
            </div>
        `;
    }

    removeAttachment(index) {
        this.uploadedAttachments.splice(index, 1);
        this.renderAttachmentList();
    }

    // =====================================================
    // SEARCH & FILTER
    // =====================================================

    async searchEmails(query) {
        if (!query.trim()) {
            this.loadEmails();
            return;
        }

        try {
            const response = await fetch(
                `${this.apiBase}/email/search?userId=${this.userId}&query=${encodeURIComponent(query)}&accountId=${this.currentAccountId}`
            );
            const data = await response.json();

            if (data.status === 'success') {
                this.emails = data.results;
                this.renderEmailList();
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    // =====================================================
    // SYNC & AUTO-REFRESH
    // =====================================================

    async syncAllAccounts() {
        this.showToast('Syncing all accounts...', 'info');
        for (let account of this.accounts) {
            // Call provider sync endpoints
        }
        await this.loadEmails();
        this.showToast('Sync complete', 'success');
    }

    startAutoSync() {
        setInterval(() => {
            if (this.settings.autoRefresh !== false) {
                this.loadEmails();
            }
        }, this.settings.autoRefreshInterval * 60 * 1000);
    }

    // =====================================================
    // UI MODALS
    // =====================================================

    openComposeModal() {
        const modal = document.getElementById('composeModal');
        if (modal) {
            modal.classList.add('active');
            this.clearComposeForm();
        }
    }

    closeComposeModal() {
        const modal = document.getElementById('composeModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    clearComposeForm() {
        document.getElementById('emailTo').value = '';
        document.getElementById('emailCc').value = '';
        document.getElementById('emailBcc').value = '';
        document.getElementById('emailSubject').value = '';
        document.getElementById('emailBody').value = '';
        this.uploadedAttachments = [];
        this.renderAttachmentList();
    }

    openSettingsModal() {
        const modal = document.getElementById('settingsModal');
        if (modal) modal.classList.add('active');
    }

    closeSettingsModal() {
        const modal = document.getElementById('settingsModal');
        if (modal) modal.classList.remove('active');
    }

    // =====================================================
    // SETTINGS & PERSISTENCE
    // =====================================================

    saveSettings() {
        localStorage.setItem('emailClientSettings', JSON.stringify(this.settings));
    }

    loadSettings() {
        const saved = localStorage.getItem('emailClientSettings');
        if (saved) {
            this.settings = JSON.parse(saved);
        }
    }

    // =====================================================
    // UTILITY METHODS
    // =====================================================

    formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
    }

    formatDateTime(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 5000);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    window.emailClient = new EmailClient();
});
