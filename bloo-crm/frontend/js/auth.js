/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   AUTHENTICATION JAVASCRIPT
   ===================================================== */

// Toggle between login and registration forms
function toggleAuthForms() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    loginForm.classList.toggle('active');
    registerForm.classList.toggle('active');
}

// ---- Backend auth helpers ------------------------------------------------

// Current JWT (issued by the backend on login/register)
function getAuthToken() {
    return localStorage.getItem('authToken');
}

function isLoggedIn() {
    return !!getAuthToken();
}

// Shared authenticated fetch against the backend API.
// Returns the parsed JSON body, throws Error(message) on failure.
async function apiRequest(path, { method = 'GET', body = null, auth = true } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) {
        const token = getAuthToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    let response;
    try {
        response = await fetch(`${window.API_BASE_URL}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        });
    } catch (networkError) {
        throw new Error('Cannot reach the server. Is the backend running?');
    }

    let data = {};
    try { data = await response.json(); } catch (_) { /* empty body */ }

    if (response.status === 401) {
        // Token invalid/expired — force re-login
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
    }

    if (!response.ok) {
        const message = data.message
            || (data.errors && data.errors[0] && (data.errors[0].msg || data.errors[0].message))
            || data.error
            || 'Request failed';
        const err = new Error(message);
        err.data = data;          // keep the structured body (e.g. emailVerificationRequired)
        err.status = response.status;
        throw err;
    }

    return data;
}

// Handle login
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const result = await apiRequest('/auth/login', {
            method: 'POST',
            auth: false,
            body: { email, password }
        });

        // MFA gate — password ok, but a second factor is required
        if (result.data && result.data.mfaRequired) {
            if (typeof showMfaLoginPrompt === 'function') showMfaLoginPrompt(result.data.mfaToken);
            return;
        }

        const { user, token } = result.data;
        localStorage.setItem('authToken', token);
        localStorage.setItem('currentUser', JSON.stringify(user));

        // Register-then-pay: an existing user who logged in from checkout returns there.
        const dest = safeNextUrl(sessionStorage.getItem('postAuthRedirect'));
        if (dest) {
            sessionStorage.removeItem('postAuthRedirect');
            window.location.href = dest;
            return;
        }

        // Member must pay for the plan chosen by their admin before entering the app
        if (user.paymentPending) {
            showNotification('Please complete payment for your plan to continue.', 'info');
            window.location.href = '/pages/payment.html?plan=' + (user.plan || 'basic');
            return;
        }

        showNotification('Login successful!', 'success');
        showDashboard();
    } catch (error) {
        // Unverified email — ask them to click the link we emailed, offer a resend.
        if (error.data && error.data.emailVerificationRequired) {
            showVerifyEmailPrompt(error.data.email || email);
            return;
        }
        showNotification(error.message || 'Invalid email or password!', 'error');
    }
}

// Show the "verify your email" prompt on the login form + a resend button.
function showVerifyEmailPrompt(email) {
    showNotification('Please verify your email to log in.', 'info');
    const form = document.getElementById('loginForm');
    if (!form) return;

    let banner = document.getElementById('verifyBanner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'verifyBanner';
        banner.style.cssText = 'background:#fff7ed;border:1px solid #fdba74;color:#9a3412;border-radius:10px;padding:14px 16px;margin:0 0 16px;font-size:14px;line-height:1.5;text-align:left;';
        form.insertBefore(banner, form.firstChild);
    }
    banner.innerHTML = '';

    const title = document.createElement('div');
    title.innerHTML = '<strong>Verify your email to continue</strong>';

    const msg = document.createElement('div');
    msg.style.margin = '6px 0 10px';
    msg.innerHTML = "We've sent a verification link to <b></b>. Click it to activate your account, then log in.";
    msg.querySelector('b').textContent = email;   // textContent avoids injection

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Resend verification email';
    btn.style.cssText = 'background:#ea580c;color:#fff;border:none;border-radius:8px;padding:9px 15px;font-weight:600;cursor:pointer;';
    btn.addEventListener('click', () => resendVerificationEmail(email, btn));

    banner.appendChild(title); banner.appendChild(msg); banner.appendChild(btn);
    banner.style.display = 'block';
    banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function resendVerificationEmail(email, btn) {
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
    try {
        await apiRequest('/auth/resend-verification', { method: 'POST', auth: false, body: { email } });
        showNotification('Verification email sent. Please check your inbox (and spam).', 'success');
    } catch (e) {
        showNotification('Could not resend right now. Please try again shortly.', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Resend verification email'; }
    }
}

// Handle registration
async function handleRegister(event) {
    event.preventDefault();

    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const company = document.getElementById('regCompany').value;

    // Validate passwords match
    if (password !== confirmPassword) {
        showNotification('Passwords do not match!', 'error');
        return;
    }

    // Check password length
    if (password.length < 8) {
        showNotification('Password must be at least 8 characters!', 'error');
        return;
    }

    try {
        const result = await apiRequest('/auth/register', {
            method: 'POST',
            auth: false,
            body: { name, email, phone, password, company }
        });

        const { user, token } = result.data;
        localStorage.setItem('authToken', token);
        localStorage.setItem('currentUser', JSON.stringify(user));

        // Register-then-pay: return to the checkout the visitor came from.
        const dest = safeNextUrl(sessionStorage.getItem('postAuthRedirect'));
        if (dest) {
            sessionStorage.removeItem('postAuthRedirect');
            showNotification(`Welcome ${name}! Taking you to secure checkout…`, 'success');
            setTimeout(() => { window.location.href = dest; }, 900);
            return;
        }

        showNotification(`Welcome ${name}! Account created successfully!`, 'success');
        showDashboard();
    } catch (error) {
        showNotification(error.message || 'Registration failed!', 'error');
    }
}

// Show dashboard and hide auth
async function showDashboard() {
    const authContainer = document.getElementById('authContainer');
    const dashboardContainer = document.getElementById('dashboardContainer');

    authContainer.style.display = 'none';
    dashboardContainer.style.display = 'flex';
    document.body.classList.add('app-active');  // hide product-landing chrome inside the app

    // Load user data
    loadUserData();

    // Pull this user's clients + leads from MongoDB into the in-memory cache
    if (typeof loadClientsFromServer === 'function') {
        try {
            await loadClientsFromServer();
        } catch (error) {
            showNotification(error.message || 'Failed to load clients from server', 'error');
        }
    }
    if (typeof loadLeadsFromServer === 'function') {
        try { await loadLeadsFromServer(); } catch (error) { console.warn('Failed to load leads:', error.message); }
    }

    // Load the dashboard analytics/charts
    if (typeof loadAnalyticsDashboard === 'function') loadAnalyticsDashboard();

    // Apply per-user access control (hides nav sections a member isn't granted)
    if (typeof applyAccessControl === 'function') applyAccessControl();

    // Navigate to a view from the hash if present
    const initialView = window.location.hash.replace('#', '');
    if (initialView) {
        switchView(initialView);
    }
}

// Load user data
function loadUserData() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    if (currentUser.name) {
        document.getElementById('userName').textContent = currentUser.name;
    }
    const av = document.getElementById('topAvatar');
    if (av) av.src = currentUser.avatar || 'https://via.placeholder.com/40';
}

// Handle logout
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        if (typeof clearClientsCache === 'function') clearClientsCache();
        if (typeof clearLeadsCache === 'function') clearLeadsCache();
        location.reload();
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        ${message}
    `;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Hide after 4 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 4000);
}

// Only same-site relative paths may be used as a post-auth redirect (guards
// against open-redirect via the ?next / postAuthRedirect value).
function safeNextUrl(v) {
    return (typeof v === 'string' && /^\/(?!\/)/.test(v)) ? v : null;
}

// Check if user is logged in (valid backend token present) + handle register-then-pay.
window.addEventListener('load', () => {
    const params = new URLSearchParams(window.location.search);
    const next = safeNextUrl(params.get('next'));
    if (next) sessionStorage.setItem('postAuthRedirect', next);

    if (isLoggedIn()) {
        // Already have an account — go straight to where we were headed (e.g. checkout).
        const dest = safeNextUrl(sessionStorage.getItem('postAuthRedirect'));
        if (dest) { sessionStorage.removeItem('postAuthRedirect'); window.location.href = dest; return; }
        showDashboard();
        return;
    }

    // Not logged in and sent here to register (from the payment page): show sign-up.
    if (params.get('auth') === 'register') {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        if (loginForm && registerForm) {
            loginForm.classList.remove('active');
            registerForm.classList.add('active');
        }
    }
});

// Add notification styles
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        background: var(--white);
        box-shadow: var(--shadow-lg);
        display: flex;
        align-items: center;
        gap: 0.75rem;
        z-index: 10000;
        opacity: 0;
        transform: translateY(100px);
        transition: all 0.3s ease;
    }

    .notification.show {
        opacity: 1;
        transform: translateY(0);
    }

    .notification-success {
        border-left: 4px solid var(--success);
        color: var(--success);
    }

    .notification-error {
        border-left: 4px solid var(--danger);
        color: var(--danger);
    }

    .notification-info {
        border-left: 4px solid var(--primary-blue);
        color: var(--primary-blue);
    }

    @media (max-width: 768px) {
        .notification {
            bottom: 10px;
            right: 10px;
            left: 10px;
            margin: 0;
        }
    }
`;
document.head.appendChild(style);
