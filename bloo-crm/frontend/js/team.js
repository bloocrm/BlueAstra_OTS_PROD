/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  Proprietary software. Unauthorized copying or use by any means or technology
  (including AI tools) is strictly prohibited.
*/
/* =====================================================
   TEAM & ACCESS CONTROL (frontend)
   Admin manages member sub-users; members' sidebars are filtered.
   ===================================================== */

// Friendly labels for the grantable sections (must match backend SECTIONS + nav data-view)
const ACCESS_SECTIONS = [
    ['dashboard', 'Dashboard'], ['uploadSourceData', 'Upload Source Data'], ['clients', 'Clients'],
    ['clientDashboard', 'Client Dashboard'], ['leads', 'Leads'], ['email', 'Email'], ['calendar', 'Calendar'],
    ['compliance', 'Compliance'], ['communications', 'Communications'], ['grievance', 'Grievance'],
    ['hr', 'Employee Dashboard'], ['vendors', 'Vendor Dashboard'], ['proposals', 'Proposals'],
    ['knowledge', 'Knowledge Repository'], ['pricing', 'Pricing'], ['workflow', 'Workflow'],
    ['meetingRoom', 'Meeting Room'], ['ai-insights', 'AI Insights'], ['help', 'Help']
];

let _teamMembers = [];

async function loadTeam() {
    const list = document.getElementById('teamList');
    if (!list) return;
    list.innerHTML = '<p class="empty-state">Loading…</p>';
    try {
        const res = await apiRequest('/team/members', { method: 'GET' });
        _teamMembers = res.members || [];
        renderTeam(_teamMembers);
    } catch (e) {
        list.innerHTML = `<p class="empty-state">${(e.message || '').includes('administrator') ? 'Only the account administrator can manage the team.' : 'Could not load team: ' + e.message}</p>`;
    }
}

function renderTeam(members) {
    const list = document.getElementById('teamList');
    if (!members.length) { list.innerHTML = '<p class="empty-state">No users yet. Click "Add User" to create one.</p>'; return; }
    list.innerHTML = members.map(m => `
        <div class="activity-item">
            <div class="activity-icon ${m.isActive ? 'blue-bg' : 'orange-bg'}"><i class="fas fa-user"></i></div>
            <div class="activity-content" style="flex:1;">
                <div class="activity-title">${escT(m.name)} <span style="font-size:0.75em;color:#888;">${escT(m.email)}</span>
                    <span style="font-size:0.72em;color:${m.isActive ? '#2ecc71' : '#e67e22'};">${m.isActive ? 'ACTIVE' : 'SUSPENDED'}</span></div>
                <div class="activity-time">Access: ${(m.permissions && m.permissions.length) ? m.permissions.map(p => labelFor(p)).join(', ') : 'none granted'}</div>
                <div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap;">
                    <button class="btn btn-sm btn-secondary" onclick="editMemberPerms('${m.id}')"><i class="fas fa-key"></i> Edit Access</button>
                    <button class="btn btn-sm btn-secondary" onclick="toggleMember('${m.id}', ${m.isActive ? 'false' : 'true'})"><i class="fas fa-power-off"></i> ${m.isActive ? 'Suspend' : 'Restore'}</button>
                    <button class="btn btn-sm btn-delete" onclick="removeMember('${m.id}','${escAttrT(m.name)}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </div>`).join('');
}
function labelFor(key) { const s = ACCESS_SECTIONS.find(x => x[0] === key); return s ? s[1] : key; }

// ---- Add member ----
function openMemberModal() {
    const m = document.getElementById('memberModal');
    const f = m && m.querySelector('form'); if (f) f.reset();
    const grid = document.getElementById('memberPermsGrid');
    if (grid) grid.innerHTML = ACCESS_SECTIONS.map(([key, label]) =>
        `<label style="font-size:0.85rem;"><input type="checkbox" class="mperm" value="${key}"> ${label}</label>`).join('');
    if (m) m.classList.add('active');
}
function closeMemberModal() { document.getElementById('memberModal').classList.remove('active'); }

async function submitMember(event) {
    event.preventDefault();
    const v = id => (document.getElementById(id)?.value || '').trim();
    const permissions = Array.from(document.querySelectorAll('#memberPermsGrid .mperm:checked')).map(c => c.value);
    try {
        await apiRequest('/team/members', { method: 'POST', body: { name: v('memberName'), email: v('memberEmail'), password: v('memberPassword'), permissions } });
        showNotification('User created', 'success');
        closeMemberModal();
        loadTeam();
    } catch (e) { showNotification(`Could not create user: ${e.message}`, 'error'); }
}

// ---- Edit permissions ----
function editMemberPerms(id) {
    const m = _teamMembers.find(x => x.id === id);
    if (!m) return;
    const current = new Set(m.permissions || []);
    const overlay = document.createElement('div');
    overlay.className = 'modal active'; overlay.style.display = 'flex';
    overlay.innerHTML = `
        <div class="modal-content" style="max-width:520px;">
            <div class="modal-header"><h2><i class="fas fa-key"></i> Access — ${escT(m.name)}</h2><button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;max-height:300px;overflow:auto;">
                ${ACCESS_SECTIONS.map(([key, label]) => `<label style="font-size:0.85rem;"><input type="checkbox" class="eperm" value="${key}" ${current.has(key) ? 'checked' : ''}> ${label}</label>`).join('')}
            </div>
            <div class="modal-actions">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                <button class="btn btn-primary" onclick="saveMemberPerms('${id}', this)"><i class="fas fa-save"></i> Save Access</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
}
async function saveMemberPerms(id, btn) {
    const overlay = btn.closest('.modal');
    const permissions = Array.from(overlay.querySelectorAll('.eperm:checked')).map(c => c.value);
    try {
        await apiRequest(`/team/members/${id}/permissions`, { method: 'PATCH', body: { permissions } });
        showNotification('Access updated', 'success');
        overlay.remove();
        loadTeam();
    } catch (e) { showNotification(`Could not update: ${e.message}`, 'error'); }
}

async function toggleMember(id, makeActive) {
    try {
        await apiRequest(`/team/members/${id}/active`, { method: 'PATCH', body: { isActive: makeActive === true || makeActive === 'true' } });
        loadTeam();
    } catch (e) { showNotification(`Could not update: ${e.message}`, 'error'); }
}
async function removeMember(id, name) {
    if (!confirm(`Remove user ${name}? They will lose all access.`)) return;
    try { await apiRequest(`/team/members/${id}`, { method: 'DELETE' }); loadTeam(); }
    catch (e) { showNotification(`Could not remove: ${e.message}`, 'error'); }
}

// ---- Sidebar gating for members ----
// Called after login/whoami: hides nav items a member isn't granted; hides Team for members.
async function applyAccessControl() {
    let role = 'admin', permissions = [];
    try {
        const res = await apiRequest('/team/me', { method: 'GET' });
        role = res.role; permissions = res.permissions || [];
    } catch (e) { return; }
    window.__role = role; window.__permissions = permissions;
    const teamNav = document.getElementById('navTeam');
    if (teamNav) teamNav.style.display = (role === 'admin') ? '' : 'none';
    if (role !== 'member') return;
    const allowed = new Set(permissions);
    // Always allow help + dashboard landing so the member isn't stranded
    allowed.add('help');
    document.querySelectorAll('.nav-item[data-view]').forEach(a => {
        const view = a.getAttribute('data-view');
        if (view === 'team') { a.style.display = 'none'; return; }
        a.style.display = allowed.has(view) ? '' : 'none';
    });
    // If current view is not allowed, move to the first allowed one
    const active = document.querySelector('.view.active');
    if (active && !allowed.has(active.id)) {
        const first = permissions[0] || 'help';
        if (typeof switchView === 'function') switchView(first);
    }
}

function escT(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m])); }
function escAttrT(t) { return String(t || '').replace(/['"\\]/g, ''); }
