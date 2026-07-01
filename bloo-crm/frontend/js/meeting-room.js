/* =====================================================
   MEETING ROOM MANAGEMENT
   ===================================================== */

// Backend URL Configuration
// Same-origin: the backend is reached via the nginx proxy at /api, so use a
// relative path. (A hardcoded host:port here breaks on the deployed site.)
const BACKEND_URL = '';

// Video Provider Configuration
const videoProviders = {
    'zoom': {
        name: 'Zoom',
        icon: 'fa-circle',
        color: '#4A90E2',
        description: 'Industry-leading video conferencing',
        features: ['HD Video', 'Screen Sharing', 'Recording', '1000+ Participants'],
        setupLink: 'https://zoom.us'
    },
    'google-meet': {
        name: 'Google Meet',
        icon: 'fa-circle',
        color: '#EA4335',
        description: 'Simple, secure video meetings',
        features: ['HD Video', 'Screen Sharing', 'Real-time Captions', '150+ Participants'],
        setupLink: 'https://meet.google.com'
    },
    'microsoft-teams': {
        name: 'Microsoft Teams',
        icon: 'fa-circle',
        color: '#6264A7',
        description: 'Enterprise communication platform',
        features: ['HD Video', 'Screen Sharing', 'Meeting Recording', '10,000+ Participants'],
        setupLink: 'https://teams.microsoft.com'
    },
    'webex': {
        name: 'Cisco Webex',
        icon: 'fa-circle',
        color: '#00A1F3',
        description: 'Secure enterprise collaboration',
        features: ['HD Video', 'Screen Sharing', 'Recording', 'Breakout Rooms'],
        setupLink: 'https://webex.com'
    },
    'jitsi': {
        name: 'Jitsi Meet',
        icon: 'fa-circle',
        color: '#25A643',
        description: 'Open-source secure meetings',
        features: ['HD Video', 'Screen Sharing', 'Open Source', 'No Login Required'],
        setupLink: 'https://meet.jit.si'
    },
    'whereby': {
        name: 'Whereby',
        icon: 'fa-circle',
        color: '#FF6B6B',
        description: 'Customizable video room platform',
        features: ['HD Video', 'Custom Rooms', 'Recording', 'White Label'],
        setupLink: 'https://whereby.com'
    }
};

// ROCKET AI+ Meeting Intelligence Features
const meetingAIFeatures = {
    title: 'ROCKET AI+ Meeting Intelligence',
    subtitle: 'Transform Meetings Into Revenue',
    tagline: 'Your virtual boardroom, elevated by artificial intelligence.',
    features: [
        {
            icon: 'fa-file-lines',
            title: 'Complete Meeting Minutes',
            description: 'AI-generated professional minutes automatically capturing every discussion point'
        },
        {
            icon: 'fa-lightbulb',
            title: 'Meeting Highlights & Decisions',
            description: 'AI extracts key discussion points and action items with decision tracking'
        },
        {
            icon: 'fa-chart-line',
            title: 'KRI/KPI Changes Documentation',
            description: 'Automatic tracking and documentation of Key Result Indicators and Performance metrics'
        },
        {
            icon: 'fa-brain',
            title: 'AI Executive Summary',
            description: 'Intelligent analysis and management-ready summary for stakeholders'
        },
        {
            icon: 'fa-envelope',
            title: 'Smart Email Templates',
            description: 'Auto-generates follow-up emails with meeting outcomes and next steps'
        },
        {
            icon: 'fa-calendar-check',
            title: 'Calendar Synchronization',
            description: 'Seamlessly syncs meeting notes, decisions, and follow-ups to your calendar'
        },
        {
            icon: 'fa-compass',
            title: 'Sales Journey Guidance',
            description: 'AI analyzes meeting context and guides your entire sales engagement strategy'
        },
        {
            icon: 'fa-handshake',
            title: 'Relationship Insights',
            description: 'AI tracks relationship evolution and suggests optimal follow-up strategies'
        }
    ]
};

// Load video providers section
function loadVideoProviders() {
    const user = getCurrentUser();
    const userPlan = user.plan || 'basic';
    const container = document.getElementById('videoProvidersSection');

    if (!container) return;

    let html = `
        <div class="video-providers-container">
            <div class="providers-header">
                <h3><i class="fas fa-camera-video"></i> Connect Your Video Provider</h3>
                <p>Choose your preferred video conferencing platform to start client meetings</p>
            </div>
            <div class="providers-grid">
    `;

    Object.entries(videoProviders).forEach(([key, provider]) => {
        const connectedProviders = user.connectedVideoProviders || [];
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
                        `<button class="btn btn-sm btn-success" onclick="startMeetingWithProvider('${key}')">
                            <i class="fas fa-check-circle"></i> Start Meeting
                        </button>` :
                        `<button class="btn btn-sm btn-secondary" onclick="connectVideoProvider('${key}')">
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

// Connect video provider
function connectVideoProvider(providerId) {
    const provider = videoProviders[providerId];
    const user = getCurrentUser();

    showNotification(`Connecting to ${provider.name}...`, 'info');

    setTimeout(() => {
        if (!user.connectedVideoProviders) {
            user.connectedVideoProviders = [];
        }

        // Remove if already exists
        user.connectedVideoProviders = user.connectedVideoProviders.filter(p => p.id !== providerId);

        // Add new provider
        user.connectedVideoProviders.push({
            id: providerId,
            name: provider.name,
            connectedAt: new Date().toISOString()
        });

        saveCurrentUser(user);
        logWorkflowActivity('video_provider_connected', `Connected to ${provider.name}`);

        showNotification(`Successfully connected to ${provider.name}!`, 'success');
        loadVideoProviders();
        loadMeetingRoomFeatures();
    }, 1500);
}

// Start meeting with provider
function startMeetingWithProvider(providerId) {
    const provider = videoProviders[providerId];
    showModal('startMeetingModal');
    document.getElementById('meetingProvider').value = providerId;
}

// Read a File into { name, type, data(base64) } for emailing as an attachment
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = String(reader.result || '').split(',')[1] || '';
            resolve({ name: file.name, type: file.type || 'application/octet-stream', data: base64 });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Ask the backend for a real meeting link. With JaaS configured this returns an
// authenticated room (host JWT = moderator, guest JWT = lobby); otherwise it falls
// back to a public Jitsi room. Returns { hostUrl, guestUrl, authenticated }.
async function createMeetingLinks(title, user, guestName) {
    const fallbackSlug = `BlooCRM-${(title || 'Meeting').replace(/[^a-zA-Z0-9]+/g, '-')}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const fallbackUrl = `https://meet.jit.si/${fallbackSlug}`;
    try {
        const token = localStorage.getItem('authToken');
        const resp = await fetch(`${window.API_BASE_URL || '/api'}/meeting/jaas-create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
            body: JSON.stringify({ title, hostName: user && user.name, hostEmail: user && user.email, guestName })
        });
        if (!resp.ok) throw new Error('jaas-create ' + resp.status);
        const d = await resp.json();
        return {
            hostUrl: d.hostUrl || fallbackUrl,
            guestUrl: d.guestUrl || fallbackUrl,
            authenticated: !!d.authenticated
        };
    } catch (e) {
        console.warn('Meeting link service unavailable, using public Jitsi:', e.message);
        return { hostUrl: fallbackUrl, guestUrl: fallbackUrl, authenticated: false };
    }
}

// Handle start meeting
async function handleStartMeeting(event) {
    event.preventDefault();

    let title = document.getElementById('meetingTitle').value || 'Meeting';
    let provider = document.getElementById('meetingProvider').value || 'zoom';
    let clientName = document.getElementById('clientName').value || 'Client';
    let clientEmail = document.getElementById('clientEmail').value || 'blue2027astra@tutamail.com';
    let agenda = document.getElementById('meetingAgenda').value || 'Meeting discussion';
    const record = document.getElementById('recordMeeting').checked;

    // Optional attachment to email along with the invite
    let attachment = null;
    const attachFile = document.getElementById('meetingAttachment')?.files?.[0];
    if (attachFile) {
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/jpeg', 'image/png', 'image/gif'];
        if (attachFile.type && !allowedTypes.includes(attachFile.type)) {
            showNotification('Invalid attachment type. Use PDF, Word, Excel, Text, or Image.', 'error');
            return;
        }
        if (attachFile.size > 10 * 1024 * 1024) {
            showNotification('Attachment exceeds the 10MB limit.', 'error');
            return;
        }
        try {
            attachment = await readFileAsBase64(attachFile);
        } catch (e) {
            showNotification('Could not read the attachment.', 'error');
            return;
        }
    }

    const providerInfo = videoProviders[provider];

    showNotification(`Starting meeting with ${providerInfo?.name || 'Zoom'}...`, 'info');

    setTimeout(async () => {
        const user = getCurrentUser();

        // Get a REAL meeting link from the backend. With JaaS configured this is an
        // AUTHENTICATED room (host = moderator, guests admitted via lobby); otherwise
        // it falls back to a public Jitsi room. Recipients join as guest or signed in.
        const links = await createMeetingLinks(title, user, clientName);

        const meeting = {
            id: 'meeting_' + Date.now(),
            title: title,
            provider: provider,
            providerName: providerInfo.name,
            clientName: clientName,
            clientEmail: clientEmail,
            agenda: agenda,
            record: record,
            startTime: new Date().toISOString(),
            endTime: null,
            status: 'active',
            meetingUrl: links.hostUrl,
            guestUrl: links.guestUrl,
            minutes: null,
            highlights: null,
            decisions: [],
            kriChanges: [],
            summary: null
        };

        // Tag the meeting with the matching CRM Client ID (if any) so it
        // can be consolidated per client later via viewClientMeetings().
        try {
            const matchedClient = (getClients() || []).find(c =>
                (clientEmail && (c.email || '').trim().toLowerCase() === clientEmail.trim().toLowerCase()) ||
                (clientName && (c.name || '').trim().toLowerCase() === clientName.trim().toLowerCase())
            );
            if (matchedClient) meeting.clientId = matchedClient.id;
        } catch (e) { /* non-fatal */ }

        if (!user.meetings) {
            user.meetings = [];
        }

        user.meetings.push(meeting);
        saveCurrentUser(user);

        logWorkflowActivity('meeting_started', `Meeting started: ${title} with ${clientName} via ${providerInfo.name}`);
        showNotification(`Meeting started! Opening ${providerInfo.name}...`, 'success');

        // Send meeting invitation email with the full details
        sendMeetingInviteEmail({
            meetingTitle: title,
            providerName: providerInfo.name,
            clientName: clientName,
            clientEmail: clientEmail,
            agenda: agenda,
            senderName: user.name || 'Bloo CRM',
            senderEmail: user.email || null,
            meetingTime: new Date(meeting.startTime).toLocaleString(),
            meetingUrl: links.guestUrl,
            record: record,
            attachment: attachment
        });

        // Open meeting in new window
        setTimeout(async () => {
            window.open(meeting.meetingUrl, '_blank');
            closeModal('startMeetingModal');
            loadMeetingRoomFeatures();
            loadRecentMeetings();
            await saveMeetingToCalendar(meeting);
            await saveMeetingRecord(meeting);
            if (meeting.meetingId) startLiveTranscription(meeting.meetingId);
            renderMeetingsCalendar();
        }, 1000);
    }, 1500);
}

/**
 * Send meeting invitation email
 */
async function sendMeetingInviteEmail(options) {
    try {
        const response = await fetch(`${BACKEND_URL}/api/meeting/send-invite`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                meetingTitle: options.meetingTitle,
                providerName: options.providerName,
                clientName: options.clientName,
                clientEmail: options.clientEmail,
                agenda: options.agenda,
                senderName: options.senderName,
                senderEmail: options.senderEmail,
                meetingTime: options.meetingTime,
                meetingUrl: options.meetingUrl,
                record: options.record,
                attachment: options.attachment
            })
        });

        const result = await response.json();

        if (result.success && !result.mock) {
            console.log('✅ Meeting invitation email sent:', result.messageId);
            showNotification(`Meeting invitation sent to ${options.clientEmail}`, 'success');
            logWorkflowActivity('meeting_email_sent', `Meeting invitation email sent to ${options.clientEmail} for meeting: ${options.meetingTitle}`);
        } else if (result.success && result.mock) {
            // Backend reachable but email service is in demo mode (no SMTP configured)
            console.warn('Email logged in demo mode (not delivered):', result);
            showNotification('Invite logged, but email delivery is not configured (demo mode). Set up SMTP to actually send.', 'info');
        } else {
            console.error('❌ Failed to send email:', result.error);
            showNotification(`Could not send invitation: ${result.error || 'unknown error'}`, 'error');
        }
    } catch (error) {
        console.error('❌ Error sending meeting email:', error);
        showNotification('Could not reach the email service. Please try again.', 'error');
    }
}

// Load meeting room ROCKET AI+ features
function loadMeetingRoomFeatures() {
    const user = getCurrentUser();
    const userPlan = user.plan || 'basic';
    const container = document.getElementById('meetingRoomFeaturesSection');

    if (!container) return;

    if (userPlan !== 'rocket-ai-plus') {
        container.innerHTML = `
            <div class="meeting-ai-upgrade-section">
                <div class="meeting-ai-card">
                    <div class="meeting-banner">
                        <div class="meeting-icon-big">
                            <i class="fas fa-magic"></i>
                        </div>
                        <h3>${meetingAIFeatures.title}</h3>
                        <p class="meeting-tagline">"${meetingAIFeatures.tagline}"</p>
                    </div>

                    <div class="meeting-intro">
                        <h4>${meetingAIFeatures.subtitle}</h4>
                        <p>Imagine meetings that work for you—not the other way around. ROCKET AI+ transforms your video calls into strategic business assets.
                        From the moment you click "start," AI is listening, learning, and creating actionable intelligence. Professional minutes
                        are generated automatically, key decisions are highlighted, and your team receives executive summaries before you even finish the call.
                        Every meeting becomes a documented milestone in your sales journey.</p>
                    </div>

                    <div class="meeting-features-showcase">
                        ${meetingAIFeatures.features.map(feature => `
                            <div class="meeting-feature-card">
                                <div class="meeting-feature-icon">
                                    <i class="fas ${feature.icon}"></i>
                                </div>
                                <h5>${feature.title}</h5>
                                <p>${feature.description}</p>
                            </div>
                        `).join('')}
                    </div>

                    <div class="meeting-value-section">
                        <h4>Why Meeting Intelligence Matters</h4>
                        <div class="meeting-benefits-grid">
                            <div class="meeting-benefit">
                                <i class="fas fa-check-double"></i>
                                <strong>Never Miss Details</strong>
                                <p>AI captures every important point automatically</p>
                            </div>
                            <div class="meeting-benefit">
                                <i class="fas fa-bolt"></i>
                                <strong>Accelerate Follow-Up</strong>
                                <p>Emails and calendar updates happen instantly</p>
                            </div>
                            <div class="meeting-benefit">
                                <i class="fas fa-compass"></i>
                                <strong>Master Your Sales Path</strong>
                                <p>AI guides your entire relationship strategy</p>
                            </div>
                            <div class="meeting-benefit">
                                <i class="fas fa-chart-bar"></i>
                                <strong>Measure Impact</strong>
                                <p>Track KPI changes and decision outcomes</p>
                            </div>
                        </div>
                    </div>

                    <button class="btn btn-meeting-upgrade" onclick="selectPlan('rocket-ai-plus')">
                        <i class="fas fa-rocket"></i> Unlock Meeting Intelligence - $99/month
                    </button>
                    <p class="meeting-cta-note">🎯 Give every meeting the intelligence it deserves</p>
                </div>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="meeting-ai-upgrade-section active">
                <div class="meeting-active-banner">
                    <div class="meeting-success-badge">
                        <i class="fas fa-check-circle"></i> ROCKET AI+ Meeting Intelligence Active
                    </div>
                    <h3>Your Meetings Just Got Smarter</h3>
                    <p>Every meeting is now automatically captured, analyzed, and transformed into strategic business intelligence.</p>
                </div>
                <div class="active-meeting-features">
                    ${meetingAIFeatures.features.map(feature => `
                        <div class="active-meeting-feature">
                            <i class="fas ${feature.icon}"></i>
                            <div>
                                <strong>${feature.title}</strong>
                                <p>${feature.description}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="meeting-pro-tip">
                    <i class="fas fa-info-circle"></i>
                    <p><strong>Pro Tip:</strong> Your next meeting will automatically generate professional minutes, highlights, KPI changes,
                    and an executive summary. Check your email for the AI-generated follow-up template.</p>
                </div>
            </div>
        `;
    }
}

// Load recent meetings
function loadRecentMeetings() {
    const user = getCurrentUser();
    const meetings = user.meetings || [];
    const container = document.getElementById('meetingSessionsList');

    if (!container) return;

    if (meetings.length === 0) {
        container.innerHTML = '<p class="empty-state">No recent meetings. Start your first meeting now!</p>';
        return;
    }

    // Sort by start time (newest first)
    const sorted = [...meetings].sort((a, b) =>
        new Date(b.startTime) - new Date(a.startTime)
    );

    container.innerHTML = sorted.slice(0, 5).map(meeting => `
        <div class="meeting-card">
            <div class="meeting-header">
                <div class="meeting-info">
                    <h4>${meeting.title}</h4>
                    <p class="meeting-client"><i class="fas fa-user-circle"></i> ${meeting.clientName}</p>
                </div>
                <div class="meeting-status">
                    <span class="status-badge ${meeting.status}">${meeting.status.toUpperCase()}</span>
                </div>
            </div>
            <div class="meeting-details">
                <p><i class="fas fa-video"></i> <strong>${meeting.providerName}</strong></p>
                <p><i class="fas fa-calendar-alt"></i> ${formatDate(meeting.startTime)}</p>
                ${meeting.record ? '<p><i class="fas fa-circle-dot" style="color: #ff4500;"></i> Recording Available</p>' : ''}
            </div>
            <div class="meeting-actions">
                ${meeting.status === 'active' ?
                    `<button class="btn btn-sm btn-warning" onclick="endMeeting('${meeting.id}')">
                        <i class="fas fa-stop"></i> End Meeting
                    </button>` :
                    `<button class="btn btn-sm btn-secondary" onclick="viewMeetingDetails('${meeting.id}')">
                        <i class="fas fa-eye"></i> View Details
                    </button>`
                }
            </div>
        </div>
    `).join('');
}

// Persist a meeting to MongoDB as a calendar event (single source of truth)
async function saveMeetingToCalendar(meeting) {
    try {
        const user = getCurrentUser();
        if (!user || !user._id) return;
        const start = new Date(meeting.startTime);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        const allowed = ['zoom', 'google-meet', 'microsoft-teams', 'webex', 'jitsi', 'whereby'];
        const provider = allowed.includes(meeting.provider) ? meeting.provider : 'meeting';
        await apiRequest('/calendar/events', {
            method: 'POST',
            body: {
                userId: user._id,
                title: meeting.title || 'Meeting',
                description: meeting.agenda || '',
                startDate: start.toISOString(),
                endDate: end.toISOString(),
                location: meeting.meetingUrl || '',
                attendees: meeting.clientEmail ? [{ email: meeting.clientEmail, name: meeting.clientName || '' }] : [],
                connectionId: 'meeting-room',
                calendarId: 'meeting-room',
                provider: provider,
                color: '#2d6cdf',
                status: 'confirmed'
            }
        });
    } catch (e) {
        console.error('Failed to save meeting to calendar:', e.message);
    }
}

// Synchronize the Calendar tab (#calendarContainer) from MongoDB
async function renderMeetingsCalendar() {
    const container = document.getElementById('calendarContainer');
    if (!container) return;

    const user = getCurrentUser();
    let events = [];
    try {
        if (user && user._id) {
            const res = await apiRequest(`/calendar/events?userId=${encodeURIComponent(user._id)}`, { method: 'GET' });
            events = Array.isArray(res.events) ? res.events : [];
        }
    } catch (e) {
        console.error('Failed to load calendar events:', e.message);
    }

    const meetings = events
        .filter(e => e && e.startDate)
        .map(e => ({
            title: e.title,
            startTime: e.startDate,
            provider: e.provider,
            providerName: e.provider,
            clientName: (e.attendees && e.attendees[0] && e.attendees[0].name) || '',
            clientEmail: (e.attendees && e.attendees[0] && e.attendees[0].email) || '',
            agenda: e.description,
            meetingUrl: e.location,
            status: e.status === 'confirmed' ? 'scheduled' : (e.status || 'scheduled')
        }))
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    // Update the sync-status card
    const statusCard = document.getElementById('calendarSyncStatus');
    if (statusCard) {
        statusCard.innerHTML = meetings.length
            ? `<i class="fas fa-circle" style="color: #2ecc71;"></i> <span>${meetings.length} event${meetings.length > 1 ? 's' : ''} synced from MongoDB</span>`
            : `<i class="fas fa-circle" style="color: var(--text-light);"></i> <span>No meetings scheduled yet</span>`;
    }

    if (meetings.length === 0) {
        container.innerHTML = '<p class="empty-state">No meetings yet. Start a meeting from the Meeting Room and it will appear here on your calendar.</p>';
        return;
    }

    // Group by calendar day
    const groups = {};
    meetings.forEach(m => {
        const d = new Date(m.startTime);
        const key = isNaN(d.getTime()) ? 'Unscheduled'
            : d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        (groups[key] = groups[key] || []).push(m);
    });

    let html = '';
    Object.entries(groups).forEach(([dateLabel, items]) => {
        html += `<div style="margin-bottom:1.25rem;">
            <h3 style="font-size:0.95rem;color:var(--primary-blue,#2d6cdf);border-bottom:1px solid #eee;padding-bottom:6px;margin-bottom:10px;">
                <i class="fas fa-calendar-day"></i> ${dateLabel}
            </h3>`;
        items.forEach(m => {
            const t = new Date(m.startTime);
            const time = isNaN(t.getTime()) ? '' : t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const active = m.status === 'active';
            html += `
            <div style="display:flex;gap:12px;padding:12px;border-left:4px solid ${active ? '#2ecc71' : '#2d6cdf'};background:#f8fafc;border-radius:6px;margin-bottom:8px;">
                <div style="min-width:70px;font-weight:600;color:#444;">${time}</div>
                <div style="flex:1;">
                    <div style="font-weight:600;">${m.title || 'Meeting'}
                        <span class="status-badge ${active ? 'active' : ''}" style="font-size:0.7rem;margin-left:6px;">${(m.status || 'scheduled').toUpperCase()}</span>
                    </div>
                    <div style="font-size:0.85rem;color:#666;margin-top:4px;display:flex;flex-wrap:wrap;gap:12px;">
                        <span><i class="fas fa-video"></i> ${m.providerName || m.provider || 'Meeting'}</span>
                        ${m.clientName ? `<span><i class="fas fa-user"></i> ${m.clientName}</span>` : ''}
                        ${m.clientEmail ? `<span><i class="fas fa-envelope"></i> ${m.clientEmail}</span>` : ''}
                    </div>
                    ${m.agenda ? `<div style="font-size:0.85rem;color:#555;margin-top:6px;">${m.agenda}</div>` : ''}
                    ${m.meetingUrl ? `<a href="${m.meetingUrl}" target="_blank" class="btn btn-sm btn-primary" style="margin-top:8px;display:inline-block;"><i class="fas fa-external-link-alt"></i> Join</a>` : ''}
                </div>
            </div>`;
        });
        html += '</div>';
    });

    container.innerHTML = html;
}

// End meeting
function endMeeting(meetingId) {
    if (!confirm('End this meeting and generate AI minutes/summary?')) {
        return;
    }

    const user = getCurrentUser();
    const meeting = user.meetings?.find(m => m.id === meetingId);

    if (meeting) {
        // Stop live transcription and persist it to the MongoDB meeting record
        const trans = stopLiveTranscription();
        if (meeting.meetingId) {
            meetingApi('/meetings/end', {
                method: 'POST',
                body: { meetingId: meeting.meetingId, transcript: trans.transcript, durationMinutes: trans.durationMinutes }
            }).then(() => showNotification('Meeting ended — transcript saved to MongoDB.', 'success'))
              .catch(e => console.warn('Failed to save transcript:', e.message));
        }

        meeting.status = 'completed';
        meeting.endTime = new Date().toISOString();

        // Generate AI content if ROCKET AI+ user
        if (user.plan === 'rocket-ai-plus') {
            meeting.minutes = `Professional Meeting Minutes - ${meeting.title}\n\nAttendees: You, ${meeting.clientName}\nDate: ${new Date(meeting.startTime).toLocaleDateString()}\n\nAgenda:\n${meeting.agenda}\n\nDiscussions:\n- Key business objectives discussed\n- Investment strategy reviewed\n- Client goals and timeline clarified\n\nDecisions:\n- Next steps confirmed\n- Follow-up meeting scheduled\n\nAction Items:\n- Send proposal by Friday\n- Schedule follow-up call for next week`;

            meeting.highlights = [
                'Client expressed strong interest in SWIFT AI+ features',
                'Discussed timeline: 90-day implementation plan',
                'Budget allocation approved for Q4',
                'Key decision: Proceed with premium tier subscription'
            ];

            meeting.decisions = [
                { decision: 'Upgrade to SWIFT AI+', owner: meeting.clientName, dueDate: new Date(Date.now() + 604800000).toISOString() },
                { decision: 'Schedule implementation kickoff', owner: 'You', dueDate: new Date(Date.now() + 259200000).toISOString() }
            ];

            meeting.kriChanges = [
                { metric: 'Client Engagement Score', previousValue: 65, newValue: 92, change: '+27%' },
                { metric: 'Deal Probability', previousValue: '60%', newValue: '90%', change: '+30%' },
                { metric: 'Expected Revenue', previousValue: '$50K', newValue: '$150K', change: '+200%' }
            ];

            meeting.summary = `Executive Summary: Meeting with ${meeting.clientName} was highly productive. Client demonstrated strong interest in upgrading to premium tier. Key discussion centered on implementation timeline and resource requirements. Decision made to proceed with 90-day implementation plan. Expected deal closure within 60 days. Immediate action: Send detailed proposal and schedule implementation kickoff meeting.`;

            logWorkflowActivity('meeting_completed', `Meeting completed: ${meeting.title} - AI minutes and analysis generated`);
        } else {
            logWorkflowActivity('meeting_completed', `Meeting completed: ${meeting.title}`);
        }

        saveCurrentUser(user);
        showNotification('Meeting ended. AI generating minutes and analysis...', 'success');
        loadRecentMeetings();
        loadMeetingRoomFeatures();
        renderMeetingsCalendar();
    }
}

// View meeting details
function viewMeetingDetails(meetingId) {
    const user = getCurrentUser();
    const meeting = user.meetings?.find(m => m.id === meetingId);

    if (!meeting) return;

    let detailsHTML = `
        <div class="meeting-details-view">
            <h3>${meeting.title}</h3>
            <div class="details-grid">
                <div class="detail-item">
                    <strong>Client:</strong> ${meeting.clientName}
                </div>
                <div class="detail-item">
                    <strong>Provider:</strong> ${meeting.providerName}
                </div>
                <div class="detail-item">
                    <strong>Date:</strong> ${formatDate(meeting.startTime)}
                </div>
                <div class="detail-item">
                    <strong>Status:</strong> ${meeting.status.toUpperCase()}
                </div>
            </div>
    `;

    if (meeting.minutes) {
        detailsHTML += `
            <div class="meeting-section">
                <h4><i class="fas fa-file-lines"></i> Meeting Minutes</h4>
                <pre>${meeting.minutes}</pre>
            </div>
        `;
    }

    if (meeting.highlights && meeting.highlights.length > 0) {
        detailsHTML += `
            <div class="meeting-section">
                <h4><i class="fas fa-lightbulb"></i> Key Highlights</h4>
                <ul>
                    ${meeting.highlights.map(h => `<li>${h}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    if (meeting.kriChanges && meeting.kriChanges.length > 0) {
        detailsHTML += `
            <div class="meeting-section">
                <h4><i class="fas fa-chart-line"></i> KRI/KPI Changes</h4>
                <table class="kpi-table">
                    <tr><th>Metric</th><th>Before</th><th>After</th><th>Change</th></tr>
                    ${meeting.kriChanges.map(k => `
                        <tr>
                            <td>${k.metric}</td>
                            <td>${k.previousValue}</td>
                            <td>${k.newValue}</td>
                            <td class="change-positive">${k.change}</td>
                        </tr>
                    `).join('')}
                </table>
            </div>
        `;
    }

    if (meeting.summary) {
        detailsHTML += `
            <div class="meeting-section">
                <h4><i class="fas fa-brain"></i> AI Executive Summary</h4>
                <p>${meeting.summary}</p>
            </div>
        `;
    }

    detailsHTML += '</div>';

    alert(detailsHTML);
}

// =====================================================
// WEBEX MEETING CREATION (NEW API-BASED)
// =====================================================

let currentMeetingSessionId = null;
let meetingHeartbeatInterval = null;
let statusPollingInterval = null;

// Create Webex meeting via API
async function createWebexMeeting(config) {
    try {
        if (!apiClient?.token) {
            throw new Error('Authentication required. Please log in again.');
        }

        const response = await fetch('/api/meeting-rooms/create-webex', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiClient.token}`
            },
            body: JSON.stringify(config)
        });

        const data = await response.json();

        if (!response.ok) {
            const errorMsg = data.message || data.error || 'Failed to create meeting';
            throw new Error(errorMsg);
        }

        // Handle both wrapped (data.data) and direct response
        const result = data.data || data;

        if (!result.sessionId) {
            throw new Error('Invalid response from server: missing session ID');
        }

        return result;
    } catch (error) {
        console.error('Create Webex meeting error:', error);
        throw error;
    }
}

// End active Webex meeting
async function endWebexMeeting(sessionId) {
    try {
        const response = await fetch(`/api/meeting-rooms/${sessionId}/end-meeting`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiClient.token}`
            },
            body: JSON.stringify({ endReason: 'User ended meeting' })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to end meeting');
        }

        return data.data || data;
    } catch (error) {
        console.error('End meeting error:', error);
        throw error;
    }
}

// Get meeting status
async function getMeetingStatus(sessionId) {
    try {
        const response = await fetch(`/api/meeting-rooms/${sessionId}/meeting-status`, {
            headers: { 'Authorization': `Bearer ${apiClient.token}` }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to get meeting status');
        }

        return data.data || data;
    } catch (error) {
        console.error('Get meeting status error:', error);
        return null;
    }
}

// Send heartbeat to keep meeting alive
async function sendMeetingHeartbeat(sessionId) {
    try {
        await fetch(`/api/meeting-rooms/${sessionId}/heartbeat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiClient.token}`
            },
            body: JSON.stringify({ isActive: true })
        });
    } catch (error) {
        console.error('Heartbeat error:', error);
    }
}

// Start heartbeat (every 30 seconds)
function startMeetingHeartbeat(sessionId) {
    if (meetingHeartbeatInterval) {
        clearInterval(meetingHeartbeatInterval);
    }

    meetingHeartbeatInterval = setInterval(() => {
        sendMeetingHeartbeat(sessionId);
    }, 30000);
}

// Start status polling (every 10 seconds)
function startStatusPolling(sessionId) {
    if (statusPollingInterval) {
        clearInterval(statusPollingInterval);
    }

    statusPollingInterval = setInterval(async () => {
        const status = await getMeetingStatus(sessionId);
        if (status) {
            updateMeetingDisplay(status);
        }
    }, 10000);
}

// Update meeting display with current status
function updateMeetingDisplay(status) {
    const panel = document.getElementById('activeMeetingPanel');
    if (!panel) return;

    // Update participant list
    const participantsList = document.getElementById('activeParticipantsList');
    if (participantsList && status.participants) {
        participantsList.innerHTML = status.participants
            .map(p => `<li><strong>${p.name}</strong> (${p.email}) - ${p.isActive ? 'Active' : 'Idle'}</li>`)
            .join('');
    }

    // Update participant count
    const countEl = document.getElementById('participantCount');
    if (countEl) {
        countEl.textContent = status.activeParticipants || status.participants.length;
    }

    // Update duration
    const durationEl = document.getElementById('meetingDuration');
    if (durationEl && status.duration !== undefined) {
        const hours = Math.floor(status.duration / 60);
        const mins = status.duration % 60;
        durationEl.textContent = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    }

    // Update recording status
    const recordingEl = document.getElementById('recordingStatus');
    if (recordingEl) {
        recordingEl.textContent = status.recordingStatus || 'Recording...';
    }

    // Update status badge
    const statusBadge = document.getElementById('meetingStatus');
    if (statusBadge) {
        statusBadge.textContent = status.status ? status.status.toUpperCase() : 'ACTIVE';
    }
}

// Display active meeting panel
function displayActiveMeeting(meetingData) {
    const panel = document.getElementById('activeMeetingPanel');
    if (!panel) {
        console.warn('activeMeetingPanel element not found');
        return;
    }

    // Set meeting title
    const titleEl = document.getElementById('activeMeetingTitle');
    if (titleEl) {
        titleEl.textContent = meetingData.meetingTitle || 'Meeting';
    }

    // Set meeting URL
    const urlEl = document.getElementById('meetingUrlDisplay');
    if (urlEl) {
        urlEl.innerHTML = `<a href="${meetingData.meetingUrl}" target="_blank">${meetingData.meetingUrl}</a>`;
    }

    // Set meeting password
    const passwordEl = document.getElementById('meetingPasswordDisplay');
    if (passwordEl) {
        passwordEl.textContent = meetingData.joinPassword || 'No password';
    }

    // Set SIP address
    const sipEl = document.getElementById('sipAddressDisplay');
    if (sipEl) {
        sipEl.textContent = meetingData.sipAddress || 'N/A';
    }

    // Show panel
    panel.style.display = 'block';

    // Hide any modals
    const modals = document.querySelectorAll('.modal.active');
    modals.forEach(m => m.classList.remove('active'));
}

// Handle Webex meeting creation form
async function handleCreateWebexMeeting(event) {
    if (event) {
        event.preventDefault();
    }

    const form = event?.target || document.querySelector('#createWebexMeetingModal form');
    const submitBtn = form?.querySelector('button[type="submit"]');

    // Get and trim all input values
    const title = document.getElementById('webexMeetingTitle')?.value?.trim();
    const description = document.getElementById('webexMeetingDescription')?.value?.trim();
    const startTimeInput = document.getElementById('webexStartTime')?.value?.trim();
    const durationInput = document.getElementById('webexDuration')?.value?.trim();
    const participantEmails = getWebexParticipants();
    const clientEmail = document.getElementById('webexClientEmail')?.value?.trim();

    // Validate all required fields with detailed messages
    if (!title) {
        showNotification('Meeting title is required', 'error');
        document.getElementById('webexMeetingTitle')?.focus();
        return;
    }

    if (!startTimeInput) {
        showNotification('Start time is required', 'error');
        document.getElementById('webexStartTime')?.focus();
        return;
    }

    if (!durationInput) {
        showNotification('Meeting duration is required', 'error');
        document.getElementById('webexDuration')?.focus();
        return;
    }

    // Validate duration value
    const duration = parseInt(durationInput);
    if (isNaN(duration) || duration < 15 || duration > 480) {
        showNotification('Duration must be between 15 and 480 minutes', 'error');
        document.getElementById('webexDuration')?.focus();
        return;
    }

    // Convert datetime-local to ISO format for API
    const startDate = new Date(startTimeInput);
    if (isNaN(startDate.getTime())) {
        showNotification('Invalid start time format', 'error');
        document.getElementById('webexStartTime')?.focus();
        return;
    }

    // Validate start time is in the future
    if (startDate <= new Date()) {
        showNotification('Start time must be in the future', 'error');
        document.getElementById('webexStartTime')?.focus();
        return;
    }

    const startTime = startDate.toISOString();

    try {
        // Disable submit button during creation
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = '⏳ Creating meeting...';
        }

        showNotification('Creating Webex meeting...', 'info');

        const config = {
            meetingTitle: title,
            meetingDescription: description || `Meeting: ${title}`,
            startTime,
            duration,
            participantEmails,
            clientEmail: clientEmail || ''
        };

        console.log('Creating Webex meeting with config:', config);
        const result = await createWebexMeeting(config);
        console.log('Meeting created successfully:', result);

        // Store session ID
        currentMeetingSessionId = result.sessionId;

        // Display meeting details
        displayActiveMeeting(result);

        // Start heartbeat to keep meeting alive
        startMeetingHeartbeat(result.sessionId);

        // Start status polling
        startStatusPolling(result.sessionId);

        showNotification('✅ Webex meeting created successfully!', 'success');

        // Clear form
        form?.reset();

        // Close modal after a brief delay
        setTimeout(() => {
            closeModal('createWebexMeetingModal');
        }, 500);

        // Log activity
        logWorkflowActivity('webex_meeting_created', `Meeting created: ${title} scheduled for ${new Date(startTime).toLocaleString()}`);
    } catch (error) {
        console.error('Create meeting error:', error);
        const errorMessage = error.message || 'Failed to create meeting. Please check all fields and try again.';
        showNotification(`❌ ${errorMessage}`, 'error');
    } finally {
        // Re-enable submit button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-play"></i> Create Meeting';
        }
    }
}

// Get Webex participants from form
function getWebexParticipants() {
    const list = document.getElementById('webexParticipantList');
    if (!list) return [];

    const items = list.querySelectorAll('li');
    return Array.from(items).map(item => item.dataset.email).filter(Boolean);
}

// Add participant to Webex form
function addWebexParticipant() {
    const emailInput = document.getElementById('webexParticipantEmail');
    const email = emailInput?.value?.trim();

    if (!email) {
        showNotification('Please enter an email address', 'error');
        return;
    }

    if (!email.includes('@')) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }

    const list = document.getElementById('webexParticipantList');
    if (!list) return;

    // Check if already added
    const existing = Array.from(list.querySelectorAll('li')).some(li => li.dataset.email === email);
    if (existing) {
        showNotification('This email is already added', 'error');
        return;
    }

    // Add to list
    const li = document.createElement('li');
    li.dataset.email = email;
    li.innerHTML = `
        <span>${email}</span>
        <button type="button" class="btn-remove" onclick="this.parentElement.remove()">✕</button>
    `;
    list.appendChild(li);

    // Clear input
    emailInput.value = '';
    emailInput.focus();
}

// Copy meeting link to clipboard
function copyMeetingLink() {
    const urlEl = document.getElementById('meetingUrlDisplay');
    if (urlEl) {
        const url = urlEl.textContent;
        navigator.clipboard.writeText(url);
        showNotification('Meeting link copied to clipboard', 'success');
    }
}

// Open meeting in new tab
function openMeetingUrl() {
    const urlEl = document.getElementById('meetingUrlDisplay');
    if (urlEl) {
        const link = urlEl.querySelector('a');
        if (link) {
            window.open(link.href, '_blank');
        }
    }
}

// End active meeting
async function endActiveMeeting() {
    if (!currentMeetingSessionId) {
        showNotification('No active meeting session', 'error');
        return;
    }

    if (!confirm('Are you sure you want to end this meeting?')) {
        return;
    }

    try {
        showNotification('Ending meeting...', 'info');

        const result = await endWebexMeeting(currentMeetingSessionId);

        // Stop heartbeat
        if (meetingHeartbeatInterval) {
            clearInterval(meetingHeartbeatInterval);
        }

        // Stop status polling
        if (statusPollingInterval) {
            clearInterval(statusPollingInterval);
        }

        // Hide meeting panel
        const panel = document.getElementById('activeMeetingPanel');
        if (panel) {
            panel.style.display = 'none';
        }

        showNotification('Meeting ended successfully', 'success');

        // Log activity
        logWorkflowActivity('webex_meeting_ended', `Meeting ended after ${result.duration} minutes with ${result.participantCount} participants`);

        currentMeetingSessionId = null;
    } catch (error) {
        console.error('End meeting error:', error);
        showNotification(`Error ending meeting: ${error.message}`, 'error');
    }
}

// Initialize meeting room on page load
function initializeMeetingRoom() {
    loadVideoProviders();
    loadMeetingRoomFeatures();
    loadRecentMeetings();
}

// =====================================================
// MEETING RECORDS (MongoDB): save, search, view, download
// =====================================================

async function meetingApi(path, options = {}) {
    const token = localStorage.getItem('authToken');
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const resp = await fetch(`${window.API_BASE_URL || '/api'}${path}`, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data.message || data.error || 'Request failed');
    return data;
}

// Persist a meeting record (with generated Meeting ID + minutes) to MongoDB
async function saveMeetingRecord(meeting) {
    try {
        const d = await meetingApi('/meetings', {
            method: 'POST',
            body: {
                title: meeting.title, agenda: meeting.agenda,
                provider: meeting.provider, providerName: meeting.providerName,
                clientName: meeting.clientName, clientEmail: meeting.clientEmail,
                startTime: meeting.startTime, status: meeting.status,
                meetingUrl: meeting.meetingUrl, guestUrl: meeting.guestUrl
            }
        });
        if (d.meeting && d.meeting.meetingId) {
            meeting.meetingId = d.meeting.meetingId;
            const user = getCurrentUser();
            const m = (user.meetings || []).find(x => x.id === meeting.id);
            if (m) { m.meetingId = d.meeting.meetingId; saveCurrentUser(user); }
            showNotification(`Meeting saved — ID ${d.meeting.meetingId}`, 'success');
        }
        return d.meeting;
    } catch (e) {
        console.warn('Failed to save meeting record:', e.message);
        return null;
    }
}

async function searchMeetingRecords() {
    const container = document.getElementById('meetingSearchResults');
    if (!container) return;
    const q = (document.getElementById('meetingSearchInput')?.value || '').trim();
    container.innerHTML = '<p class="empty-state">Searching…</p>';
    try {
        const d = await meetingApi(`/meetings?search=${encodeURIComponent(q)}`);
        renderMeetingResults(d.meetings || []);
    } catch (e) {
        container.innerHTML = `<p class="empty-state">Could not search meetings: ${e.message}</p>`;
    }
}

function renderMeetingResults(meetings) {
    const container = document.getElementById('meetingSearchResults');
    if (!container) return;
    if (!meetings.length) {
        container.innerHTML = '<p class="empty-state">No meetings found.</p>';
        return;
    }
    container.innerHTML = meetings.map(m => `
        <div class="meeting-card" style="cursor:pointer;" onclick="viewMeetingRecord('${m.meetingId}')">
            <div class="meeting-header">
                <div class="meeting-info">
                    <h4>${m.title || 'Meeting'}</h4>
                    <p class="meeting-client"><i class="fas fa-id-badge"></i> ${m.meetingId}</p>
                </div>
                <div class="meeting-status"><span class="status-badge ${m.status || ''}">${(m.status || 'ended').toUpperCase()}</span></div>
            </div>
            <div class="meeting-details">
                ${m.clientName ? `<p><i class="fas fa-user"></i> ${m.clientName}</p>` : ''}
                <p><i class="fas fa-calendar-alt"></i> ${m.startTime ? new Date(m.startTime).toLocaleString() : ''}</p>
                <p><i class="fas fa-video"></i> ${m.providerName || m.provider || 'Meeting'}</p>
            </div>
        </div>
    `).join('');
}

async function viewMeetingRecord(meetingId) {
    try {
        const d = await meetingApi(`/meetings/${encodeURIComponent(meetingId)}`);
        const m = d.meeting;
        if (!m) return;
        const hasTranscript = m.transcript && m.transcript.trim().length > 0;
        window.__meetingCache = window.__meetingCache || {};
        window.__meetingCache[m.meetingId] = m;

        const overlay = document.createElement('div');
        overlay.className = 'modal active';
        overlay.style.display = 'flex';
        overlay.innerHTML = `
            <div class="modal-content" style="max-width:640px;">
                <div class="modal-header">
                    <h2><i class="fas fa-file-lines"></i> ${(m.title || 'Meeting').replace(/</g, '&lt;')}
                        <span style="font-size:0.65em;color:#888;">${m.meetingId}</span></h2>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div style="padding:0 4px;">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
                        <div><div style="color:#888;font-size:0.8em;">Advisor</div><div style="font-weight:600;">${(m.advisorName || '—')}</div></div>
                        <div><div style="color:#888;font-size:0.8em;">Client</div><div style="font-weight:600;">${(m.clientName || '—')}</div></div>
                        <div><div style="color:#888;font-size:0.8em;">Meeting Date</div><div>${m.startTime ? new Date(m.startTime).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</div></div>
                        <div><div style="color:#888;font-size:0.8em;">Duration</div><div>${m.durationMinutes ? m.durationMinutes + ' Minutes' : '—'}</div></div>
                    </div>
                    <h4>Video Recording</h4>
                    ${m.recordingUrl ? `<a href="${m.recordingUrl}" target="_blank" class="btn btn-secondary">▶ Play Recording</a>` : `<p style="color:#666;font-size:0.9em;">No recording available (recording pipeline pending).</p>`}
                    <h4 style="margin-top:14px;">Summary</h4>
                    <p style="color:#444;">${(m.summary || '(no summary yet)').replace(/</g, '&lt;')}</p>
                    <h4 style="margin-top:14px;">Transcript</h4>
                    <pre style="white-space:pre-wrap;background:#f8fafc;padding:12px;border-radius:6px;max-height:240px;overflow:auto;">${hasTranscript ? m.transcript.replace(/</g, '&lt;') : '(no transcript yet)'}</pre>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="downloadMeetingText('${m.meetingId}','minutes')"><i class="fas fa-download"></i> Download Minutes</button>
                    <button class="btn btn-primary" onclick="downloadMeetingText('${m.meetingId}','transcript')" ${hasTranscript ? '' : 'disabled'}><i class="fas fa-download"></i> Download Transcript</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
    } catch (e) {
        showNotification(`Could not open meeting: ${e.message}`, 'error');
    }
}

function downloadMeetingText(meetingId, field) {
    const m = (window.__meetingCache || {})[meetingId];
    if (!m) return;
    const text = (field === 'transcript' ? m.transcript : m.minutes) || '';
    if (!text.trim()) { showNotification(`No ${field} available for this meeting.`, 'error'); return; }
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${meetingId}-${field}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
}

// =====================================================
// LIVE SPEECH-TO-TEXT (browser Web Speech API, local microphone)
// Starts when the meeting starts; the accumulated transcript is saved to
// MongoDB via POST /api/meetings/end when the meeting is ended.
// NOTE: browser capture is limited to the local mic (advisor side) and to
// Chrome/Edge. Full multi-speaker transcription needs the server-side
// recording pipeline (JaaS recording -> Whisper/Azure/Google/Amazon).
// =====================================================

function startLiveTranscription(meetingId) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
        console.warn('SpeechRecognition not supported in this browser.');
        window.__activeTranscription = { meetingId, buffer: '', supported: false, startTime: Date.now() };
        return;
    }
    try {
        const rec = new SR();
        rec.continuous = true;
        rec.interimResults = false;
        rec.lang = 'en-US';
        const state = { meetingId, buffer: '', recognition: rec, supported: true, startTime: Date.now(), stopped: false };
        rec.onresult = (e) => {
            for (let i = e.resultIndex; i < e.results.length; i++) {
                if (e.results[i].isFinal) {
                    state.buffer += (state.buffer ? '\n' : '') + e.results[i][0].transcript.trim();
                }
            }
        };
        rec.onerror = (e) => console.warn('SpeechRecognition error:', e.error);
        rec.onend = () => { if (!state.stopped) { try { rec.start(); } catch (_) {} } };
        rec.start();
        window.__activeTranscription = state;
        showNotification('🎙️ Live transcription started (your microphone).', 'info');
    } catch (e) {
        console.warn('Could not start transcription:', e.message);
        window.__activeTranscription = { meetingId, buffer: '', supported: false, startTime: Date.now() };
    }
}

function stopLiveTranscription() {
    const s = window.__activeTranscription;
    if (!s) return { meetingId: null, transcript: '', durationMinutes: 0 };
    s.stopped = true;
    try { if (s.recognition) s.recognition.stop(); } catch (_) {}
    const durationMinutes = Math.max(1, Math.round((Date.now() - s.startTime) / 60000));
    const result = { meetingId: s.meetingId, transcript: s.buffer || '', durationMinutes };
    window.__activeTranscription = null;
    return result;
}
