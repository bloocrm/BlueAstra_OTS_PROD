/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  Proprietary software. Unauthorized copying or use by any means or technology
  (including AI tools) is strictly prohibited.
*/
/* =====================================================
   USER PROFILE — view & edit account details (from sign-up)
   ===================================================== */

function toggleUserMenu(e) {
    if (e) e.stopPropagation();
    const m = document.getElementById('userMenu');
    if (m) m.classList.toggle('open');
}

// Close the dropdown when clicking anywhere outside it
document.addEventListener('click', function (e) {
    const ui = document.getElementById('userInfo');
    const m = document.getElementById('userMenu');
    if (m && ui && !ui.contains(e.target)) m.classList.remove('open');
});

function _profileUser() {
    try { return JSON.parse(localStorage.getItem('currentUser') || '{}'); } catch (e) { return {}; }
}

const PLAN_LABELS = { 'basic': 'Basic CRM', 'swift-ai-plus': 'SWIFT AI+', 'rocket-ai-plus': 'ROCKET AI+', 'premium': 'Premium CRM' };

function openProfileModal() {
    const m = document.getElementById('userMenu'); if (m) m.classList.remove('open');
    renderProfileView();
    // ensure view mode (not edit)
    document.getElementById('profileView').style.display = 'block';
    document.getElementById('profileEdit').style.display = 'none';
    document.getElementById('profileModal').classList.add('active');
}
function closeProfileModal() {
    document.getElementById('profileModal').classList.remove('active');
    document.getElementById('profileView').style.display = 'block';
    document.getElementById('profileEdit').style.display = 'none';
}

function renderProfileView() {
    const u = _profileUser();
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v || '—'; };
    set('pvName', u.name);
    set('pvEmail', u.email);
    set('pvPhone', u.phone);
    set('pvCompany', u.company);
    set('pvPlan', PLAN_LABELS[u.plan] || u.plan || 'Basic CRM');
}

function startProfileEdit() {
    const u = _profileUser();
    const val = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
    val('peName', u.name);
    val('peEmail', u.email);
    val('pePhone', u.phone);
    val('peCompany', u.company);
    document.getElementById('profileView').style.display = 'none';
    document.getElementById('profileEdit').style.display = 'block';
}
function cancelProfileEdit() {
    document.getElementById('profileEdit').style.display = 'none';
    document.getElementById('profileView').style.display = 'block';
}

async function saveProfile(event) {
    event.preventDefault();
    const v = id => (document.getElementById(id)?.value || '').trim();
    const body = { name: v('peName'), email: v('peEmail'), phone: v('pePhone'), company: v('peCompany') };
    if (!body.name || !body.email || !body.phone) {
        showNotification('Name, email and contact number are required.', 'error');
        return false;
    }
    const btn = document.getElementById('peSaveBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…'; }
    try {
        const res = await apiRequest('/auth/profile', { method: 'PUT', body });
        // Persist the fresh details locally so the app reflects them everywhere
        if (res.data) {
            localStorage.setItem('currentUser', JSON.stringify(res.data));
            const nameEl = document.getElementById('userName');
            if (nameEl && res.data.name) nameEl.textContent = res.data.name;
        }
        renderProfileView();
        cancelProfileEdit();
        const changed = (res.changed && res.changed.length) ? ` (${res.changed.join(', ')})` : '';
        showNotification(`Profile updated${changed}. A confirmation email has been sent.`, 'success');
    } catch (e) {
        showNotification(`Could not update profile: ${e.message}`, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Submit'; }
    }
    return false;
}
