/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   COMPANY POLICIES — create/update + publish to all employees via email
   ===================================================== */

function openPolicyModal(policy) {
    document.getElementById('policyEditId').value = policy ? policy.policyId : '';
    document.getElementById('policyTitle').value = policy ? policy.title : '';
    document.getElementById('policyCategory').value = policy ? (policy.category || '') : '';
    document.getElementById('policyContent').value = policy ? (policy.content || '') : '';
    document.getElementById('policyModalTitle').innerHTML = policy
        ? '<i class="fas fa-book"></i> Edit Policy'
        : '<i class="fas fa-book"></i> Create Policy';
    document.getElementById('policyModal').classList.add('active');
}
function closePolicyModal() {
    document.getElementById('policyModal').classList.remove('active');
}

async function submitPolicy(event) {
    event.preventDefault();
    const id = document.getElementById('policyEditId').value;
    const body = {
        title: document.getElementById('policyTitle').value.trim(),
        category: document.getElementById('policyCategory').value,
        content: document.getElementById('policyContent').value
    };
    if (!body.title) { showNotification('Title is required', 'error'); return; }
    try {
        if (id) {
            await apiRequest(`/policies/${id}`, { method: 'PUT', body });
            showNotification('Policy updated', 'success');
        } else {
            const res = await apiRequest('/policies', { method: 'POST', body });
            showNotification(`Policy created — ${res.policy.policyId}`, 'success');
        }
        closePolicyModal();
        loadPolicies();
    } catch (e) {
        showNotification(`Could not save policy: ${e.message}`, 'error');
    }
}

let _policyCache = {};
async function loadPolicies() {
    const list = document.getElementById('policyList');
    if (!list) return;
    const q = (document.getElementById('policySearch')?.value || '').trim();
    list.innerHTML = '<p class="empty-state">Loading…</p>';
    try {
        const res = await apiRequest(`/policies?search=${encodeURIComponent(q)}`, { method: 'GET' });
        _policyCache = {};
        (res.policies || []).forEach(p => { _policyCache[p.policyId] = p; });
        renderPolicies(res.policies || []);
    } catch (e) {
        list.innerHTML = `<p class="empty-state">Could not load policies: ${e.message}</p>`;
    }
}

function renderPolicies(items) {
    const list = document.getElementById('policyList');
    if (!list) return;
    if (!items.length) {
        list.innerHTML = '<p class="empty-state">No policies yet. Click "Create Policy" to add one.</p>';
        return;
    }
    list.innerHTML = items.map(p => `
        <div class="activity-item">
            <div class="activity-icon ${p.status === 'published' ? 'blue-bg' : 'orange-bg'}"><i class="fas fa-book"></i></div>
            <div class="activity-content" style="flex:1;">
                <div class="activity-title">${escP(p.title)} <span style="font-size:0.75em;color:#888;">${p.policyId} · v${p.version}</span></div>
                <div class="activity-time">
                    ${escP(p.category || 'General')} · ${(p.status || 'draft').toUpperCase()}
                    ${p.lastPublishedAt ? ` · published to ${p.lastPublishedTo || 0} on ${new Date(p.lastPublishedAt).toLocaleDateString()}` : ''}
                </div>
                <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">
                    <button class="btn btn-sm btn-secondary" onclick="editPolicy('${p.policyId}')"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn btn-sm btn-primary" onclick="publishPolicy('${p.policyId}')"><i class="fas fa-paper-plane"></i> Publish to Employees</button>
                    <button class="btn btn-sm btn-delete" onclick="deletePolicy('${p.policyId}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </div>
    `).join('');
}

function editPolicy(policyId) {
    const p = _policyCache[policyId];
    if (p) openPolicyModal(p);
}

async function publishPolicy(policyId) {
    if (!confirm('Publish this policy — email it to ALL employees?')) return;
    try {
        const res = await apiRequest(`/policies/${policyId}/publish`, { method: 'POST' });
        showNotification(`Published to ${res.recipients} employee(s)${res.sent ? `, ${res.sent} emailed` : ' (demo mode — not delivered)'}.`, res.sent ? 'success' : 'info');
        loadPolicies();
    } catch (e) {
        showNotification(`Publish failed: ${e.message}`, 'error');
    }
}

async function deletePolicy(policyId) {
    if (!confirm('Delete this policy?')) return;
    try {
        await apiRequest(`/policies/${policyId}`, { method: 'DELETE' });
        showNotification('Policy deleted', 'success');
        loadPolicies();
    } catch (e) {
        showNotification(`Could not delete: ${e.message}`, 'error');
    }
}

function escP(t) {
    return String(t || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}
