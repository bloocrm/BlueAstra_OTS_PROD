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
    if (!m) return;
    if (!m.classList.contains('open')) _fillUserMenuHead();
    m.classList.toggle('open');
}

// Populate the colorful dropdown header from the signed-in user
function _fillUserMenuHead() {
    const u = _profileUser();
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('umName', u.name || (document.getElementById('userName') && document.getElementById('userName').textContent) || 'User');
    set('umEmail', u.email || '');
    set('umPlan', PLAN_LABELS[u.plan] || u.plan || 'Basic CRM');
    const av = document.getElementById('umAvatar');
    if (av) av.src = u.avatar || 'https://via.placeholder.com/52';
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
const AVATAR_PLACEHOLDER = 'https://via.placeholder.com/96';
let _pendingAvatar = null;   // resized data URL awaiting save

// Reflect the current user's avatar in the top-bar circle
function applyTopAvatar() {
    const u = _profileUser();
    const img = document.getElementById('topAvatar');
    if (img) img.src = u.avatar || 'https://via.placeholder.com/40';
}
document.addEventListener('DOMContentLoaded', applyTopAvatar);

// Resize a chosen image to a small square data URL (keeps it light in MongoDB)
function onAvatarChosen(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) { showNotification('Please choose a PNG or JPEG image.', 'error'); return; }
    const reader = new FileReader();
    reader.onload = function (ev) {
        const img = new Image();
        img.onload = function () {
            const size = 220;
            const canvas = document.createElement('canvas');
            canvas.width = size; canvas.height = size;
            const ctx = canvas.getContext('2d');
            // center-crop to a square, then draw
            const min = Math.min(img.width, img.height);
            const sx = (img.width - min) / 2, sy = (img.height - min) / 2;
            ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
            _pendingAvatar = canvas.toDataURL('image/jpeg', 0.85);
            const prev = document.getElementById('peAvatarPreview');
            if (prev) prev.src = _pendingAvatar;
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
}

function openProfileModal() {
    const m = document.getElementById('userMenu'); if (m) m.classList.remove('open');
    renderProfileView();
    // ensure view mode (not edit)
    document.getElementById('profileView').style.display = 'block';
    document.getElementById('profileEdit').style.display = 'none';
    document.getElementById('profileModal').classList.add('active');
    if (typeof mfaUpdateProfileBadge === 'function') mfaUpdateProfileBadge();
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
    const av = document.getElementById('pvAvatar');
    if (av) av.src = u.avatar || AVATAR_PLACEHOLDER;
    applyTopAvatar();
}

function startProfileEdit() {
    const u = _profileUser();
    const val = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
    val('peName', u.name);
    val('peEmail', u.email);
    val('pePhone', u.phone);
    val('peCompany', u.company);
    _pendingAvatar = null;
    const prev = document.getElementById('peAvatarPreview');
    if (prev) prev.src = u.avatar || AVATAR_PLACEHOLDER;
    const fileEl = document.getElementById('peAvatarFile'); if (fileEl) fileEl.value = '';
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
    if (_pendingAvatar) body.avatar = _pendingAvatar;
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
        _pendingAvatar = null;
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
