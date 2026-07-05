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
        throw new Error(message);
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

        const { user, token } = result.data;
        localStorage.setItem('authToken', token);
        localStorage.setItem('currentUser', JSON.stringify(user));

        showNotification('Login successful!', 'success');
        showDashboard();
    } catch (error) {
        showNotification(error.message || 'Invalid email or password!', 'error');
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

// Check if user is logged in (valid backend token present)
window.addEventListener('load', () => {
    if (isLoggedIn()) {
        showDashboard();
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
