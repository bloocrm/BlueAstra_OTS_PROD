/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   CLIENT CONSOLIDATION
   View Emails  &  View Meetings  (per client, keyed off Client ID)

   Data flow:
     - If an auth token is present (user logged in), fetch from the backend:
           GET /api/clients/:id/emails
           GET /api/clients/:id/meetings
       The client's email/name are passed as query params so the backend can
       match even when the local client id is not a Mongo _id.
     - If the backend call fails or no token exists, fall back to the local
       (localStorage) consolidation so the feature still works offline.

   Override the API base when frontend and backend are on different origins:
       window.API_BASE_URL = 'http://localhost:5000/api';
   ===================================================== */

const CC_API_BASE = (typeof window !== 'undefined' && window.API_BASE_URL) || '/api';

// --- helpers --------------------------------------------------------------

function _norm(v) {
    return (v === null || v === undefined ? '' : String(v)).trim().toLowerCase();
}

function getClientById(clientId) {
    return (getClients() || []).find(c => String(c.id) === String(clientId)) || null;
}

function _authToken() {
    try { return localStorage.getItem('authToken') || sessionStorage.getItem('authToken'); } catch (e) { return null; }
}

function _backendAvailable() { return !!_authToken(); }

async function _apiGet(path) {
    const token = _authToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(CC_API_BASE + path, { headers });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const json = await res.json();
    return (json && json.data) ? json.data : json;
}

function _clientQuery(client) {
    const qs = new URLSearchParams();
    if (client.email) qs.set('email', client.email);
    if (client.name) qs.set('name', client.name);
    return qs.toString();
}

async function fetchClientEmailsFromApi(client) {
    const data = await _apiGet(`/clients/${encodeURIComponent(client.id)}/emails?${_clientQuery(client)}`);
    return (data && data.emails) || [];
}

async function fetchClientMeetingsFromApi(client) {
    const data = await _apiGet(`/clients/${encodeURIComponent(client.id)}/meetings?${_clientQuery(client)}`);
    return (data && data.meetings) || [];
}

// --- LOCAL fallback consolidation ----------------------------------------

function getClientEmails(clientId) {
    const client = getClientById(clientId);
    if (!client) return [];

    const cid = _norm(clientId);
    const cEmail = _norm(client.email);
    const pool = [];

    try {
        if (window.emailClient && window.emailClient.emails &&
            typeof window.emailClient.emails.values === 'function') {
            pool.push(...Array.from(window.emailClient.emails.values()));
        }
    } catch (e) { /* ignore */ }

    const user = getCurrentUser();
    if (Array.isArray(user.emails)) pool.push(...user.emails);

    if (typeof getCommunications === 'function') {
        getCommunications()
            .filter(c => _norm(c.type) === 'email' || _norm(c.method) === 'email')
            .forEach(c => pool.push({
                id: c.id,
                clientId: c.clientId,
                from: c.from || c.fromEmail || c.contactEmail || '',
                to: c.to || c.toEmail || c.contactEmail || client.email || '',
                subject: c.subject || c.summary || 'Logged email',
                body: c.body || c.content || c.notes || c.details || '',
                date: c.date || c.sentAt || c.createdAt,
                folder: 'logged',
                contactName: c.contactName
            }));
    }

    const seen = new Set();
    const unique = pool.filter(e => {
        const k = (e && e.id !== undefined && e.id !== null) ? String(e.id) : JSON.stringify(e);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });

    const matches = unique.filter(e => {
        if (_norm(e.clientId) && _norm(e.clientId) === cid) return true;
        if (!cEmail) return false;
        const fields = [e.from, e.to, e.cc, e.recipient, e.sender, e.contactEmail];
        return fields.some(f => _norm(f).includes(cEmail));
    });

    matches.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
    return matches;
}

function getClientMeetings(clientId) {
    const client = getClientById(clientId);
    if (!client) return [];

    const cid = _norm(clientId);
    const cEmail = _norm(client.email);
    const cName = _norm(client.name);

    const user = getCurrentUser();
    const meetings = Array.isArray(user.meetings) ? user.meetings : [];

    const matches = meetings.filter(m => {
        if (_norm(m.clientId) && _norm(m.clientId) === cid) return true;
        if (cEmail && _norm(m.clientEmail) === cEmail) return true;
        if (cName && _norm(m.clientName) === cName) return true;
        return false;
    });

    matches.sort((a, b) => new Date(b.startTime || 0) - new Date(a.startTime || 0));
    return matches;
}

// --- VIEW EMAILS ----------------------------------------------------------

async function viewClientEmails(clientId) {
    const client = getClientById(clientId);
    if (!client) { showNotification('Client not found!', 'error'); return; }

    document.getElementById('clientEmailsTitle').textContent = `Emails \u2014 ${client.name}`;
    document.getElementById('clientEmailsSubtitle').textContent =
        `Client ID: ${client.id}  \u2022  ${client.email || 'no email on file'}`;
    const list = document.getElementById('clientEmailsList');
    list.innerHTML = '<p class="empty-state">Loading\u2026</p>';
    showModal('clientEmailsModal');

    let emails = [];
    let source = 'local';
    if (_backendAvailable()) {
        try {
            emails = await fetchClientEmailsFromApi(client);
            source = 'backend';
        } catch (e) {
            console.warn('Email API failed, falling back to local data:', e);
            emails = getClientEmails(clientId);
            source = 'local';
        }
    } else {
        emails = getClientEmails(clientId);
    }
    renderClientEmails(client, emails, source);
}

function renderClientEmails(client, emails, source) {
    const sub = document.getElementById('clientEmailsSubtitle');
    sub.textContent = `Client ID: ${client.id}  \u2022  ${client.email || 'no email on file'}  \u2022  ${emails.length} email(s)  \u2022  source: ${source === 'backend' ? 'database' : 'local'}`;

    const list = document.getElementById('clientEmailsList');
    if (!emails.length) {
        list.innerHTML = `
            <div class="empty-state" style="padding:24px;text-align:center;">
                <i class="fas fa-inbox" style="font-size:32px;opacity:.4;"></i>
                <p>No emails found for this client.</p>
                <p style="font-size:13px;color:var(--text-light);">
                    Emails are matched by Client ID and by this client's email address
                    (${client.email || 'none on file'}).
                </p>
            </div>`;
        return;
    }

    list.innerHTML = emails.map(e => {
        const fromMatch = _norm(client.email) && _norm(e.from).includes(_norm(client.email));
        const dir = fromMatch ? 'From' : 'To';
        const who = fromMatch ? (e.from || e.contactName || '') : (e.to || client.email || '');
        const when = e.date || e.createdAt;
        const snippet = (e.snippet || e.body || '').toString().replace(/<[^>]*>/g, '').slice(0, 140);
        const tag = e.source ? ` \u2022 <span class="cei-folder">${e.source === 'mailbox' ? (e.folder || 'inbox') : e.source}</span>` : (e.folder ? ` \u2022 <span class="cei-folder">${e.folder}</span>` : '');
        return `
            <div class="consolidated-email-item">
                <div class="cei-head">
                    <span class="cei-subject">${e.subject || '(no subject)'}</span>
                    <span class="cei-date">${when ? formatDate(when) : ''}</span>
                </div>
                <div class="cei-meta">${dir}: ${who || '\u2014'}${tag}</div>
                ${snippet ? `<div class="cei-snippet">${snippet}${snippet.length >= 140 ? '\u2026' : ''}</div>` : ''}
            </div>`;
    }).join('');
}

// --- VIEW MEETINGS (shown under Meeting Room) -----------------------------

async function viewClientMeetings(clientId) {
    const client = getClientById(clientId);
    if (!client) { showNotification('Client not found!', 'error'); return; }

    closeModal('clientDetailModal');
    switchView('meetingRoom');

    const panel = document.getElementById('clientMeetingsConsolidated');
    const list = document.getElementById('clientMeetingsConsolidatedList');
    const title = document.getElementById('clientMeetingsConsolidatedTitle');
    if (!panel || !list) return;

    title.innerHTML = `<i class="fas fa-user-clock"></i> Meetings for ${client.name} <span style="font-weight:400;color:var(--text-light);">(ID: ${client.id})</span>`;
    list.innerHTML = '<p class="empty-state">Loading\u2026</p>';
    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

    let meetings = [];
    if (_backendAvailable()) {
        try {
            meetings = await fetchClientMeetingsFromApi(client);
        } catch (e) {
            console.warn('Meetings API failed, falling back to local data:', e);
            meetings = getClientMeetings(clientId);
        }
    } else {
        meetings = getClientMeetings(clientId);
    }

    list.innerHTML = meetings.length
        ? meetings.map(renderClientMeetingCard).join('')
        : `<p class="empty-state">No meetings found for this client yet.</p>`;
}

function clearClientMeetingsFilter() {
    const panel = document.getElementById('clientMeetingsConsolidated');
    if (panel) panel.style.display = 'none';
}

function renderClientMeetingCard(meeting) {
    const status = meeting.status || 'ended';
    return `
        <div class="meeting-card">
            <div class="meeting-header">
                <div class="meeting-info">
                    <h4>${meeting.title || 'Meeting'}</h4>
                    <p class="meeting-client"><i class="fas fa-user-circle"></i> ${meeting.clientName || ''}</p>
                </div>
                <div class="meeting-status">
                    <span class="status-badge ${status}">${String(status).toUpperCase()}</span>
                </div>
            </div>
            <div class="meeting-details">
                <p><i class="fas fa-video"></i> <strong>${meeting.providerName || meeting.provider || ''}</strong></p>
                <p><i class="fas fa-calendar-alt"></i> ${meeting.startTime ? formatDate(meeting.startTime) : ''}</p>
                ${meeting.record ? '<p><i class="fas fa-circle-dot" style="color:#ff4500;"></i> Recording Available</p>' : ''}
            </div>
            <div class="meeting-actions">
                ${status === 'active'
                    ? `<button class="btn btn-sm btn-warning" onclick="endMeeting('${meeting.id}')"><i class="fas fa-stop"></i> End Meeting</button>`
                    : `<button class="btn btn-sm btn-secondary" onclick="viewMeetingDetails('${meeting.id}')"><i class="fas fa-eye"></i> View Details</button>`}
            </div>
        </div>`;
}
