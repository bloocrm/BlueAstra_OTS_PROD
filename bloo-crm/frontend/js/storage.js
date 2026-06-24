/* =====================================================
   STORAGE & DATA MANAGEMENT
   ===================================================== */

// Get current user
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('currentUser') || '{}');
}

// Save current user data
function saveCurrentUser(user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
}

// Get all clients for current user
function getClients() {
    const user = getCurrentUser();
    return user.clients || [];
}

// Add client
function addClient(clientData) {
    const user = getCurrentUser();
    
    const client = {
        id: Date.now().toString(),
        ...clientData,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
    };
    
    if (!user.clients) {
        user.clients = [];
    }
    
    user.clients.push(client);
    saveCurrentUser(user);
    
    return client;
}

// Update client
function updateClient(clientId, clientData) {
    const user = getCurrentUser();
    
    const clientIndex = user.clients.findIndex(c => c.id === clientId);
    if (clientIndex !== -1) {
        user.clients[clientIndex] = {
            ...user.clients[clientIndex],
            ...clientData,
            lastModified: new Date().toISOString()
        };
        saveCurrentUser(user);
        return user.clients[clientIndex];
    }
    
    return null;
}

// Delete client
function deleteClient(clientId) {
    const user = getCurrentUser();
    
    user.clients = user.clients.filter(c => c.id !== clientId);
    saveCurrentUser(user);
}

// Get all leads for current user
function getLeads() {
    const user = getCurrentUser();
    return user.leads || [];
}

// Add lead
function addLead(leadData) {
    const user = getCurrentUser();
    
    const lead = {
        id: Date.now().toString(),
        ...leadData,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
    };
    
    if (!user.leads) {
        user.leads = [];
    }
    
    user.leads.push(lead);
    saveCurrentUser(user);
    
    return lead;
}

// Update lead
function updateLead(leadId, leadData) {
    const user = getCurrentUser();
    
    const leadIndex = user.leads.findIndex(l => l.id === leadId);
    if (leadIndex !== -1) {
        user.leads[leadIndex] = {
            ...user.leads[leadIndex],
            ...leadData,
            lastModified: new Date().toISOString()
        };
        saveCurrentUser(user);
        return user.leads[leadIndex];
    }
    
    return null;
}

// Delete lead
function deleteLead(leadId) {
    const user = getCurrentUser();
    
    user.leads = user.leads.filter(l => l.id !== leadId);
    saveCurrentUser(user);
}

// Get all communications
function getCommunications() {
    const user = getCurrentUser();
    return user.communications || [];
}

// Add communication
function addCommunication(commData) {
    const user = getCurrentUser();
    
    const communication = {
        id: Date.now().toString(),
        ...commData,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
    };
    
    if (!user.communications) {
        user.communications = [];
    }
    
    user.communications.push(communication);
    saveCurrentUser(user);
    
    // Log workflow activity
    logWorkflowActivity('communication', `Communication logged with ${commData.contactName}`, communication);
    
    return communication;
}

// Get all workflow activities
function getWorkflowActivities() {
    const user = getCurrentUser();
    return user.workflowActivities || [];
}

// Log workflow activity
function logWorkflowActivity(type, description, relatedData = null) {
    const user = getCurrentUser();
    
    const activity = {
        id: Date.now().toString(),
        type: type,
        description: description,
        relatedData: relatedData,
        timestamp: new Date().toISOString(),
        user: user.name,
        userId: user.id
    };
    
    if (!user.workflowActivities) {
        user.workflowActivities = [];
    }
    
    user.workflowActivities.push(activity);
    saveCurrentUser(user);
    
    return activity;
}

// Get recent activities
function getRecentActivities(limit = 10) {
    const communications = getCommunications();
    const leads = getLeads();
    const clients = getClients();
    const workflows = getWorkflowActivities();
    
    const allActivities = [
        ...communications.map(c => ({
            type: 'communication',
            title: `Communication with ${c.contactName}`,
            description: c.notes,
            timestamp: c.createdAt,
            icon: 'comments'
        })),
        ...leads.map(l => ({
            type: 'lead',
            title: `New lead: ${l.name}`,
            description: `Status: ${l.status}`,
            timestamp: l.createdAt,
            icon: 'bullseye'
        })),
        ...clients.map(c => ({
            type: 'client',
            title: `New client: ${c.name}`,
            description: c.industry,
            timestamp: c.createdAt,
            icon: 'user-tie'
        })),
        ...workflows.map(w => ({
            type: 'workflow',
            title: w.description,
            description: w.type,
            timestamp: w.timestamp,
            icon: 'stream'
        }))
    ];
    
    return allActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
}

// Get payment history
function getPaymentHistory() {
    const user = getCurrentUser();
    return user.payments || [];
}

// Get client-specific payments
function getClientPayments(clientId) {
    const user = getCurrentUser();
    const payments = user.payments || [];
    return payments.filter(p => p.clientId === clientId);
}

// Add client payment
function addClientPayment(clientId, paymentData) {
    const user = getCurrentUser();

    const payment = {
        id: Date.now().toString(),
        clientId: clientId,
        ...paymentData,
        createdAt: new Date().toISOString()
    };

    if (!user.payments) {
        user.payments = [];
    }

    user.payments.push(payment);
    saveCurrentUser(user);

    return payment;
}

// Add payment
function addPayment(paymentData) {
    const user = getCurrentUser();
    
    const payment = {
        id: Date.now().toString(),
        ...paymentData,
        createdAt: new Date().toISOString()
    };
    
    if (!user.payments) {
        user.payments = [];
    }
    
    user.payments.push(payment);
    saveCurrentUser(user);
    
    return payment;
}

// Update user plan
function updateUserPlan(plan) {
    const user = getCurrentUser();

    user.plan = plan;
    user.planUpdatedAt = new Date().toISOString();

    // Log the change
    logWorkflowActivity('plan_change', `User upgraded to ${plan} plan`);

    // Add payment record with correct plan pricing
    const planPrices = {
        'basic': 10,
        'premium': 20,
        'swift-ai-plus': 50,
        'rocket-ai-plus': 99
    };

    const planNames = {
        'basic': 'Basic CRM',
        'premium': 'Premium CRM',
        'swift-ai-plus': 'SWIFT AI+ Plan',
        'rocket-ai-plus': 'ROCKET AI+ Plan'
    };

    const planPrice = planPrices[plan] || 0;

    addPayment({
        type: 'subscription',
        plan: plan,
        description: planNames[plan],
        amount: planPrice,
        status: 'paid',
        date: new Date().toISOString()
    });

    saveCurrentUser(user);
}

// Calculate dashboard statistics
function getDashboardStats() {
    const clients = getClients();
    const leads = getLeads();
    const communications = getCommunications();
    const payments = getPaymentHistory();
    
    // Count conversions this month
    const thisMonth = new Date();
    thisMonth.setDate(1);
    
    const conversions = leads.filter(l => 
        l.status === 'converted' && 
        new Date(l.lastModified) >= thisMonth
    ).length;
    
    // Calculate total revenue
    const totalRevenue = payments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + (p.amount || 0), 0);
    
    // Count active leads
    const activeLeads = leads.filter(l => 
        l.status !== 'converted' && l.status !== 'lost'
    ).length;
    
    return {
        totalClients: clients.length,
        activeLeads: activeLeads,
        conversions: conversions,
        totalRevenue: totalRevenue,
        communications: communications.length
    };
}

// Export data for backup
function exportData() {
    const user = getCurrentUser();
    const dataStr = JSON.stringify(user, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bloo-crm-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
}

// Import data from backup
function importData(jsonData) {
    try {
        const data = JSON.parse(jsonData);
        const user = getCurrentUser();

        // Merge data (exclude sensitive fields like password)
        const mergedUser = {
            ...user,
            ...data,
            id: user.id, // Keep original ID
            email: user.email
            // NOTE: password is never stored in localStorage - it's handled server-side only
        };

        saveCurrentUser(mergedUser);
        showNotification('Data imported successfully!', 'success');

        return true;
    } catch (error) {
        showNotification('Error importing data: ' + error.message, 'error');
        return false;
    }
}

// Clear all user data (with confirmation)
function clearAllData() {
    if (confirm('Are you sure? This will delete all your CRM data.')) {
        const user = getCurrentUser();
        user.clients = [];
        user.leads = [];
        user.communications = [];
        user.workflowActivities = [];
        user.payments = [];
        
        saveCurrentUser(user);
        showNotification('All data cleared!', 'success');
        location.reload();
    }
}
