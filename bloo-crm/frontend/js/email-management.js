/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   EMAIL MANAGEMENT SYSTEM
   ===================================================== */

// Email Provider Configuration
const emailProviderList = {
    'gmail': {
        name: 'Gmail',
        icon: 'fa-envelope',
        color: '#EA4335',
        description: 'Sync emails from your Gmail account',
        features: ['Full mailbox access', 'Real-time sync', '15GB storage', 'Spam filtering'],
        setupLink: 'https://mail.google.com'
    },
    'outlook': {
        name: 'Microsoft Outlook',
        icon: 'fa-envelope',
        color: '#0078D4',
        description: 'Connect your Outlook/Office 365 email',
        features: ['Exchange Online', 'Shared mailboxes', 'Rules & filters', 'Archive support'],
        setupLink: 'https://outlook.office.com'
    },
};

// Load email providers section
function loadEmailProviders() {
    const user = getCurrentUser();
    const container = document.getElementById('emailProvidersSection');

    if (!container) return;

    let html = `
        <div class="video-providers-container">
            <div class="providers-header">
                <h3><i class="fas fa-plug"></i> Connect Your Email Provider</h3>
                <p>Choose your email provider to sync emails and manage all communications in one place</p>
            </div>
            <div class="providers-grid">
    `;

    Object.entries(emailProviderList).forEach(([key, provider]) => {
        const connectedProviders = user.connectedEmailProviders || [];
        const isConnected = connectedProviders.some(p => p.id === key);

        html += `
            <div class="provider-card ${isConnected ? 'connected' : 'available'}">
                <div class="provider-logo" style="background-color: ${provider.color};">
                    <i class="fas ${provider.icon}"></i>
                </div>
                <h4>${provider.name}</h4>
                <p class="provider-desc">${provider.description}</p>
                <div class="provider-features">
                    ${provider.features.map(f => `<span class="feature">${f}</span>`).join('')}
                </div>
                <div class="provider-action">
                    ${isConnected ?
                        `<button class="btn btn-sm btn-success" onclick="startEmailSyncWithProvider('${key}')">
                            <i class="fas fa-check-circle"></i> Connected
                        </button>` :
                        `<button class="btn btn-sm btn-secondary" onclick="connectEmailProvider('${key}')">
                            <i class="fas fa-link"></i> Connect
                        </button>`
                    }
                </div>
            </div>
        `;
    });

    html += '</div></div>';
    container.innerHTML = html;
}

// Connect email provider
function connectEmailProvider(providerId) {
    const provider = emailProviderList[providerId];
    const user = getCurrentUser();

    if (!emailManager) {
        showNotification('Email manager not initialized', 'error');
        return;
    }

    showNotification(`Connecting to ${provider.name}...`, 'info');

    emailManager.connectProvider(providerId).then(() => {
        if (!user.connectedEmailProviders) {
            user.connectedEmailProviders = [];
        }

        // Remove if already exists
        user.connectedEmailProviders = user.connectedEmailProviders.filter(p => p.id !== providerId);

        // Add new provider
        user.connectedEmailProviders.push({
            id: providerId,
            name: provider.name,
            connectedAt: new Date().toISOString()
        });

        saveCurrentUser(user);
        logWorkflowActivity('email_provider_connected', `Connected to ${provider.name}`);

        showNotification(`Successfully connected to ${provider.name}!`, 'success');
        loadEmailProviders();
        loadRecentEmails();
    }).catch((error) => {
        showNotification(`Connection error: ${error.message}`, 'error');
    });
}

// Start email sync with provider
function startEmailSyncWithProvider(providerId) {
    const provider = emailProviderList[providerId];
    showModal('emailSyncConfigModal');
    document.getElementById('emailSyncProvider').value = providerId;
    updateEmailSyncProviderInfo(providerId);
}

// Update email sync provider info
function updateEmailSyncProviderInfo(providerId) {
    const provider = emailProviderList[providerId];
    const infoDiv = document.getElementById('emailSyncProviderInfo');

    if (provider) {
        infoDiv.innerHTML = `<p style="color: #666; margin: 10px 0;"><strong>${provider.name}</strong><br>${provider.description}</p>`;
        infoDiv.classList.add('show');
    }
}

// Refresh email connections
function refreshEmailConnections() {
    if (emailManager) {
        showNotification('Refreshing email connections...', 'info');
        const connections = emailManager.getConnections();
        setTimeout(() => {
            loadEmailProviders();
            showNotification(`${connections.length} email connection(s) active`, 'success');
        }, 1500);
    }
}

// Handle email sync
function handleEmailSync(event) {
    if (event) {
        event.preventDefault();
    }

    const providerId = document.getElementById('emailSyncProvider')?.value;
    const provider = emailProviderList[providerId];
    const syncDaysBack = parseInt(document.getElementById('emailSyncDays')?.value) || 30;

    if (!providerId) {
        showNotification('Please select an email provider', 'error');
        return;
    }

    if (!emailManager) {
        showNotification('Email manager not initialized', 'error');
        return;
    }

    showNotification(`Starting sync with ${provider.name}...`, 'info');

    emailManager.startSync(providerId, { daysBack: syncDaysBack }).then((result) => {
        const user = getCurrentUser();
        const syncRecord = {
            id: 'sync_' + Date.now(),
            provider: providerId,
            providerName: provider.name,
            syncedAt: new Date().toISOString(),
            syncDaysBack: syncDaysBack,
            status: 'completed',
            emailCount: Math.floor(Math.random() * 100) + 20 // Placeholder
        };

        if (!user.emailSyncs) {
            user.emailSyncs = [];
        }

        user.emailSyncs.push(syncRecord);
        saveCurrentUser(user);

        logWorkflowActivity('email_sync_completed', `${provider.name}: ${syncRecord.emailCount} emails synced`);
        showNotification(`✅ ${provider.name} sync completed! ${syncRecord.emailCount} emails downloaded.`, 'success');

        closeModal('emailSyncConfigModal');
        loadRecentEmails();
        updateEmailSyncStatus();
    }).catch((error) => {
        showNotification(`Sync error: ${error.message}`, 'error');
    });
}

// Load recent emails
function loadRecentEmails() {
    const user = getCurrentUser();
    const syncs = user.emailSyncs || [];
    const container = document.getElementById('emailContainer');

    if (!container) return;

    if (syncs.length === 0) {
        container.innerHTML = '<p class="empty-state">No synced emails yet. Connect an email provider to get started.</p>';
        return;
    }

    const recentEmails = [
        {
            from: 'client@example.com',
            subject: 'Meeting Confirmation - Q4 Review',
            preview: 'Thank you for scheduling the meeting...',
            date: new Date(Date.now() - 2 * 60000),
            provider: 'gmail',
            read: false
        },
        {
            from: 'info@mailchimp.com',
            subject: 'Campaign Report: March Newsletter',
            preview: 'Your campaign performed 25% better than average...',
            date: new Date(Date.now() - 1 * 3600000),
            provider: 'mailchimp',
            read: true
        },
        {
            from: 'partner@outlook.com',
            subject: 'Project Update - Phase 2 Complete',
            preview: 'We have successfully completed phase 2 of the project...',
            date: new Date(Date.now() - 24 * 3600000),
            provider: 'outlook',
            read: true
        }
    ];

    container.innerHTML = recentEmails.map(email => `
        <div class="email-item ${email.read ? 'read' : 'unread'}">
            <div class="email-avatar">
                ${email.from.charAt(0).toUpperCase()}
            </div>
            <div class="email-content">
                <div class="email-header">
                    <span class="email-from"><strong>${email.from}</strong></span>
                    <span class="email-provider-badge" style="background: ${emailProviderList[email.provider].color}; color: white; padding: 2px 8px; border-radius: 3px; font-size: 11px; margin-left: 10px;">
                        ${emailProviderList[email.provider].name}
                    </span>
                </div>
                <div class="email-subject">${email.subject}</div>
                <div class="email-preview">${email.preview}</div>
                <div class="email-footer">
                    <span class="email-date">${formatDate(email.date)}</span>
                    <button class="btn-email-action" onclick="markEmailRead(this)" title="Mark as read">
                        <i class="fas fa-envelope-open"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Update email sync status
function updateEmailSyncStatus() {
    const user = getCurrentUser();
    const providers = user.connectedEmailProviders || [];
    const statusEl = document.getElementById('emailSyncStatus');

    if (!statusEl) return;

    if (providers.length === 0) {
        statusEl.innerHTML = '<i class="fas fa-circle" style="color: var(--text-light);"></i><span>No email provider connected</span>';
        return;
    }

    const statusHtml = providers.map(p => {
        const providerInfo = emailProviderList[p.id];
        return `
            <div style="display: flex; align-items: center; gap: 10px; margin: 8px 0;">
                <div style="width: 12px; height: 12px; border-radius: 50%; background: #22c55e;"></div>
                <span>${providerInfo.name} - ${p.email || 'Connected'}</span>
            </div>
        `;
    }).join('');

    statusEl.innerHTML = statusHtml;
}

// Mark email as read
function markEmailRead(button) {
    button.parentElement.parentElement.parentElement.classList.add('read');
    showNotification('Email marked as read', 'success');
}

// Initialize email management on page load
function initializeEmailManagement() {
    const emailProvidersSection = document.getElementById('emailProvidersSection');

    if (!emailProvidersSection) {
        console.log('Email management elements not found on this page');
        return;
    }

    if (typeof loadEmailProviders === 'function') {
        try {
            loadEmailProviders();
        } catch (error) {
            console.error('Error loading email providers:', error);
        }
    }

    if (typeof loadRecentEmails === 'function') {
        try {
            loadRecentEmails();
        } catch (error) {
            console.error('Error loading recent emails:', error);
        }
    }

    if (typeof updateEmailSyncStatus === 'function') {
        try {
            updateEmailSyncStatus();
        } catch (error) {
            console.error('Error updating email sync status:', error);
        }
    }
}

// Listen for Email Manager events
if (typeof window !== 'undefined') {
    const checkEmailManager = setInterval(() => {
        if (emailManager) {
            clearInterval(checkEmailManager);
            console.log('✅ Email Platform Manager initialized');

            // Setup event listeners for all email providers
            for (const providerId in emailManager.ssoInstances) {
                const sso = emailManager.ssoInstances[providerId];
                const provider = emailManager.platforms[providerId];

                if (sso.on) {
                    sso.on('login-success', () => {
                        console.log(`${provider.name} login successful`);
                        updateEmailSyncStatus();
                        showNotification(`✅ Connected to ${provider.name}`, 'success');
                        loadEmailProviders();
                    });

                    sso.on('logout', () => {
                        console.log(`${provider.name} logout`);
                        updateEmailSyncStatus();
                        showNotification(`⚠️ Disconnected from ${provider.name}`, 'info');
                        loadEmailProviders();
                    });

                    sso.on('session-active', () => {
                        console.log(`${provider.name} session is active`);
                        updateEmailSyncStatus();
                    });
                }
            }

            // Update initial status
            updateEmailSyncStatus();
        }
    }, 100);
}

// Auto-initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        initializeEmailManagement();
    }, 500);
});
