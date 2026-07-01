/* =====================================================
   LEAVE APPLICATIONS — apply, manager approval, backup delegation
   ===================================================== */

function openLeaveModal() {
    const m = document.getElementById('leaveModal');
    const f = m && m.querySelector('form');
    if (f) f.reset();
    if (m) m.classList.add('active');
}
function closeLeaveModal() {
    const m = document.getElementById('leaveModal');
    if (m) m.classList.remove('active');
}

async function submitLeave(event) {
    event.preventDefault();
    const v = id => (document.getElementById(id)?.value || '').trim();
    const employeeName = v('leaveEmployee');
    if (!employeeName) { showNotification('Employee name is required', 'error'); return; }
    const body = {
        employeeName,
        manager: v('leaveManager'),
        leaveType: v('leaveType'),
        startDate: v('leaveStart') || undefined,
        endDate: v('leaveEnd') || undefined,
        reason: v('leaveReason')
    };
    try {
        const res = await apiRequest('/leaves', { method: 'POST', body });
        const l = res.leave;
        let msg = `Leave filed — ${l.leaveId} → ${l.currentApprover || 'manager'}`;
        if (l.delegated) msg += ` (delegated: ${l.delegationReason})`;
        showNotification(msg, 'success');
        closeLeaveModal();
        loadLeaves();
    } catch (e) {
        showNotification(`Could not apply: ${e.message}`, 'error');
    }
}

async function loadLeaves() {
    const list = document.getElementById('leaveList');
    if (!list) return;
    const q = (document.getElementById('leaveSearch')?.value || '').trim();
    list.innerHTML = '<p class="empty-state">Loading…</p>';
    try {
        const res = await apiRequest(`/leaves?search=${encodeURIComponent(q)}`, { method: 'GET' });
        const c = res.counts || {};
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || 0; };
        set('leavePending', c.pending); set('leaveApproved', c.approved); set('leaveRejected', c.rejected); set('leaveDelegated', c.delegated);
        renderLeaves(res.leaves || []);
    } catch (e) {
        list.innerHTML = `<p class="empty-state">Could not load leaves: ${e.message}</p>`;
    }
}

function renderLeaves(items) {
    const list = document.getElementById('leaveList');
    if (!list) return;
    if (!items.length) {
        list.innerHTML = '<p class="empty-state">No leave applications yet.</p>';
        return;
    }
    const icon = s => s === 'approved' ? 'blue-bg' : s === 'rejected' ? 'orange-bg' : 'aqua-bg';
    list.innerHTML = items.map(l => `
        <div class="activity-item">
            <div class="activity-icon ${icon(l.status)}"><i class="fas fa-plane-departure"></i></div>
            <div class="activity-content" style="flex:1;">
                <div class="activity-title">${escL(l.employeeName)} — ${escL(l.leaveType)} <span style="font-size:0.75em;color:#888;">${l.leaveId}</span></div>
                <div class="activity-time">
                    ${l.startDate ? new Date(l.startDate).toLocaleDateString() : '?'} → ${l.endDate ? new Date(l.endDate).toLocaleDateString() : '?'}${l.days ? ` (${l.days}d)` : ''}
                    · Approver: <strong>${escL(l.currentApprover || l.manager || '—')}</strong>${l.delegated ? ' <span style="color:#2d6cdf;">(delegated to backup)</span>' : ''}
                    · <strong>${(l.status || '').toUpperCase()}</strong>
                    ${l.reason ? '<br>' + escL(l.reason) : ''}
                    ${l.delegated ? '<br><small style="color:#2d6cdf;">' + escL(l.delegationReason) + '</small>' : ''}
                </div>
                ${l.status === 'pending' ? `
                <div style="margin-top:8px;display:flex;gap:8px;">
                    <button class="btn btn-sm btn-primary" onclick="decideLeave('${l.leaveId}','approve')"><i class="fas fa-check"></i> Approve</button>
                    <button class="btn btn-sm btn-delete" onclick="decideLeave('${l.leaveId}','reject')"><i class="fas fa-times"></i> Reject</button>
                </div>` : `<div class="activity-time"><small>${l.decidedBy ? 'Decided by ' + escL(l.decidedBy) : ''} ${l.decidedAt ? new Date(l.decidedAt).toLocaleString() : ''}</small></div>`}
            </div>
        </div>
    `).join('');
}

async function decideLeave(leaveId, action) {
    if (!confirm(`${action === 'approve' ? 'Approve' : 'Reject'} this leave application?`)) return;
    try {
        await apiRequest(`/leaves/${leaveId}/${action}`, { method: 'POST' });
        showNotification(`Leave ${action === 'approve' ? 'approved' : 'rejected'}.`, 'success');
        loadLeaves();
    } catch (e) {
        showNotification(`Could not ${action}: ${e.message}`, 'error');
    }
}

function escL(t) {
    return String(t || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}
