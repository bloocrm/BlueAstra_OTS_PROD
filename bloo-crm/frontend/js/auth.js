/* =====================================================
   AUTHENTICATION JAVASCRIPT - SERVER-SIDE CREDENTIALS
   ===================================================== */

// Initialize API client for authentication
const apiClient = new SecureApiClient('/api');

// Toggle between login and registration forms
function toggleAuthForms() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    loginForm.classList.toggle('active');
    registerForm.classList.toggle('active');
}

// Handle login - calls backend API
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        showNotification('Authenticating...', 'info');

        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            const errorMessage = data.message || data.error || 'Login failed';
            showNotification(errorMessage, 'error');
            return;
        }

        // Store JWT token using SecureApiClient
        const token = data.data.token;
        const refreshToken = data.data.token; // Backend returns single token, use for both
        const expiresIn = 7 * 24 * 60 * 60; // 7 days in seconds

        apiClient.setToken(token, refreshToken, expiresIn);

        // Store non-sensitive user data
        const currentUser = {
            id: data.data.user.id,
            name: data.data.user.name,
            email: data.data.user.email,
            company: data.data.user.company,
            plan: data.data.user.plan
        };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        showNotification('Login successful!', 'success');
        setTimeout(() => {
            showDashboard();
        }, 500);
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Connection error. Please try again.', 'error');
    }
}

// Handle registration - calls backend API
async function handleRegister(event) {
    event.preventDefault();

    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const phone = document.getElementById('regPhone').value;
    const company = document.getElementById('regCompany').value;
    const plan = document.getElementById('regPlan').value;

    // Client-side validation
    if (password !== confirmPassword) {
        showNotification('Passwords do not match!', 'error');
        return;
    }

    if (password.length < 8) {
        showNotification('Password must be at least 8 characters!', 'error');
        return;
    }

    try {
        showNotification('Creating account...', 'info');

        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                email,
                password,
                phone,
                company,
                plan
            })
        });

        const data = await response.json();

        if (!response.ok) {
            const errorMessage = data.message || data.error || 'Registration failed';
            showNotification(errorMessage, 'error');
            return;
        }

        // Store JWT token using SecureApiClient
        const token = data.data.token;
        const refreshToken = data.data.token; // Backend returns single token, use for both
        const expiresIn = 7 * 24 * 60 * 60; // 7 days in seconds

        apiClient.setToken(token, refreshToken, expiresIn);

        // Store non-sensitive user data
        const currentUser = {
            id: data.data.user.id,
            name: data.data.user.name,
            email: data.data.user.email,
            company: data.data.user.company,
            plan: data.data.user.plan
        };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        showNotification(`Welcome ${name}! Account created successfully!`, 'success');
        setTimeout(() => {
            showDashboard();
        }, 500);
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Connection error. Please try again.', 'error');
    }
}

// Show dashboard and hide auth
function showDashboard() {
    const authContainer = document.getElementById('authContainer');
    const dashboardContainer = document.getElementById('dashboardContainer');

    authContainer.style.display = 'none';
    dashboardContainer.style.display = 'flex';

    // Load user data
    loadUserData();

    // Navigate to a view from the hash if present
    const initialView = window.location.hash.replace('#', '');
    if (initialView) {
        switchView(initialView);
    }
}

// Load user data from localStorage (non-sensitive data only)
function loadUserData() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

    if (currentUser.name) {
        document.getElementById('userName').textContent = currentUser.name;
    }
}

// Handle logout
async function handleLogout() {
    if (!confirm('Are you sure you want to logout?')) {
        return;
    }

    try {
        // Call logout endpoint
        await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiClient.token}`
            }
        });
    } catch (error) {
        console.error('Logout error:', error);
    }

    // Clear tokens and user data
    apiClient.clearAuth();
    localStorage.removeItem('currentUser');
    location.reload();
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

// Check if user is logged in on page load
window.addEventListener('load', async () => {
    // Check if valid JWT token exists
    const token = sessionStorage.getItem('authToken');

    if (token && !apiClient.isTokenExpired()) {
        try {
            // Verify token with server
            const response = await fetch('/api/auth/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                // Store user profile data
                const currentUser = {
                    id: data.data.id,
                    name: data.data.name,
                    email: data.data.email,
                    company: data.data.company,
                    plan: data.data.plan
                };
                localStorage.setItem('currentUser', JSON.stringify(currentUser));

                // Set up API client with token
                apiClient.token = token;
                apiClient.tokenExpiresAt = parseInt(sessionStorage.getItem('tokenExpiresAt')) || 0;

                showDashboard();
                const initialView = window.location.hash.replace('#', '');
                if (initialView) {
                    switchView(initialView);
                }
            } else {
                // Token invalid, clear it
                apiClient.clearAuth();
                localStorage.removeItem('currentUser');
            }
        } catch (error) {
            console.error('Token verification error:', error);
            apiClient.clearAuth();
            localStorage.removeItem('currentUser');
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
