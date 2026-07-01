/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   WORKFLOW & AUDIT LOG MANAGEMENT
   ===================================================== */

// Load workflow activities
function loadWorkflowActivities() {
    const activities = getWorkflowActivities();
    const container = document.getElementById('workflowList');
    
    if (activities.length === 0) {
        container.innerHTML = '<p class="empty-state">No workflow activities yet.</p>';
        return;
    }
    
    // Sort by date (newest first)
    const sorted = [...activities].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    container.innerHTML = sorted.map((activity, index) => `
        <div class="workflow-item">
            <div class="workflow-title">
                <i class="fas fa-${getActivityIcon(activity.type)}"></i>
                ${activity.description}
            </div>
            <div class="workflow-meta">
                <div class="meta-item">
                    <i class="fas fa-user"></i>
                    <span>${activity.user}</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-calendar"></i>
                    <span>${formatDate(activity.timestamp)}</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-clock"></i>
                    <span>${formatTime(activity.timestamp)}</span>
                </div>
            </div>
            <div class="audit-log">
                <strong>Audit Log ID:</strong> ${activity.id.substring(0, 8)}...<br>
                <strong>Activity Type:</strong> ${capitalizeFirst(activity.type)}<br>
                <strong>Timestamp:</strong> ${new Date(activity.timestamp).toLocaleString()}<br>
                <strong>User ID:</strong> ${activity.userId}
            </div>
        </div>
    `).join('');
}

// Filter workflow activities
function filterWorkflow() {
    const filter = document.getElementById('workflowFilter').value;
    const activities = getWorkflowActivities();
    const container = document.getElementById('workflowList');
    
    let filtered = activities;
    
    if (filter) {
        filtered = activities.filter(a => a.type.includes(filter));
    }
    
    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-state">No activities found for this filter.</p>';
        return;
    }
    
    // Sort by date (newest first)
    const sorted = [...filtered].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    container.innerHTML = sorted.map((activity, index) => `
        <div class="workflow-item">
            <div class="workflow-title">
                <i class="fas fa-${getActivityIcon(activity.type)}"></i>
                ${activity.description}
            </div>
            <div class="workflow-meta">
                <div class="meta-item">
                    <i class="fas fa-user"></i>
                    <span>${activity.user}</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-calendar"></i>
                    <span>${formatDate(activity.timestamp)}</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-clock"></i>
                    <span>${formatTime(activity.timestamp)}</span>
                </div>
            </div>
            <div class="audit-log">
                <strong>Audit Log ID:</strong> ${activity.id.substring(0, 8)}...<br>
                <strong>Activity Type:</strong> ${capitalizeFirst(activity.type)}<br>
                <strong>Timestamp:</strong> ${new Date(activity.timestamp).toLocaleString()}<br>
                <strong>User ID:</strong> ${activity.userId}
            </div>
        </div>
    `).join('');
}

// Get icon for activity type
function getActivityIcon(type) {
    const icons = {
        'communication': 'comments',
        'client_added': 'user-plus',
        'client_updated': 'user-edit',
        'client_deleted': 'user-minus',
        'lead_added': 'bullseye',
        'lead_updated': 'pen',
        'lead_status_changed': 'exchange-alt',
        'lead_converted': 'check-circle',
        'lead_deleted': 'times-circle',
        'plan_change': 'crown',
        'workflow': 'stream'
    };
    return icons[type] || 'circle';
}

// Format time only
function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Get workflow summary for a contact
function getContactWorkflow(contactId) {
    const activities = getWorkflowActivities();
    return activities.filter(a => 
        a.relatedData && a.relatedData.contactId === contactId
    );
}

// Get communication history for a contact with workflow
function getContactCommunicationTimeline(contactId) {
    const communications = getContactCommunications(contactId);
    const workflows = getContactWorkflow(contactId);
    
    const timeline = [
        ...communications.map(c => ({
            type: 'communication',
            title: `${capitalizeFirst(c.type)} with ${c.communicatedWith}`,
            description: c.notes,
            timestamp: c.dateTime,
            metadata: {
                duration: c.duration,
                type: c.type,
                with: c.communicatedWith
            }
        })),
        ...workflows.map(w => ({
            type: 'workflow',
            title: w.description,
            description: w.type,
            timestamp: w.timestamp,
            metadata: w.relatedData
        }))
    ];
    
    return timeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// Generate audit report
function generateAuditReport(days = 30) {
    const activities = getWorkflowActivities();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const report = activities.filter(a => new Date(a.timestamp) >= cutoffDate);
    
    const summary = {
        totalActivities: report.length,
        dateRange: `Last ${days} days`,
        byType: {},
        byUser: {},
        byDate: {}
    };
    
    report.forEach(activity => {
        // By type
        if (!summary.byType[activity.type]) {
            summary.byType[activity.type] = 0;
        }
        summary.byType[activity.type]++;
        
        // By user
        if (!summary.byUser[activity.user]) {
            summary.byUser[activity.user] = 0;
        }
        summary.byUser[activity.user]++;
        
        // By date
        const date = formatDate(activity.timestamp);
        if (!summary.byDate[date]) {
            summary.byDate[date] = 0;
        }
        summary.byDate[date]++;
    });
    
    return { summary, activities: report };
}

// Export audit log
function exportAuditLog() {
    const { summary, activities } = generateAuditReport();
    
    let csvContent = 'Bloo CRM - Audit Log Export\n';
    csvContent += `Generated: ${new Date().toLocaleString()}\n\n`;
    
    csvContent += 'SUMMARY\n';
    csvContent += `Total Activities,${summary.totalActivities}\n`;
    csvContent += `Date Range,${summary.dateRange}\n\n`;
    
    csvContent += 'ACTIVITIES BY TYPE\n';
    csvContent += 'Type,Count\n';
    Object.entries(summary.byType).forEach(([type, count]) => {
        csvContent += `${type},${count}\n`;
    });
    
    csvContent += '\nACTIVITIES BY USER\n';
    csvContent += 'User,Count\n';
    Object.entries(summary.byUser).forEach(([user, count]) => {
        csvContent += `${user},${count}\n`;
    });
    
    csvContent += '\nDETAILED LOG\n';
    csvContent += 'Timestamp,User,Activity Type,Description\n';
    activities.forEach(activity => {
        csvContent += `"${new Date(activity.timestamp).toLocaleString()}","${activity.user}","${activity.type}","${activity.description}"\n`;
    });
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
}

// Get high-level workflow summary
function getWorkflowSummary() {
    const activities = getWorkflowActivities();
    const communications = getCommunications();
    const clients = getClients();
    const leads = getLeads();
    
    const summary = {
        totalActivities: activities.length,
        totalCommunications: communications.length,
        activeClients: clients.length,
        activeLeads: leads.filter(l => l.status !== 'lost' && l.status !== 'converted').length,
        convertedLeads: leads.filter(l => l.status === 'converted').length,
        lastActivityTime: activities.length > 0 ? activities[activities.length - 1].timestamp : null
    };
    
    return summary;
}

/* =====================================================
   AI-POWERED WORKFLOW FEATURES
   ===================================================== */

// SWIFT AI+ Features
const swiftAIPlusFeatures = {
    name: 'SWIFT AI+ Plan',
    price: '$50/month',
    description: 'Intelligent Email Automation & Workflow Management',
    features: [
        {
            icon: 'fa-envelope-circle-check',
            title: 'AI Workflow Emails',
            description: 'Automated email triggers based on client events and milestones'
        },
        {
            icon: 'fa-file-invoice',
            title: 'Template-Based Emails',
            description: 'Pre-built professional email templates for common scenarios'
        },
        {
            icon: 'fa-zap',
            title: 'Event-Based Automation',
            description: 'Trigger emails automatically when specific events occur'
        },
        {
            icon: 'fa-bell',
            title: 'Payment Notifications',
            description: 'Automatic payment due reminders sent to clients'
        },
        {
            icon: 'fa-sparkles',
            title: 'Lead Response Emails',
            description: 'AI-customized responses to lead inquiries'
        },
        {
            icon: 'fa-gift',
            title: 'Upgrade Offers',
            description: 'Auto-send new plans and brochures for client upgrades'
        },
        {
            icon: 'fa-file-shield',
            title: 'Compliance Alerts',
            description: 'Automatic audit event and compliance detail notifications'
        }
    ]
};

// ROCKET AI+ Features
const rocketAIPlusFeatures = {
    name: 'ROCKET AI+ Plan',
    price: '$99/month',
    description: 'Enterprise AI-Powered Business Management Suite',
    features: [
        { category: 'Workflow & Team Management', items: [
            'Employee Absence Detection & Auto Task Re-routing',
            '4-Eye Check System Health Monitoring',
            'Task Counting & Team Performance Analytics',
            'One-Eyed AI-Based Team Tracking'
        ]},
        { category: 'Sales & Conversion', items: [
            'AI Conversion Assistance',
            'AI Cross-Sell & Upsell Sales Pitches',
            'AI-Operated Sales Process Automation',
            'Automatic AI-Generated Sales Pitch Emails'
        ]},
        { category: 'Client Intelligence', items: [
            'Inactive Relationship Management',
            'Upcoming Life Events Tracking',
            'Opportunities Needing Attention Alerts',
            'Predictive Analytics of Client Movements',
            'AI Customized Retention Tactic Emails'
        ]},
        { category: 'Data & Integration', items: [
            'AI-Based Duplicates Cleanser',
            'Duplicate Entry Analysis & Merge Highlighting',
            'Integration with JIRA/JAMA',
            'SAP Ariba Vendor Management Integration',
            'Leads Management Systems Integration',
            'Zapier Application Integrations (Trello, Agile Tools)'
        ]},
        { category: 'Meetings & Knowledge', items: [
            'Separate Meeting Room Features',
            'AI-Let Meeting Minutes Generation',
            'AI Guidance for RFP/RFI'
        ]}
    ]
};

// Load AI workflow features based on plan
function loadAIWorkflowFeatures() {
    const user = getCurrentUser();
    const userPlan = user.plan || 'basic';
    const container = document.getElementById('aiWorkflowSection');

    if (!container) return;

    if (userPlan === 'basic' || userPlan === 'premium') {
        // Show upgrade prompts for Basic and Premium users
        container.innerHTML = `
            <div class="ai-workflow-container">
                <div class="upgrade-section-wrapper">
                    <!-- SWIFT AI+ Section -->
                    <div class="ai-upgrade-card">
                        <div class="ai-upgrade-header">
                            <div class="plan-badge swift-badge">SWIFT AI+</div>
                            <h3>${swiftAIPlusFeatures.name}</h3>
                            <div class="plan-price">${swiftAIPlusFeatures.price}</div>
                            <p class="plan-description">${swiftAIPlusFeatures.description}</p>
                        </div>
                        <div class="ai-features-list">
                            ${swiftAIPlusFeatures.features.map(f => `
                                <div class="ai-feature-item">
                                    <i class="fas ${f.icon}"></i>
                                    <div class="feature-text">
                                        <strong>${f.title}</strong>
                                        <p>${f.description}</p>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        <button class="btn btn-primary btn-upgrade" onclick="selectPlan('swift-ai-plus')">
                            <i class="fas fa-arrow-up"></i> Upgrade to SWIFT AI+
                        </button>
                    </div>

                    <!-- ROCKET AI+ Section -->
                    <div class="ai-upgrade-card rocket-card">
                        <div class="ai-upgrade-header rocket-header">
                            <div class="plan-badge rocket-badge">ROCKET AI+</div>
                            <h3>${rocketAIPlusFeatures.name}</h3>
                            <div class="plan-price">${rocketAIPlusFeatures.price}</div>
                            <p class="plan-description">${rocketAIPlusFeatures.description}</p>
                        </div>
                        <div class="ai-features-list rocket-features">
                            ${rocketAIPlusFeatures.features.map(cat => `
                                <div class="feature-category">
                                    <h5>${cat.category}</h5>
                                    <ul>
                                        ${cat.items.map(item => `<li><i class="fas fa-check-circle"></i> ${item}</li>`).join('')}
                                    </ul>
                                </div>
                            `).join('')}
                        </div>
                        <button class="btn btn-primary btn-upgrade rocket-upgrade" onclick="selectPlan('rocket-ai-plus')">
                            <i class="fas fa-rocket"></i> Upgrade to ROCKET AI+
                        </button>
                        <p class="enterprise-note"><i class="fas fa-crown"></i> Enterprise-Grade AI Automation</p>
                    </div>
                </div>
            </div>
        `;
    } else if (userPlan === 'swift-ai-plus') {
        // Show SWIFT AI+ features with upgrade option to ROCKET AI+
        container.innerHTML = `
            <div class="ai-workflow-container">
                <div class="active-plan-section">
                    <div class="active-plan-badge">
                        <i class="fas fa-check-circle"></i> SWIFT AI+ Active
                    </div>
                    <h3>Your Active AI Features</h3>
                    <div class="ai-features-list active">
                        ${swiftAIPlusFeatures.features.map(f => `
                            <div class="ai-feature-item active">
                                <i class="fas ${f.icon}"></i>
                                <div class="feature-text">
                                    <strong>${f.title}</strong>
                                    <p>${f.description}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Upgrade to ROCKET AI+ -->
                <div class="upgrade-to-rocket">
                    <div class="rocket-promo">
                        <div class="rocket-icon">
                            <i class="fas fa-rocket"></i>
                        </div>
                        <h3>Ready for More? Upgrade to ROCKET AI+</h3>
                        <p>Take your business to the next level with enterprise-grade AI automation.</p>
                        <div class="rocket-comparison">
                            <div class="comparison-item">
                                <strong>Employee & Team Management:</strong> AI handles absences, task routing, health monitoring
                            </div>
                            <div class="comparison-item">
                                <strong>Advanced Sales AI:</strong> Cross-sell/upsell automation, AI-operated sales process
                            </div>
                            <div class="comparison-item">
                                <strong>Client Intelligence:</strong> Predictive analytics, relationship management, life event tracking
                            </div>
                            <div class="comparison-item">
                                <strong>Enterprise Integration:</strong> JIRA, SAP Ariba, Zapier, and 50+ more platforms
                            </div>
                        </div>
                        <button class="btn btn-primary btn-upgrade rocket-upgrade" onclick="selectPlan('rocket-ai-plus')">
                            <i class="fas fa-rocket"></i> Upgrade to ROCKET AI+ - $99/month
                        </button>
                    </div>
                </div>
            </div>
        `;
    } else if (userPlan === 'rocket-ai-plus') {
        // Show ROCKET AI+ features
        container.innerHTML = `
            <div class="ai-workflow-container">
                <div class="active-plan-section rocket-active">
                    <div class="active-plan-badge rocket-active-badge">
                        <i class="fas fa-check-circle"></i> ROCKET AI+ - Enterprise Edition
                    </div>
                    <h3>All AI Features Unlocked</h3>
                    <p class="plan-subtitle">Your business is now powered by enterprise-grade AI automation.</p>

                    <div class="rocket-features-grid">
                        ${rocketAIPlusFeatures.features.map(cat => `
                            <div class="feature-category-box">
                                <h4>${cat.category}</h4>
                                <ul>
                                    ${cat.items.map(item => `<li><i class="fas fa-check-circle"></i> ${item}</li>`).join('')}
                                </ul>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
}

// Initialize AI workflow features on workflow view load
function initializeAIWorkflow() {
    loadAIWorkflowFeatures();
}
