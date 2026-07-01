/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   EMAIL AND CALENDAR SYNC FUNCTIONALITY
   ===================================================== */

// Email Provider Information
const emailProviders = {
    'mailchimp': {
        name: 'MailChimp',
        description: 'Connect your MailChimp email marketing account',
        info: '<h4>MailChimp Setup:</h4><p>1. Go to your MailChimp account settings</p><p>2. Generate an API key</p><p>3. Paste your API key as the password</p>'
    },
    'gmail': {
        name: 'Gmail',
        description: 'Sync emails from your Gmail account',
        info: '<h4>Gmail Setup:</h4><p>1. Enable "Less secure app access" in your Google Account</p><p>2. Or use an App Password if 2FA is enabled</p><p>3. Use your Gmail email and password/app password</p>'
    },
    'outlook': {
        name: 'Outlook',
        description: 'Connect your Outlook/Microsoft email',
        info: '<h4>Outlook Setup:</h4><p>1. Generate an application password in your Microsoft Account settings</p><p>2. Use your Outlook email and app password</p>'
    },
    'yahoo': {
        name: 'Yahoo Mail',
        description: 'Sync emails from Yahoo Mail',
        info: '<h4>Yahoo Mail Setup:</h4><p>1. Generate an app password in your Yahoo account</p><p>2. Use your Yahoo email and app password</p>'
    },
    'thunderbird': {
        name: 'Thunderbird',
        description: 'Sync from local Thunderbird installation',
        info: '<h4>Thunderbird Setup:</h4><p>1. Configure your email account in Thunderbird</p><p>2. Provide your email address and password</p>'
    },
    'other': {
        name: 'Other (SMTP)',
        description: 'Connect via SMTP/IMAP',
        info: '<h4>SMTP Setup:</h4><p>1. Provide your email address and password</p><p>2. Works with most standard email providers</p>'
    }
};

// Calendar Provider Information
const calendarProviders = {
    'calendly': {
        name: 'Calendly',
        description: 'Sync your Calendly scheduling links and meetings',
        info: '<h4>Calendly Setup:</h4><p>1. Go to Settings > Integrations in Calendly</p><p>2. Generate an API key</p><p>3. Paste your API key as the password</p>'
    },
    'google': {
        name: 'Google Calendar',
        description: 'Sync events from your Google Calendar',
        info: '<h4>Google Calendar Setup:</h4><p>1. Enable Google Calendar API in Google Cloud Console</p><p>2. Generate OAuth credentials</p><p>3. Use your Google email and API key</p>'
    },
    'outlook': {
        name: 'Outlook Calendar',
        description: 'Connect your Outlook/Office 365 calendar',
        info: '<h4>Outlook Calendar Setup:</h4><p>1. Generate an application password in Microsoft Account settings</p><p>2. Use your Outlook email and app password</p>'
    },
    'apple': {
        name: 'Apple Calendar',
        description: 'Sync with Apple iCloud Calendar',
        info: '<h4>Apple Calendar Setup:</h4><p>1. Generate an app-specific password in your Apple ID settings</p><p>2. Use your Apple email and app password</p>'
    },
    'zoom': {
        name: 'Zoom',
        description: 'Sync your Zoom scheduled meetings',
        info: '<h4>Zoom Setup:</h4><p>1. Go to your Zoom account settings</p><p>2. Generate an API key and secret</p><p>3. Paste your API key as the password</p>'
    },
    'other': {
        name: 'Other (iCal)',
        description: 'Connect via iCalendar format',
        info: '<h4>iCal Setup:</h4><p>1. Export your calendar as .ics file</p><p>2. Or provide your iCal feed URL</p>'
    }
};

// Update email provider info
function updateEmailProviderInfo() {
    const provider = document.getElementById('emailProvider').value;
    const infoDiv = document.getElementById('emailProviderInfo');

    if (provider && emailProviders[provider]) {
        infoDiv.innerHTML = emailProviders[provider].info;
        infoDiv.classList.add('show');
    } else {
        infoDiv.classList.remove('show');
    }
}

// Update calendar provider info
function updateCalendarProviderInfo() {
    const provider = document.getElementById('calendarProvider').value;
    const infoDiv = document.getElementById('calendarProviderInfo');

    if (provider && calendarProviders[provider]) {
        infoDiv.innerHTML = calendarProviders[provider].info;
        infoDiv.classList.add('show');
    } else {
        infoDiv.classList.remove('show');
    }
}

// Handle email sync
function handleEmailSync(event) {
    event.preventDefault();

    const provider = document.getElementById('emailProvider').value;
    const email = document.getElementById('emailAddress').value;
    const sync6months = document.getElementById('emailSync6months').checked;

    if (!provider || !email) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    // Show loading state
    showNotification('Syncing emails...', 'info');

    // Simulate sync process
    setTimeout(() => {
        // Save email sync settings
        saveEmailSyncSettings({
            provider: provider,
            email: email,
            sync6months: sync6months,
            syncedAt: new Date().toISOString()
        });

        // Generate sample emails
        generateSampleEmails(provider);

        // Update UI
        updateEmailSyncStatus(provider, email);
        loadSyncedEmails();

        // Log activity
        logWorkflowActivity('email_synced', `Email synced from ${emailProviders[provider].name}`);

        showNotification(`Successfully synced emails from ${emailProviders[provider].name}!`, 'success');
        closeModal('emailSyncModal');
    }, 2000);
}

// Handle calendar sync
function handleCalendarSync(event) {
    event.preventDefault();

    const provider = document.getElementById('calendarProvider').value;
    const email = document.getElementById('calendarEmail').value;
    const sync3months = document.getElementById('calendarSync3months').checked;
    const syncFuture = document.getElementById('calendarSyncFuture').checked;

    if (!provider || !email) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    // Show loading state
    showNotification('Syncing calendar events...', 'info');

    // Simulate sync process
    setTimeout(() => {
        // Save calendar sync settings
        saveCalendarSyncSettings({
            provider: provider,
            email: email,
            sync3months: sync3months,
            syncFuture: syncFuture,
            syncedAt: new Date().toISOString()
        });

        // Generate sample calendar events
        generateSampleCalendarEvents(provider);

        // Update UI
        updateCalendarSyncStatus(provider, email);
        loadSyncedCalendarEvents();

        // Log activity
        logWorkflowActivity('calendar_synced', `Calendar synced from ${calendarProviders[provider].name}`);

        showNotification(`Successfully synced calendar from ${calendarProviders[provider].name}!`, 'success');
        closeModal('calendarSyncModal');
    }, 2000);
}

// Save email sync settings to localStorage
function saveEmailSyncSettings(settings) {
    const user = getCurrentUser();
    user.emailSyncSettings = settings;
    saveCurrentUser(user);
}

// Save calendar sync settings to localStorage
function saveCalendarSyncSettings(settings) {
    const user = getCurrentUser();
    user.calendarSyncSettings = settings;
    saveCurrentUser(user);
}

// Get email sync settings
function getEmailSyncSettings() {
    const user = getCurrentUser();
    return user.emailSyncSettings || null;
}

// Get calendar sync settings
function getCalendarSyncSettings() {
    const user = getCurrentUser();
    return user.calendarSyncSettings || null;
}

// Generate sample emails
function generateSampleEmails(provider) {
    const user = getCurrentUser();

    const sampleEmails = [
        {
            id: 'email1',
            from: 'client@example.com',
            subject: 'Project Update - Q4 Planning',
            preview: 'Hi, I wanted to discuss the Q4 planning for our upcoming project...',
            date: new Date(Date.now() - 86400000).toISOString(),
            read: false,
            provider: provider
        },
        {
            id: 'email2',
            from: 'marketing@company.com',
            subject: 'Campaign Performance Report',
            preview: 'Your latest campaign generated 150 new leads. Here are the details...',
            date: new Date(Date.now() - 172800000).toISOString(),
            read: true,
            provider: provider
        },
        {
            id: 'email3',
            from: 'partner@business.com',
            subject: 'Partnership Proposal',
            preview: 'We are interested in exploring a partnership opportunity with your company...',
            date: new Date(Date.now() - 259200000).toISOString(),
            read: false,
            provider: provider
        }
    ];

    if (!user.emails) {
        user.emails = [];
    }

    user.emails = [...sampleEmails, ...user.emails];
    saveCurrentUser(user);
}

// Generate sample calendar events
function generateSampleCalendarEvents(provider) {
    const user = getCurrentUser();

    const sampleEvents = [
        {
            id: 'event1',
            title: 'Client Meeting - Quarterly Review',
            description: 'Discuss Q3 performance and Q4 planning',
            start: new Date(Date.now() + 86400000).toISOString(),
            end: new Date(Date.now() + 90000000).toISOString(),
            attendees: ['client@example.com', 'you@yourcompany.com'],
            status: 'confirmed',
            busy: true,
            provider: provider
        },
        {
            id: 'event2',
            title: 'Team Standup',
            description: 'Daily team synchronization',
            start: new Date(Date.now() + 3600000).toISOString(),
            end: new Date(Date.now() + 5400000).toISOString(),
            attendees: ['team@company.com'],
            status: 'confirmed',
            busy: true,
            provider: provider
        },
        {
            id: 'event3',
            title: 'Project Deadline',
            description: 'Final submission date for project',
            start: new Date(Date.now() + 604800000).toISOString(),
            end: new Date(Date.now() + 604800000).toISOString(),
            attendees: [],
            status: 'confirmed',
            busy: false,
            provider: provider
        }
    ];

    if (!user.calendarEvents) {
        user.calendarEvents = [];
    }

    user.calendarEvents = [...sampleEvents, ...user.calendarEvents];
    saveCurrentUser(user);
}

// Update email sync status
function updateEmailSyncStatus(provider, email) {
    const statusCard = document.getElementById('emailSyncStatus');
    statusCard.innerHTML = `
        <i class="fas fa-check-circle" style="color: var(--success);"></i>
        <span><strong>${emailProviders[provider].name}</strong> synced (${email})</span>
    `;
    statusCard.classList.add('connected');
}

// Update calendar sync status
function updateCalendarSyncStatus(provider, email) {
    const statusCard = document.getElementById('calendarSyncStatus');
    statusCard.innerHTML = `
        <i class="fas fa-check-circle" style="color: var(--success);"></i>
        <span><strong>${calendarProviders[provider].name}</strong> synced (${email})</span>
    `;
    statusCard.classList.add('connected');
}

// Load synced emails
function loadSyncedEmails() {
    const user = getCurrentUser();
    const emails = user.emails || [];
    const container = document.getElementById('emailContainer');

    if (emails.length === 0) {
        container.innerHTML = '<p class="empty-state">No synced emails yet. Click "Sync Email" to connect your email provider.</p>';
        return;
    }

    container.innerHTML = emails.map(email => `
        <div class="email-item">
            <div class="email-header">
                <div>
                    <div class="email-from">${email.from}</div>
                    <div class="email-subject">${email.subject}</div>
                </div>
                <div class="email-date">${formatDate(email.date)}</div>
            </div>
            <div class="email-preview">${email.preview}</div>
            <span class="email-status ${email.read ? 'read' : 'unread'}">
                ${email.read ? 'Read' : 'Unread'}
            </span>
        </div>
    `).join('');
}

// Load synced calendar events
function loadSyncedCalendarEvents() {
    const user = getCurrentUser();
    const events = user.calendarEvents || [];
    const container = document.getElementById('calendarContainer');

    if (events.length === 0) {
        container.innerHTML = '<p class="empty-state">No synced events yet. Click "Sync Calendar" to connect your calendar provider.</p>';
        return;
    }

    container.innerHTML = events.map(event => {
        const startDate = new Date(event.start);
        const month = startDate.toLocaleString('en-US', { month: 'short' });
        const day = startDate.getDate();
        const time = startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        return `
            <div class="calendar-event ${event.busy ? 'busy' : 'free'}">
                <div class="event-time">
                    <div class="event-time-date">${month} ${day}</div>
                    <div class="event-time-hour">${time}</div>
                </div>
                <div class="event-details">
                    <h3>${event.title}</h3>
                    <div class="event-description">${event.description}</div>
                    ${event.attendees && event.attendees.length > 0 ? `
                        <div class="event-attendees">
                            <i class="fas fa-users"></i>
                            <span>${event.attendees.join(', ')}</span>
                        </div>
                    ` : ''}
                </div>
                <div class="event-actions">
                    <button class="event-btn event-btn-accept" onclick="acceptEvent('${event.id}')">
                        <i class="fas fa-check"></i> Accept
                    </button>
                    <button class="event-btn event-btn-decline" onclick="declineEvent('${event.id}')">
                        <i class="fas fa-times"></i> Decline
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Accept event
function acceptEvent(eventId) {
    const user = getCurrentUser();
    const event = user.calendarEvents?.find(e => e.id === eventId);

    if (event) {
        event.status = 'accepted';
        saveCurrentUser(user);
        showNotification('Event accepted!', 'success');
        logWorkflowActivity('event_accepted', `Event accepted: ${event.title}`);
        loadSyncedCalendarEvents();
    }
}

// Decline event
function declineEvent(eventId) {
    const user = getCurrentUser();
    const event = user.calendarEvents?.find(e => e.id === eventId);

    if (event) {
        event.status = 'declined';
        saveCurrentUser(user);
        showNotification('Event declined!', 'success');
        logWorkflowActivity('event_declined', `Event declined: ${event.title}`);
        loadSyncedCalendarEvents();
    }
}

// Initialize sync on page load
function initializeSync() {
    const emailSettings = getEmailSyncSettings();
    const calendarSettings = getCalendarSyncSettings();

    if (emailSettings) {
        updateEmailSyncStatus(emailSettings.provider, emailSettings.email);
        loadSyncedEmails();
    }

    if (calendarSettings) {
        updateCalendarSyncStatus(calendarSettings.provider, calendarSettings.email);
        loadSyncedCalendarEvents();
    }
}

/* =====================================================
   ROCKET AI+ EMAIL UPGRADE FEATURES
   ===================================================== */

const emailUpgradeFeatures = {
    title: 'ROCKET AI+ Email Mastery',
    subtitle: 'Transform Your Client Communications',
    tagline: 'Never struggle with emails again. Let AI craft your perfect message.',
    features: [
        {
            icon: 'fa-wand-magic-sparkles',
            title: 'AI Email Crafting',
            description: 'Generate compelling, personalized emails in seconds with AI-powered composition that matches your voice'
        },
        {
            icon: 'fa-arrow-up-right',
            title: 'Smart Cross-Sell Detection',
            description: 'AI identifies ideal cross-sell opportunities in client communications and suggests perfect moments to pitch'
        },
        {
            icon: 'fa-chart-line',
            title: 'Upsell Optimization',
            description: 'Automatic upsell suggestions based on client behavior, life events, and investment patterns'
        },
        {
            icon: 'fa-brain',
            title: 'AI Tone Matching',
            description: 'Write emails that sound authentically like you while maintaining professional impact'
        },
        {
            icon: 'fa-envelope-circle-check',
            title: 'Smart Send Timing',
            description: 'AI learns when your clients are most likely to open and engage with emails'
        },
        {
            icon: 'fa-sparkles',
            title: 'Template Evolution',
            description: 'AI continuously improves email templates based on open rates and client responses'
        },
        {
            icon: 'fa-sync',
            title: 'Multi-Channel Sync',
            description: 'Seamlessly manage emails, SMS, and in-app messages from one unified interface'
        },
        {
            icon: 'fa-handshake',
            title: 'Relationship Intelligence',
            description: 'AI tracks relationship health and suggests when to reach out to dormant clients'
        }
    ]
};

// Load email upgrade section
function loadEmailUpgradeSection() {
    const user = getCurrentUser();
    const userPlan = user.plan || 'basic';
    const container = document.getElementById('emailUpgradeContainer');

    if (!container) return;

    if (userPlan !== 'rocket-ai-plus') {
        container.innerHTML = `
            <div class="email-upgrade-section">
                <div class="email-upgrade-card">
                    <div class="upgrade-banner">
                        <div class="rocket-burst">
                            <i class="fas fa-rocket"></i>
                        </div>
                        <h3>${emailUpgradeFeatures.title}</h3>
                        <p class="upgrade-tagline">"${emailUpgradeFeatures.tagline}"</p>
                    </div>

                    <div class="upgrade-subtitle">
                        <h4>${emailUpgradeFeatures.subtitle}</h4>
                        <p>Imagine never worrying about email composition again. ROCKET AI+ uses advanced language models to understand your clients,
                        craft personalized messages, and identify the perfect moments for meaningful business conversations.</p>
                    </div>

                    <div class="email-features-showcase">
                        ${emailUpgradeFeatures.features.map((feature, index) => `
                            <div class="email-feature-card">
                                <div class="feature-icon">
                                    <i class="fas ${feature.icon}"></i>
                                </div>
                                <div class="feature-content">
                                    <h5>${feature.title}</h5>
                                    <p>${feature.description}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <div class="upgrade-benefits">
                        <h4>Why Email Powers Your Success</h4>
                        <div class="benefits-grid">
                            <div class="benefit-item">
                                <i class="fas fa-clock"></i>
                                <strong>10x Faster</strong>
                                <p>Write strategic emails in minutes, not hours</p>
                            </div>
                            <div class="benefit-item">
                                <i class="fas fa-bullseye"></i>
                                <strong>Higher Engagement</strong>
                                <p>AI-optimized messages = better open rates</p>
                            </div>
                            <div class="benefit-item">
                                <i class="fas fa-coins"></i>
                                <strong>More Revenue</strong>
                                <p>Smart cross-sell = consistent growth</p>
                            </div>
                            <div class="benefit-item">
                                <i class="fas fa-heart"></i>
                                <strong>Stronger Bonds</strong>
                                <p>Personalized touches build lasting relationships</p>
                            </div>
                        </div>
                    </div>

                    <button class="btn btn-rocket-lg" onclick="selectPlan('rocket-ai-plus')">
                        <i class="fas fa-rocket"></i> Unlock ROCKET AI+ Email - $99/month
                    </button>
                    <p class="cta-note">📧 Limited time: Upgrade today and get AI email templates worth $500 free</p>
                </div>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="email-upgrade-section active">
                <div class="email-active-banner">
                    <div class="success-badge">
                        <i class="fas fa-check-circle"></i> ROCKET AI+ Active
                    </div>
                    <h3>Your Email Superpowers Are Unlocked</h3>
                    <p>You now have access to the most advanced AI email capabilities available. Your clients are about to experience unprecedented personalization.</p>
                </div>
                <div class="active-email-features">
                    ${emailUpgradeFeatures.features.map(feature => `
                        <div class="active-feature-item">
                            <i class="fas ${feature.icon}"></i>
                            <div>
                                <strong>${feature.title}</strong>
                                <p>${feature.description}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
}

/* =====================================================
   ROCKET AI+ CALENDAR UPGRADE FEATURES
   ===================================================== */

const calendarUpgradeFeatures = {
    title: 'ROCKET AI+ Calendar Intelligence',
    subtitle: 'The Future of Scheduling & Meeting Management',
    tagline: 'Your calendar should work harder than you do.',
    redCRMFeatures: [
        {
            icon: 'fa-calendar-check',
            title: 'RedCRM Meeting Management',
            description: 'Elegant, intuitive meeting room scheduling with real-time availability and conflict resolution'
        },
        {
            icon: 'fa-comments',
            title: 'RedCRM Messenger',
            description: 'Direct messaging with clients integrated directly into your calendar for seamless communication'
        },
        {
            icon: 'fa-video',
            title: 'One-Click Video Meetings',
            description: 'Instantly launch video conferences with HD quality and screen sharing capabilities'
        },
        {
            icon: 'fa-robot',
            title: 'Automatic Schedule Syncing',
            description: 'AI keeps all your calendars in perfect harmony across devices and platforms'
        },
        {
            icon: 'fa-envelope-open-text',
            title: 'Intelligent Email Coordination',
            description: 'Calendar events automatically generate follow-up emails with meeting notes and action items'
        },
        {
            icon: 'fa-brain',
            title: 'Meeting Insights AI',
            description: 'AI analyzes meeting patterns, client preferences, and suggests optimal meeting times'
        },
        {
            icon: 'fa-bell',
            title: 'Smart Reminders & Prep',
            description: 'Get AI-generated client briefings 15 minutes before each meeting'
        },
        {
            icon: 'fa-chart-area',
            title: 'Meeting ROI Tracking',
            description: 'Measure the impact of each meeting with outcome tracking and follow-up insights'
        }
    ]
};

// Load calendar upgrade section
function loadCalendarUpgradeSection() {
    const user = getCurrentUser();
    const userPlan = user.plan || 'basic';
    const container = document.getElementById('calendarUpgradeContainer');

    if (!container) return;

    if (userPlan !== 'rocket-ai-plus') {
        container.innerHTML = `
            <div class="calendar-upgrade-section">
                <div class="calendar-upgrade-card">
                    <div class="calendar-banner">
                        <div class="calendar-icon-big">
                            <i class="fas fa-calendar-days"></i>
                        </div>
                        <h3>${calendarUpgradeFeatures.title}</h3>
                        <p class="calendar-tagline">"${calendarUpgradeFeatures.tagline}"</p>
                    </div>

                    <div class="calendar-intro">
                        <h4>${calendarUpgradeFeatures.subtitle}</h4>
                        <p>Imagine a world where your calendar doesn't just track meetings—it orchestrates them.
                        ROCKET AI+ introduces <strong>RedCRM</strong>, a sophisticated meeting and messaging ecosystem that transforms how
                        you engage with clients. From the moment a meeting is scheduled to the follow-up conversation,
                        AI ensures you're always prepared, always connected, and always ahead of the game.</p>
                    </div>

                    <div class="redcrm-features-grid">
                        ${calendarUpgradeFeatures.redCRMFeatures.map(feature => `
                            <div class="redcrm-feature-card">
                                <div class="redcrm-icon">
                                    <i class="fas ${feature.icon}"></i>
                                </div>
                                <h5>${feature.title}</h5>
                                <p>${feature.description}</p>
                            </div>
                        `).join('')}
                    </div>

                    <div class="calendar-value-prop">
                        <h4>Stay Ahead of the Game</h4>
                        <div class="value-cards">
                            <div class="value-card">
                                <i class="fas fa-hourglass-end"></i>
                                <strong>Never Miss a Moment</strong>
                                <p>AI scheduling ensures no client request goes unaddressed</p>
                            </div>
                            <div class="value-card">
                                <i class="fas fa-network-wired"></i>
                                <strong>Seamless Connectivity</strong>
                                <p>Meet, message, and follow up without switching apps</p>
                            </div>
                            <div class="value-card">
                                <i class="fas fa-sparkles"></i>
                                <strong>Elevated Experiences</strong>
                                <p>Every client interaction feels personalized and thoughtful</p>
                            </div>
                            <div class="value-card">
                                <i class="fas fa-trophy"></i>
                                <strong>Competitive Edge</strong>
                                <p>Your preparation game will be unmatched in your industry</p>
                            </div>
                        </div>
                    </div>

                    <button class="btn btn-rocket-lg calendar-cta" onclick="selectPlan('rocket-ai-plus')">
                        <i class="fas fa-rocket"></i> Unlock RedCRM & ROCKET AI+ - $99/month
                    </button>
                    <p class="calendar-note">🚀 Start mastering your calendar today. Your clients will notice the difference immediately.</p>
                </div>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="calendar-upgrade-section active">
                <div class="calendar-active-banner">
                    <div class="calendar-success-badge">
                        <i class="fas fa-check-circle"></i> RedCRM & ROCKET AI+ Active
                    </div>
                    <h3>Your Calendar is Now Intelligent</h3>
                    <p>Welcome to the future of scheduling. RedCRM and AI are working together to ensure every meeting creates value and every client feels prioritized.</p>
                </div>
                <div class="active-redcrm-features">
                    ${calendarUpgradeFeatures.redCRMFeatures.map(feature => `
                        <div class="active-redcrm-item">
                            <i class="fas ${feature.icon}"></i>
                            <div>
                                <strong>${feature.title}</strong>
                                <p>${feature.description}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
}
