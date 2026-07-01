/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   WORKFLOW TASKS — assign to an employee; email routes to backup if on leave
   ===================================================== */

function openTaskModal() {
    const m = document.getElementById('taskModal');
    const f = m && m.querySelector('form');
    if (f) f.reset();
    if (m) m.classList.add('active');
}
function closeTaskModal() {
    const m = document.getElementById('taskModal');
    if (m) m.classList.remove('active');
}

async function submitTask(event) {
    event.preventDefault();
    const v = id => (document.getElementById(id)?.value || '').trim();
    const title = v('taskTitle');
    const assignedToName = v('taskEmployee');
    if (!title || !assignedToName) { showNotification('Title and employee are required', 'error'); return; }
    const body = { title, assignedToName, dueDate: v('taskDue') || undefined, description: v('taskDesc') };
    try {
        const res = await apiRequest('/workflow-tasks', { method: 'POST', body });
        const t = res.task;
        let msg = `Task ${t.taskId} assigned to ${t.currentAssignee}`;
        if (t.delegated) msg += ` (backup — ${t.delegationReason})`;
        if (res.emailed) msg += ' · email sent';
        else if (res.noEmail) msg += ' · no email on file';
        else if (res.mock) msg += ' · email logged (demo)';
        showNotification(msg, 'success');
        closeTaskModal();
        loadWorkflowTasks();
    } catch (e) {
        showNotification(`Could not assign: ${e.message}`, 'error');
    }
}

async function loadWorkflowTasks() {
    const list = document.getElementById('taskList');
    if (!list) return;
    list.innerHTML = '<p class="empty-state">Loading…</p>';
    try {
        const res = await apiRequest('/workflow-tasks', { method: 'GET' });
        const c = res.counts || {};
        const el = document.getElementById('taskCounts');
        if (el) el.textContent = `· ${c.open || 0} open · ${c.done || 0} done · ${c.delegated || 0} delegated`;
        renderWorkflowTasks(res.tasks || []);
    } catch (e) {
        list.innerHTML = `<p class="empty-state">Could not load tasks: ${e.message}</p>`;
    }
}

function renderWorkflowTasks(items) {
    const list = document.getElementById('taskList');
    if (!list) return;
    if (!items.length) { list.innerHTML = '<p class="empty-state">No tasks assigned yet.</p>'; return; }
    const icon = s => s === 'done' ? 'blue-bg' : s === 'in-progress' ? 'aqua-bg' : 'orange-bg';
    list.innerHTML = items.map(t => `
        <div class="activity-item">
            <div class="activity-icon ${icon(t.status)}"><i class="fas fa-tasks"></i></div>
            <div class="activity-content" style="flex:1;">
                <div class="activity-title">${escW(t.title)} <span style="font-size:0.75em;color:#888;">${t.taskId}</span></div>
                <div class="activity-time">
                    Assigned to <strong>${escW(t.currentAssignee || t.assignedToName)}</strong>${t.delegated ? ' <span style="color:#2d6cdf;">(backup for ' + escW(t.assignedToName) + ')</span>' : ''}
                    ${t.notifiedEmail ? ' · ✉ ' + escW(t.notifiedEmail) : ' · no email'}
                    ${t.dueDate ? ' · due ' + new Date(t.dueDate).toLocaleDateString() : ''}
                    · <strong>${(t.status || '').toUpperCase()}</strong>
                    ${t.delegationReason ? '<br><small style="color:#2d6cdf;">' + escW(t.delegationReason) + '</small>' : ''}
                    ${t.description ? '<br>' + escW(t.description) : ''}
                </div>
                <div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap;">
                    ${t.status !== 'done' ? `<button class="btn btn-sm btn-primary" onclick="setTaskStatus('${t.taskId}','done')"><i class="fas fa-check"></i> Mark Done</button>` : ''}
                    ${t.status === 'open' ? `<button class="btn btn-sm btn-secondary" onclick="setTaskStatus('${t.taskId}','in-progress')">In Progress</button>` : ''}
                    <button class="btn btn-sm btn-delete" onclick="deleteTask('${t.taskId}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </div>
    `).join('');
}

async function setTaskStatus(taskId, status) {
    try { await apiRequest(`/workflow-tasks/${taskId}/status`, { method: 'PATCH', body: { status } }); loadWorkflowTasks(); }
    catch (e) { showNotification(`Update failed: ${e.message}`, 'error'); }
}
async function deleteTask(taskId) {
    if (!confirm('Delete this task?')) return;
    try { await apiRequest(`/workflow-tasks/${taskId}`, { method: 'DELETE' }); loadWorkflowTasks(); }
    catch (e) { showNotification(`Could not delete: ${e.message}`, 'error'); }
}

function escW(t) {
    return String(t || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}
