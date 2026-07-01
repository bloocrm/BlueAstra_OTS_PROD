/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   ONBOARDING — new-hire checklist + welcome email
   ===================================================== */

function openOnbModal() {
    const m = document.getElementById('onbModal');
    const f = m && m.querySelector('form');
    if (f) f.reset();
    if (m) m.classList.add('active');
}
function closeOnbModal() {
    const m = document.getElementById('onbModal');
    if (m) m.classList.remove('active');
}

async function submitOnb(event) {
    event.preventDefault();
    const v = id => (document.getElementById(id)?.value || '').trim();
    const employeeName = v('onbEmployee');
    if (!employeeName) { showNotification('Employee name is required', 'error'); return; }
    try {
        const res = await apiRequest('/onboarding', { method: 'POST', body: {
            employeeName, employeeEmail: v('onbEmail'), startDate: v('onbStart') || undefined
        }});
        showNotification(`Onboarding started — ${res.item.onboardingId}`, 'success');
        closeOnbModal();
        loadOnboarding();
    } catch (e) {
        showNotification(`Could not start: ${e.message}`, 'error');
    }
}

async function loadOnboarding() {
    const list = document.getElementById('onboardingList');
    if (!list) return;
    list.innerHTML = '<p class="empty-state">Loading…</p>';
    try {
        const res = await apiRequest('/onboarding', { method: 'GET' });
        const c = res.counts || {};
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || 0; };
        set('onbInProgress', c.inProgress); set('onbCompleted', c.completed); set('onbTotal', c.total);
        renderOnboarding(res.items || []);
    } catch (e) {
        list.innerHTML = `<p class="empty-state">Could not load: ${e.message}</p>`;
    }
}

function renderOnboarding(items) {
    const list = document.getElementById('onboardingList');
    if (!list) return;
    if (!items.length) { list.innerHTML = '<p class="empty-state">No onboarding in progress.</p>'; return; }
    list.innerHTML = items.map(o => {
        const done = (o.checklist || []).filter(t => t.done).length;
        const total = (o.checklist || []).length;
        const tasks = (o.checklist || []).map((t, i) => `
            <label style="display:flex;align-items:center;gap:8px;font-size:0.88rem;margin:3px 0;cursor:pointer;">
                <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleOnbTask('${o.onboardingId}',${i},this.checked)">
                <span style="${t.done ? 'text-decoration:line-through;color:#999;' : ''}">${escO(t.task)}</span>
            </label>`).join('');
        return `
        <div class="activity-item">
            <div class="activity-icon ${o.status === 'completed' ? 'blue-bg' : 'orange-bg'}"><i class="fas fa-user-plus"></i></div>
            <div class="activity-content" style="flex:1;">
                <div class="activity-title">${escO(o.employeeName)} <span style="font-size:0.75em;color:#888;">${o.onboardingId}</span>
                    <span style="font-size:0.8em;color:#2d6cdf;">${done}/${total} · ${(o.status || '').toUpperCase()}</span></div>
                <div style="margin:6px 0;">${tasks}</div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button class="btn btn-sm btn-primary" onclick="sendWelcomeEmail('${o.onboardingId}')" ${o.employeeEmail ? '' : 'disabled title="No email on file"'}><i class="fas fa-envelope"></i> ${o.welcomeEmailSent ? 'Resend' : 'Send'} Welcome Email</button>
                    <button class="btn btn-sm btn-delete" onclick="deleteOnb('${o.onboardingId}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </div>`;
    }).join('');
}

async function toggleOnbTask(onboardingId, index, done) {
    try {
        await apiRequest(`/onboarding/${onboardingId}/task`, { method: 'PATCH', body: { index, done } });
        loadOnboarding();
    } catch (e) { showNotification(`Update failed: ${e.message}`, 'error'); }
}

async function sendWelcomeEmail(onboardingId) {
    try {
        const res = await apiRequest(`/onboarding/${onboardingId}/welcome-email`, { method: 'POST' });
        showNotification(res.emailed ? 'Welcome email sent.' : 'Logged (demo mode — SMTP not delivering).', res.emailed ? 'success' : 'info');
        loadOnboarding();
    } catch (e) { showNotification(`Could not send: ${e.message}`, 'error'); }
}

async function deleteOnb(onboardingId) {
    if (!confirm('Delete this onboarding record?')) return;
    try { await apiRequest(`/onboarding/${onboardingId}`, { method: 'DELETE' }); loadOnboarding(); }
    catch (e) { showNotification(`Could not delete: ${e.message}`, 'error'); }
}

function escO(t) {
    return String(t || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}
