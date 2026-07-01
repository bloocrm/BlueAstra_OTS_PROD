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

/* =====================================================
   CLIENTS — persisted in MongoDB via the backend API.
   A synchronous in-memory cache backs getClients() so the
   existing (synchronous) render code keeps working, while
   create/update/delete go to the server and survive logout.
   ===================================================== */

let _clientsCache = [];

// Clear the cache (called on logout)
function clearClientsCache() {
    _clientsCache = [];
}

// Convert a server Client document into the flat shape the UI expects.
// Custom fields are flattened back to the top level; `id` is the Mongo _id
// (operational handle for edit/delete), `clientId` is the friendly unique id.
function mapServerClient(doc) {
    const custom = doc.customFields || {};
    return {
        ...custom,
        _id: doc._id,
        id: doc._id,
        clientId: doc.clientId,
        name: doc.name,
        email: doc.email,
        phone: doc.phone,
        createdAt: doc.createdAt,
        lastModified: doc.updatedAt
    };
}

// Build the request payload: core fields stay top-level (validated by the
// backend), everything else is carried in customFields. Metadata is stripped.
function buildClientPayload(data) {
    const { name, email, phone, _id, id, clientId, createdAt, lastModified, ...rest } = data;
    return { name, email, phone, customFields: rest };
}

// Synchronous accessor used throughout the UI — returns the cached list.
function getClients() {
    return _clientsCache;
}

// Load this user's clients from MongoDB into the cache.
async function loadClientsFromServer() {
    const result = await apiRequest('/clients?page=1&limit=1000', { method: 'GET' });
    const list = Array.isArray(result.data) ? result.data : [];
    _clientsCache = list.map(mapServerClient);
    return _clientsCache;
}

// Create a client in MongoDB, then update the cache.
async function addClient(clientData) {
    const payload = buildClientPayload(clientData);
    const result = await apiRequest('/clients', { method: 'POST', body: payload });
    const client = mapServerClient(result.data);
    _clientsCache.unshift(client);
    return client;
}

// Update a client in MongoDB. Merges with the cached record so that partial
// updates (e.g. the planning/assets tab) don't wipe other custom fields.
async function updateClient(clientId, clientData) {
    const existing = _clientsCache.find(c => c.id === clientId) || {};
    const merged = { ...existing, ...clientData };
    const payload = buildClientPayload(merged);
    const result = await apiRequest(`/clients/${clientId}`, { method: 'PUT', body: payload });
    const client = mapServerClient(result.data);
    const idx = _clientsCache.findIndex(c => c.id === clientId);
    if (idx !== -1) _clientsCache[idx] = client; else _clientsCache.push(client);
    return client;
}

// Soft-delete a client in MongoDB, then update the cache.
async function deleteClient(clientId) {
    await apiRequest(`/clients/${clientId}`, { method: 'DELETE' });
    _clientsCache = _clientsCache.filter(c => c.id !== clientId);
}

/* =====================================================
   LEADS — persisted in MongoDB via /api/leads (cache-backed,
   mirroring the client approach so the sync UI keeps working).
   ===================================================== */

let _leadsCache = [];

function clearLeadsCache() { _leadsCache = []; }

// Map a server Lead doc into the flat shape the UI expects
function mapServerLead(doc) {
    const custom = doc.customFields || {};
    return {
        ...custom,
        _id: doc._id,
        id: doc._id,
        name: doc.name,
        email: doc.email,
        phone: doc.phone,
        company: doc.company,
        status: doc.status,
        source: doc.source,
        notes: doc.notes,
        createdAt: doc.createdAt,
        lastModified: doc.updatedAt
    };
}

// Build the payload: core fields top-level, extras in customFields
function buildLeadPayload(data) {
    const { name, email, phone, company, status, source, notes, _id, id, createdAt, lastModified, ...rest } = data;
    return {
        name, email, phone, company,
        status: status || 'new',
        source, notes,
        customFields: rest
    };
}

// Synchronous accessor used throughout the UI — returns the cached list
function getLeads() { return _leadsCache; }

// Load this user's leads from MongoDB into the cache
async function loadLeadsFromServer() {
    const result = await apiRequest('/leads?page=1&limit=1000', { method: 'GET' });
    const list = Array.isArray(result.data) ? result.data : [];
    _leadsCache = list.map(mapServerLead);
    return _leadsCache;
}

// Create a lead in MongoDB
async function addLead(leadData) {
    const result = await apiRequest('/leads', { method: 'POST', body: buildLeadPayload(leadData) });
    const lead = mapServerLead(result.data);
    _leadsCache.unshift(lead);
    return lead;
}

// Update a lead in MongoDB (merge with cached record for partial updates)
async function updateLead(leadId, leadData) {
    const existing = _leadsCache.find(l => l.id === leadId) || {};
    const merged = { ...existing, ...leadData };
    const result = await apiRequest(`/leads/${leadId}`, { method: 'PUT', body: buildLeadPayload(merged) });
    const lead = mapServerLead(result.data);
    const idx = _leadsCache.findIndex(l => l.id === leadId);
    if (idx !== -1) _leadsCache[idx] = lead; else _leadsCache.push(lead);
    return lead;
}

// Soft-delete a lead in MongoDB
async function deleteLead(leadId) {
    await apiRequest(`/leads/${leadId}`, { method: 'DELETE' });
    _leadsCache = _leadsCache.filter(l => l.id !== leadId);
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
