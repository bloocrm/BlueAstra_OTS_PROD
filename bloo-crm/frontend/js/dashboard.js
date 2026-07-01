/* =====================================================
   DASHBOARD FUNCTIONALITY
   ===================================================== */

// Switch between views
function switchView(viewName) {
    // Remove active class from all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to selected view
    const viewElement = document.getElementById(viewName);
    if (viewElement) {
        viewElement.classList.add('active');
    }
    
    // Add active class to nav item
    const navItem = document.querySelector(`[data-view="${viewName}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }
    
    // Update page title
    const titles = {
        dashboard: 'Dashboard',
        uploadSourceData: 'Upload Source Data',
        clients: 'Client List',
        clientDashboard: 'Client Dashboard',
        email: 'Email Management',
        calendar: 'Calendar & Scheduling',
        compliance: 'Compliance Tracking',
        leads: 'Leads',
        communications: 'Communications',
        grievance: 'Grievance & Support',
        employees: 'Employee Information',
        policies: 'Company Policies',
        leaves: 'Leave Applications',
        pricing: 'Pricing & Payments',
        workflow: 'Workflow & Audit Log',
        'ai-insights': 'AI Insights'
    };

    document.getElementById('pageTitle').textContent = titles[viewName] || 'Dashboard';

    // Load content for specific views
    if (viewName === 'dashboard') {
        loadDashboardStats();
        loadRecentActivities();
        if (typeof loadAnalyticsDashboard === 'function') loadAnalyticsDashboard();
    } else if (viewName === 'uploadSourceData') {
        // No specific loading needed for upload view
        initializeUploadAI();
    } else if (viewName === 'clients') {
        loadClientsList();
    } else if (viewName === 'clientDashboard') {
        loadClientDashboard();
    } else if (viewName === 'email') {
        initializeSync();
        loadEmailUpgradeSection();
    } else if (viewName === 'calendar') {
        initializeSync();
        loadCalendarUpgradeSection();
        if (typeof renderMeetingsCalendar === 'function') renderMeetingsCalendar();
    } else if (viewName === 'compliance') {
        initializeCompliance();
    } else if (viewName === 'grievance') {
        if (typeof loadGrievances === 'function') loadGrievances();
    } else if (viewName === 'employees') {
        if (typeof loadEmployees === 'function') loadEmployees();
    } else if (viewName === 'policies') {
        if (typeof loadPolicies === 'function') loadPolicies();
    } else if (viewName === 'leaves') {
        if (typeof loadLeaves === 'function') loadLeaves();
    } else if (viewName === 'leads') {
        loadLeadsList();
    } else if (viewName === 'communications') {
        loadCommunicationsList();
    } else if (viewName === 'pricing') {
        loadPricingPlans();
        updatePricingDisplay();
    } else if (viewName === 'workflow') {
        loadWorkflowActivities();
        initializeAIWorkflow();
    } else if (viewName === 'meetingRoom') {
        initializeMeetingRoom();
    }
}

// Load dashboard statistics
function loadDashboardStats() {
    const stats = getDashboardStats();
    
    document.getElementById('totalClients').textContent = stats.totalClients;
    document.getElementById('activeLeads').textContent = stats.activeLeads;
    document.getElementById('conversions').textContent = stats.conversions;
    document.getElementById('totalRevenue').textContent = '$' + stats.totalRevenue.toFixed(2);
}

// Load recent activities
function loadRecentActivities() {
    const activities = getRecentActivities(8);
    const container = document.getElementById('recentActivities');
    
    if (activities.length === 0) {
        container.innerHTML = '<p class="empty-state">No activities yet</p>';
        return;
    }
    
    container.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon aqua-bg" style="background: linear-gradient(135deg, var(--aqua), #00b8cc); color: white;">
                <i class="fas fa-${activity.icon}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-title">${activity.title}</div>
                <div class="activity-time">${formatDateTime(activity.timestamp)}</div>
            </div>
        </div>
    `).join('');
}

// Toggle sidebar on mobile
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const container = document.querySelector('.dashboard-container');
    
    sidebar.classList.toggle('open');
    container.classList.toggle('sidebar-open');
}

// Modal functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        
        // Populate dynamic dropdowns
        if (modalId === 'addCommunicationModal') {
            populateCommunicationDropdown();
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        
        // Reset form if it exists
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
    }
}

// Close modal on background click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});

// Format date and time
function formatDateTime(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) {
        return 'Just now';
    } else if (diffMins < 60) {
        return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}

// Format date only
function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString();
}

// Utility function to format currency
function formatCurrency(amount) {
    return '$' + amount.toFixed(2);
}

// Initialize dashboard on load
document.addEventListener('DOMContentLoaded', () => {
    // Set default view
    switchView('dashboard');
    
    // Update pricing display with user's current plan
    const user = getCurrentUser();
    if (user.plan) {
        const planButton = document.querySelector(`[onclick="selectPlan('${user.plan}')"]`);
        if (planButton) {
            planButton.textContent = 'Current Plan';
            planButton.classList.remove('btn-primary');
            planButton.classList.add('btn-outline');
        }
    }
});

// Update pricing display based on user's plan
function updatePricingDisplay() {
    const user = getCurrentUser();

    // Reset all buttons
    document.querySelectorAll('.pricing-card .btn').forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-outline');
        btn.textContent = 'Select Plan';

        // Check if it's a button for Upgrade or Select
        const onclick = btn.getAttribute('onclick');
        if (onclick) {
            const match = onclick.match(/selectPlan\('([^']+)'\)/);
            if (match) {
                const planKey = match[1];
                if (planKey === 'basic') {
                    btn.textContent = 'Select Plan';
                } else {
                    btn.textContent = 'Upgrade to ' + getPlanDisplayName(planKey);
                }
            }
        }
    });

    // Highlight current plan
    if (user.plan) {
        const currentBtn = document.querySelector(`[onclick="selectPlan('${user.plan}')"]`);
        if (currentBtn) {
            currentBtn.classList.add('btn-primary');
            currentBtn.classList.remove('btn-outline');
            currentBtn.textContent = 'Current Plan';
        }
    }

    // Load payment history
    const payments = getPaymentHistory();
    const container = document.getElementById('paymentHistory');

    if (payments.length === 0) {
        container.innerHTML = '<p class="empty-state">No payments yet.</p>';
        return;
    }

    container.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Plan</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${payments.map(p => `
                    <tr>
                        <td>${formatDate(p.createdAt)}</td>
                        <td>${p.plan ? getPlanDisplayName(p.plan) : 'N/A'}</td>
                        <td>${p.type}</td>
                        <td>$${parseFloat(p.amount).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td>
                            <span class="badge badge-${p.status === 'paid' ? 'blue' : 'orange'}">
                                ${p.status.toUpperCase()}
                            </span>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Helper function to get plan display name
function getPlanDisplayName(planKey) {
    const names = {
        'basic': 'Basic CRM',
        'premium': 'Premium CRM',
        'swift-ai-plus': 'SWIFT AI+',
        'rocket-ai-plus': 'ROCKET AI+'
    };
    return names[planKey] || planKey;
}

// Select/upgrade plan
function selectPlan(plan) {
    const user = getCurrentUser();

    if (user.plan === plan) {
        showNotification('You already have this plan!', 'info');
        return;
    }

    const planNames = {
        'basic': 'Basic CRM',
        'premium': 'Premium CRM',
        'swift-ai-plus': 'SWIFT AI+ Plan',
        'rocket-ai-plus': 'ROCKET AI+ Plan'
    };

    updateUserPlan(plan);
    showNotification(`Plan upgraded to ${planNames[plan]}!`, 'success');
    updatePricingDisplay();
}

// Proceed to payment page
function proceedToPayment(planKey) {
    // Check if user is logged in
    const user = getCurrentUser();
    if (!user || !user.email) {
        showNotification('Please login to continue with payment', 'warning');
        switchView('login');
        return;
    }

    // Redirect to payment page
    window.location.href = './pages/payment.html?plan=' + planKey;
}

// Add table styling
const tableStyle = document.createElement('style');
tableStyle.textContent = `
    .table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 1rem;
    }

    .table thead {
        background-color: var(--light-gray);
    }

    .table th {
        padding: 1rem;
        text-align: left;
        font-weight: 600;
        color: var(--text-dark);
    }

    .table td {
        padding: 0.75rem 1rem;
        border-bottom: 1px solid var(--light-gray);
    }

    .table tbody tr:hover {
        background-color: rgba(0, 102, 204, 0.05);
    }

    .badge {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        border-radius: 2rem;
        font-size: 0.75rem;
        font-weight: 600;
    }
`;
document.head.appendChild(tableStyle);

// Pricing configuration
let currentBillingCycle = 'monthly';

const pricingPlans = {
    basic: {
        name: 'BASIC Plan',
        monthlyPrice: 10,
        yearlyPrice: 100,
        badge: 'Standard',
        features: [
            'Spreadsheet & Document Uploads',
            'Client & Lead Management',
            'Basic Workflow',
            'Financial Goals for Clients',
            'Client Data Management',
            'Communications Management',
            'Email & Calendar Integration',
            'Manual Compliance Tracking',
            'Multi-Factor Authentication',
            'Secure Login'
        ]
    },
    'swift-ai-plus': {
        name: 'SWIFT AI+ Plan',
        monthlyPrice: 50,
        yearlyPrice: 500,
        badge: 'Recommended',
        features: [
            'All BASIC Plan features',
            'API Integration with 3rd Party Financial Analysis Tools',
            'Automatic Email Routing from Workflows',
            'Personalized AI-Suggested Messages & Emails',
            'AI Analysis for Task Re-routing',
            'Payment & Pricing Triggers for Clients',
            'AI-Led Sales Pitch'
        ]
    },
    'rocket-ai-plus': {
        name: 'ROCKET AI+ Plan',
        monthlyPrice: 100,
        yearlyPrice: 1000,
        badge: 'Most Popular',
        features: [
            'All SWIFT AI+ Plan features',
            'Unlimited AI Capabilities',
            'Customized 3rd Party App Connections',
            'Client Retention Management',
            'Cross-Sell & Upsell Pitch',
            'Inactive Relationship Monitoring',
            'Upcoming Life Events Tracking',
            'Automatic AI-Generated Sales Emails',
            'Retention Tactic Emails with AI Analysis',
            'AI-Based Duplicate Cleanser',
            'Predictive Analytics',
            'Template Collaboration & Outsourcing',
            'Meeting Integration with KRI/KPI Documentation',
            'Access to 1000+ Applications & APIs (JIRA, JAMA, SAP Ariba, Proposal Creation, etc.)',
            'Single Sign-On (SSO)'
        ]
    }
};

function switchBillingCycle(cycle) {
    currentBillingCycle = cycle;

    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    event.target.closest('.toggle-btn').classList.add('active');

    loadPricingPlans();
}

function loadPricingPlans() {
    const container = document.getElementById('pricingComparison');
    if (!container) return;

    const isYearly = currentBillingCycle === 'yearly';

    container.innerHTML = Object.entries(pricingPlans).map(([planKey, plan]) => {
        const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
        const period = isYearly ? '/year' : '/month';
        const cardClass = planKey === 'basic' ? '' : planKey === 'swift-ai-plus' ? 'swift-plan' : 'rocket-plan';

        return `
            <div class="pricing-card ${cardClass}">
                <div class="badge badge-${planKey === 'basic' ? 'basic' : planKey === 'swift-ai-plus' ? 'swift' : 'rocket'}">${plan.badge}</div>
                <div class="pricing-header">
                    <h3>${plan.name}</h3>
                    <div class="price">$${price}<span>${period}</span></div>
                </div>
                <ul class="pricing-features">
                    ${plan.features.slice(0, 5).map(feature => `<li><i class="fas fa-check"></i>${feature}</li>`).join('')}
                </ul>
                <button class="btn btn-primary" onclick="proceedToPayment('${planKey}')">Proceed to Payment</button>
            </div>
        `;
    }).join('');

    loadFeatureComparison();
}

function loadFeatureComparison() {
    const container = document.getElementById('featureComparison');
    if (!container) return;

    const features = [
        { name: 'Spreadsheet & Document Uploads', basic: true, swift: true, rocket: true },
        { name: 'Client & Lead Management', basic: true, swift: true, rocket: true },
        { name: 'Basic Workflow', basic: true, swift: true, rocket: true },
        { name: 'Financial Goals', basic: true, swift: true, rocket: true },
        { name: 'Client Data Management', basic: true, swift: true, rocket: true },
        { name: 'Communications', basic: true, swift: true, rocket: true },
        { name: 'Email & Calendar Integration', basic: true, swift: true, rocket: true },
        { name: 'Manual Compliance Tracking', basic: true, swift: true, rocket: true },
        { name: 'MFA & Secure Login', basic: true, swift: true, rocket: true },
        { name: '3rd Party Financial Analysis APIs', basic: false, swift: true, rocket: true },
        { name: 'Automatic Email Routing', basic: false, swift: true, rocket: true },
        { name: 'Personalized AI Messages', basic: false, swift: true, rocket: true },
        { name: 'AI Task Re-routing Analysis', basic: false, swift: true, rocket: true },
        { name: 'Payment/Pricing Triggers', basic: false, swift: true, rocket: true },
        { name: 'AI-Led Sales Pitch', basic: false, swift: true, rocket: true },
        { name: 'Unlimited AI Capabilities', basic: false, swift: false, rocket: true },
        { name: 'Customized 3rd Party Connections', basic: false, swift: false, rocket: true },
        { name: 'Client Retention Management', basic: false, swift: false, rocket: true },
        { name: 'Cross-Sell/Upsell Pitch', basic: false, swift: false, rocket: true },
        { name: 'Inactive Relationship Monitoring', basic: false, swift: false, rocket: true },
        { name: 'Upcoming Life Events Tracking', basic: false, swift: false, rocket: true },
        { name: 'AI-Generated Sales Emails', basic: false, swift: false, rocket: true },
        { name: 'AI-Based Duplicate Cleanser', basic: false, swift: false, rocket: true },
        { name: 'Predictive Analytics', basic: false, swift: false, rocket: true },
        { name: '1000+ App Integrations', basic: false, swift: false, rocket: true },
        { name: 'Single Sign-On (SSO)', basic: false, swift: false, rocket: true }
    ];

    container.innerHTML = `
        <div style="overflow-x: auto;">
            <table class="table">
                <thead>
                    <tr>
                        <th>Feature</th>
                        <th>BASIC</th>
                        <th>SWIFT AI+</th>
                        <th>ROCKET AI+</th>
                    </tr>
                </thead>
                <tbody>
                    ${features.map(feature => `
                        <tr>
                            <td>${feature.name}</td>
                            <td>${feature.basic ? '<i class="fas fa-check" style="color: var(--success); font-weight: bold;"></i>' : '<i class="fas fa-times" style="color: var(--warning); opacity: 0.5;"></i>'}</td>
                            <td>${feature.swift ? '<i class="fas fa-check" style="color: var(--success); font-weight: bold;"></i>' : '<i class="fas fa-times" style="color: var(--warning); opacity: 0.5;"></i>'}</td>
                            <td>${feature.rocket ? '<i class="fas fa-check" style="color: var(--success); font-weight: bold;"></i>' : '<i class="fas fa-times" style="color: var(--warning); opacity: 0.5;"></i>'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}
