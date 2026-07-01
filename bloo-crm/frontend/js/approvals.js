/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   APPROVALS — expense/purchase/travel/hiring/promotion/policy-exception
   ===================================================== */

function openApprovalModal() {
    const m = document.getElementById('approvalModal');
    const f = m && m.querySelector('form');
    if (f) f.reset();
    if (m) m.classList.add('active');
}
function closeApprovalModal() {
    const m = document.getElementById('approvalModal');
    if (m) m.classList.remove('active');
}

async function submitApproval(event) {
    event.preventDefault();
    const v = id => (document.getElementById(id)?.value || '').trim();
    const title = v('aprTitle');
    if (!title) { showNotification('Title is required', 'error'); return; }
    const body = {
        type: v('aprType'),
        title,
        amount: v('aprAmount') || undefined,
        requestedBy: v('aprRequestedBy'),
        manager: v('aprManager'),
        details: v('aprDetails')
    };
    try {
        const res = await apiRequest('/approvals', { method: 'POST', body });
        const a = res.approval;
        let msg = `Request filed — ${a.approvalId} → ${a.currentApprover || 'approver'}`;
        if (a.delegated) msg += ` (${a.delegationReason})`;
        showNotification(msg, 'success');
        closeApprovalModal();
        loadApprovals();
    } catch (e) {
        showNotification(`Could not submit: ${e.message}`, 'error');
    }
}

async function loadApprovals() {
    const list = document.getElementById('approvalList');
    if (!list) return;
    const q = (document.getElementById('approvalSearch')?.value || '').trim();
    list.innerHTML = '<p class="empty-state">Loading…</p>';
    try {
        const res = await apiRequest(`/approvals?search=${encodeURIComponent(q)}`, { method: 'GET' });
        const c = res.counts || {};
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || 0; };
        set('aprPending', c.pending); set('aprApproved', c.approved); set('aprRejected', c.rejected); set('aprDelegated', c.delegated);
        renderApprovals(res.approvals || []);
    } catch (e) {
        list.innerHTML = `<p class="empty-state">Could not load: ${e.message}</p>`;
    }
}

const APR_LABELS = { expense: 'Expense', purchase: 'Purchase', travel: 'Travel', hiring: 'Hiring', promotion: 'Promotion', 'policy-exception': 'Policy Exception' };

function renderApprovals(items) {
    const list = document.getElementById('approvalList');
    if (!list) return;
    if (!items.length) { list.innerHTML = '<p class="empty-state">No approval requests yet.</p>'; return; }
    const icon = s => s === 'approved' ? 'blue-bg' : s === 'rejected' ? 'orange-bg' : 'aqua-bg';
    list.innerHTML = items.map(a => `
        <div class="activity-item">
            <div class="activity-icon ${icon(a.status)}"><i class="fas fa-check-double"></i></div>
            <div class="activity-content" style="flex:1;">
                <div class="activity-title">${escAp(a.title)} <span style="font-size:0.75em;color:#888;">${APR_LABELS[a.type] || a.type} · ${a.approvalId}</span></div>
                <div class="activity-time">
                    ${a.amount != null ? `${a.currency || 'USD'} ${a.amount} · ` : ''}${a.requestedBy ? 'by ' + escAp(a.requestedBy) + ' · ' : ''}Approver: <strong>${escAp(a.currentApprover || a.manager || '—')}</strong>${a.delegated ? ' <span style="color:#2d6cdf;">(delegated)</span>' : ''} · <strong>${(a.status || '').toUpperCase()}</strong>
                    ${a.details ? '<br>' + escAp(a.details) : ''}
                    ${a.delegated ? '<br><small style="color:#2d6cdf;">' + escAp(a.delegationReason) + '</small>' : ''}
                </div>
                ${a.status === 'pending' ? `
                <div style="margin-top:8px;display:flex;gap:8px;">
                    <button class="btn btn-sm btn-primary" onclick="decideApproval('${a.approvalId}','approve')"><i class="fas fa-check"></i> Approve</button>
                    <button class="btn btn-sm btn-delete" onclick="decideApproval('${a.approvalId}','reject')"><i class="fas fa-times"></i> Reject</button>
                </div>` : `<div class="activity-time"><small>${a.decidedBy ? 'Decided by ' + escAp(a.decidedBy) : ''} ${a.decidedAt ? new Date(a.decidedAt).toLocaleString() : ''}</small></div>`}
            </div>
        </div>
    `).join('');
}

async function decideApproval(approvalId, action) {
    if (!confirm(`${action === 'approve' ? 'Approve' : 'Reject'} this request?`)) return;
    try {
        await apiRequest(`/approvals/${approvalId}/${action}`, { method: 'POST' });
        showNotification(`Request ${action === 'approve' ? 'approved' : 'rejected'}.`, 'success');
        loadApprovals();
    } catch (e) {
        showNotification(`Could not ${action}: ${e.message}`, 'error');
    }
}

function escAp(t) {
    return String(t || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}
