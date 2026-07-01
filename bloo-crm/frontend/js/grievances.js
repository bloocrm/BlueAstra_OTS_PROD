/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   GRIEVANCE / SUPPORT — MongoDB-backed
   ===================================================== */

function openGrievanceModal() {
    const m = document.getElementById('grievanceModal');
    const f = m && m.querySelector('form');
    if (f) f.reset();
    if (m) m.classList.add('active');
}

function closeGrievanceModal() {
    const m = document.getElementById('grievanceModal');
    if (m) m.classList.remove('active');
}

async function submitGrievance(event) {
    event.preventDefault();
    const name = (document.getElementById('grievanceName').value || '').trim();
    if (!name) { showNotification('Name is required', 'error'); return; }

    const body = {
        name,
        problemType: document.getElementById('grievanceType').value,
        section: document.getElementById('grievanceSection').value,
        description: document.getElementById('grievanceDescription').value
    };

    try {
        const res = await apiRequest('/grievances', { method: 'POST', body });
        showNotification(`Grievance filed — ${res.grievance.grievanceId}`, 'success');
        closeGrievanceModal();
        loadGrievances();
    } catch (e) {
        showNotification(`Could not file grievance: ${e.message}`, 'error');
    }
}

async function loadGrievances() {
    const list = document.getElementById('grievanceList');
    if (!list) return;
    const q = (document.getElementById('grievanceSearch')?.value || '').trim();
    list.innerHTML = '<p class="empty-state">Loading…</p>';
    try {
        const res = await apiRequest(`/grievances?search=${encodeURIComponent(q)}`, { method: 'GET' });
        const c = res.counts || {};
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v || 0; };
        set('grvOpen', c.open); set('grvInProgress', c.inProgress); set('grvResolved', c.resolved); set('grvTotal', c.total);
        renderGrievances(res.grievances || []);
    } catch (e) {
        list.innerHTML = `<p class="empty-state">Could not load grievances: ${e.message}</p>`;
    }
}

function grievanceStatusColor(status) {
    return status === 'resolved' ? 'blue-bg' : status === 'in-progress' ? 'aqua-bg' : 'orange-bg';
}

function renderGrievances(items) {
    const list = document.getElementById('grievanceList');
    if (!list) return;
    if (!items.length) {
        list.innerHTML = '<p class="empty-state">No grievances yet. Click "Add New Complaint" to file one.</p>';
        return;
    }
    list.innerHTML = items.map(g => `
        <div class="activity-item">
            <div class="activity-icon ${grievanceStatusColor(g.status)}"><i class="fas fa-flag"></i></div>
            <div class="activity-content">
                <div class="activity-title">${g.grievanceId} — ${escapeGrv(g.name)}</div>
                <div class="activity-time">
                    ${escapeGrv(g.problemType || 'Complaint')}${g.section ? ' · ' + escapeGrv(g.section) : ''} · ${(g.status || 'open').toUpperCase()}
                    ${g.description ? '<br>' + escapeGrv(g.description) : ''}
                    <br><small>${new Date(g.createdAt).toLocaleString()}</small>
                </div>
            </div>
        </div>
    `).join('');
}

function escapeGrv(t) {
    return String(t || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}
