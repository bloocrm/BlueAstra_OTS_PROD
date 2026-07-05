/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  Proprietary software. Unauthorized copying or use by any means or technology
  (including AI tools) is strictly prohibited.
*/
/* =====================================================
   MULTI-FACTOR AUTHENTICATION (frontend)
   TOTP (Google/Microsoft Authenticator, Authy…) enroll + login;
   YubiKey / RSA SecurID presented as enterprise options.
   ===================================================== */

let _mfaLoginToken = null;
let _mfaCurrentlyOn = false;

// Toggle switch in the profile: launches the enable (setup) or disable flow.
// The switch always snaps back to the real server state until a change is
// actually confirmed, so it can never get out of sync.
function onMfaToggle(cb) {
    const wantOn = cb.checked;
    cb.checked = _mfaCurrentlyOn;            // revert visual; the modal is the source of truth
    if (wantOn && !_mfaCurrentlyOn) { openMfaModal(); if (typeof mfaStartTotp === 'function') setTimeout(mfaStartTotp, 150); }
    else if (!wantOn && _mfaCurrentlyOn) { openMfaModal(); }   // shows the disable row
}

function _mfaShow(id) {
    ['mfaMethods', 'mfaTotpSetup', 'mfaBackup'].forEach(v => {
        const el = document.getElementById(v); if (el) el.style.display = (v === id) ? 'block' : 'none';
    });
}

async function openMfaModal() {
    const pm = document.getElementById('profileModal'); if (pm) pm.classList.remove('active');
    _mfaShow('mfaMethods');
    document.getElementById('mfaModal').classList.add('active');
    try {
        const st = await apiRequest('/auth/mfa/status', { method: 'GET' });
        const on = !!st.enabled;
        document.getElementById('mfaEnabledBanner').style.display = on ? 'block' : 'none';
        document.getElementById('mfaDisableRow').style.display = on ? 'block' : 'none';
    } catch (e) { /* ignore */ }
}
function closeMfaModal() { document.getElementById('mfaModal').classList.remove('active'); }
function mfaBackToMethods() { _mfaShow('mfaMethods'); }

// Reflect MFA status on the profile view badge
async function mfaUpdateProfileBadge() {
    const el = document.getElementById('pvMfa'); if (!el) return;
    try {
        const st = await apiRequest('/auth/mfa/status', { method: 'GET' });
        _mfaCurrentlyOn = !!st.enabled;
        el.textContent = st.enabled ? '(ON)' : '(OFF)';
        el.style.color = st.enabled ? '#1b7a43' : '#8a93a3';
        const tg = document.getElementById('mfaToggle'); if (tg) tg.checked = _mfaCurrentlyOn;
    } catch (e) { el.textContent = '—'; }
}

// ---- Authenticator app (TOTP) enrollment ----
async function mfaStartTotp() {
    try {
        const res = await apiRequest('/auth/mfa/setup', { method: 'POST' });
        document.getElementById('mfaSecret').textContent = res.secret;
        const qr = document.getElementById('mfaQr');
        qr.innerHTML = '';
        if (typeof QRCode === 'function') {
            new QRCode(qr, { text: res.otpauthUrl, width: 180, height: 180, correctLevel: QRCode.CorrectLevel.M });
        } else {
            qr.innerHTML = '<div style="color:#888;font-size:0.8rem;">QR unavailable — use the manual key.</div>';
        }
        document.getElementById('mfaCode').value = '';
        const m = document.getElementById('mfaSetupMsg'); m.style.display = 'none';
        _mfaShow('mfaTotpSetup');
    } catch (e) { showNotification('Could not start setup: ' + e.message, 'error'); }
}

async function mfaVerify() {
    const code = (document.getElementById('mfaCode').value || '').trim();
    const msg = document.getElementById('mfaSetupMsg');
    const btn = document.getElementById('mfaVerifyBtn');
    msg.style.display = 'none';
    if (code.length < 6) { msg.className = 'msg err'; msg.style.display = 'block'; msg.textContent = 'Enter the 6-digit code from your app.'; return; }
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying…';
    try {
        const res = await apiRequest('/auth/mfa/verify', { method: 'POST', body: { code } });
        const grid = document.getElementById('mfaBackupCodes');
        grid.innerHTML = (res.backupCodes || []).map(c => `<div>${c}</div>`).join('');
        _mfaShow('mfaBackup');
        mfaUpdateProfileBadge();
    } catch (e) {
        msg.className = 'msg err'; msg.style.display = 'block'; msg.textContent = e.message || 'Incorrect code.';
    } finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> Verify & Enable'; }
}

async function mfaDisable() {
    const code = (document.getElementById('mfaDisableCode').value || '').trim();
    if (!code) { showNotification('Enter a current authenticator or backup code.', 'error'); return; }
    try {
        await apiRequest('/auth/mfa/disable', { method: 'POST', body: { code } });
        showNotification('Two-factor authentication disabled.', 'success');
        closeMfaModal();
        mfaUpdateProfileBadge();
    } catch (e) { showNotification(e.message || 'Could not disable MFA.', 'error'); }
}

// ---- Enterprise methods (YubiKey / RSA SecurID) ----
function mfaEnterprise(name) {
    showNotification(`${name} is an enterprise MFA option. To provision a ${name}, contact your administrator or Bloo CRM Customer Support at 1-800-BLUE-CRM.`, 'info');
}

// ---- Login step 2 (after password) ----
function showMfaLoginPrompt(mfaToken) {
    _mfaLoginToken = mfaToken;
    const code = document.getElementById('mfaLoginCode'); if (code) code.value = '';
    const msg = document.getElementById('mfaLoginMsg'); if (msg) msg.style.display = 'none';
    document.getElementById('mfaLoginModal').classList.add('active');
    setTimeout(() => { const c = document.getElementById('mfaLoginCode'); if (c) c.focus(); }, 100);
}
function cancelMfaLogin() {
    _mfaLoginToken = null;
    document.getElementById('mfaLoginModal').classList.remove('active');
}
async function submitMfaLogin(event) {
    event.preventDefault();
    const code = (document.getElementById('mfaLoginCode').value || '').trim();
    const msg = document.getElementById('mfaLoginMsg');
    const btn = document.getElementById('mfaLoginBtn');
    msg.style.display = 'none';
    if (!code) { msg.className = 'msg err'; msg.style.display = 'block'; msg.textContent = 'Enter your authentication code.'; return false; }
    btn.disabled = true; btn.textContent = 'Verifying…';
    try {
        const res = await apiRequest('/auth/mfa/login', { method: 'POST', auth: false, body: { mfaToken: _mfaLoginToken, code } });
        const { user, token } = res.data;
        localStorage.setItem('authToken', token);
        localStorage.setItem('currentUser', JSON.stringify(user));
        document.getElementById('mfaLoginModal').classList.remove('active');
        if (user.paymentPending) {
            window.location.href = '/pages/payment.html?plan=' + (user.plan || 'basic');
            return;
        }
        showNotification('Login successful!', 'success');
        showDashboard();
    } catch (e) {
        msg.className = 'msg err'; msg.style.display = 'block'; msg.textContent = e.message || 'Incorrect code.';
        btn.disabled = false; btn.textContent = 'Verify & Sign in';
    }
    return false;
}
