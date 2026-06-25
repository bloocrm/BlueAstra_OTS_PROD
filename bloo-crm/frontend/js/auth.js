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

// Handle login
function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // Get stored users
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    // Find user
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        // Store current user session
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        // Show success message and redirect
        showNotification('Login successful!', 'success');
        setTimeout(() => {
            showDashboard();
        }, 500);
    } else {
        showNotification('Invalid email or password!', 'error');
    }
}

// Handle registration
function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const company = document.getElementById('regCompany').value;
    const plan = document.getElementById('regPlan').value;
    
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
    
    // Get stored users
    let users = JSON.parse(localStorage.getItem('users') || '[]');
    
    // Check if email exists
    if (users.find(u => u.email === email)) {
        showNotification('Email already exists!', 'error');
        return;
    }
    
    // Create new user
    const newUser = {
        id: Date.now().toString(),
        name: name,
        email: email,
        password: password, // In production, this should be hashed
        company: company,
        plan: plan,
        createdAt: new Date().toISOString(),
        clients: [],
        leads: [],
        communications: [],
        payments: []
    };
    
    // Add user and save
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    // Set current user
    localStorage.setItem('currentUser', JSON.stringify(newUser));
    
    showNotification(`Welcome ${name}! Account created successfully!`, 'success');
    setTimeout(() => {
        showDashboard();
    }, 500);
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

// Load user data
function loadUserData() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    if (currentUser.name) {
        document.getElementById('userName').textContent = currentUser.name;
    }
}

// Handle logout
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('currentUser');
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

// Check if user is logged in
window.addEventListener('load', () => {
    const currentUser = localStorage.getItem('currentUser');
    
    if (currentUser) {
        showDashboard();
        const initialView = window.location.hash.replace('#', '');
        if (initialView) {
            switchView(initialView);
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
