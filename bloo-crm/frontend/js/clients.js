/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   CLIENT MANAGEMENT
   ===================================================== */

// Handle add client form submission
function handleAddClient(event) {
    event.preventDefault();

    const documentInput = document.getElementById('clientDocument');
    const documentFile = documentInput?.files[0];

    // Validate file if uploaded
    if (documentFile) {
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/jpeg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(documentFile.type)) {
            showNotification('Invalid file type. Please upload PDF, Word, Text, Excel, or Image files.', 'error');
            return;
        }
        if (documentFile.size > 10485760) { // 10MB limit
            showNotification('File size exceeds 10MB limit.', 'error');
            return;
        }

        // Convert file to base64
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64Data = e.target.result;
            saveClientWithFile(base64Data, documentFile);
        };
        reader.readAsDataURL(documentFile);
    } else {
        saveClientWithFile(null, null);
    }
}

// Save client with file data
async function saveClientWithFile(fileData, fileObj) {
    const clientData = {
        name: document.getElementById('clientName').value,
        email: document.getElementById('clientEmail').value,
        phone: document.getElementById('clientPhone').value,
        altPhone: document.getElementById('clientAltPhone').value,
        address: document.getElementById('clientAddress').value,
        officialAddress: document.getElementById('clientOfficialAddress').value,
        businessType: document.getElementById('clientBusinessType').value,
        industry: document.getElementById('clientIndustry').value,
        lob: document.getElementById('clientLOB').value,
        ssn: document.getElementById('clientSSN').value,
        spouseName: document.getElementById('clientSpouseName').value,
        childrenNames: document.getElementById('clientChildrenNames').value,
        beneficiaries: document.getElementById('clientBeneficiaries').value,
        insuranceDetails: document.getElementById('clientInsuranceDetails').value,
        investmentAccount1: document.getElementById('clientInvestmentAccount1').value,
        investmentAccount2: document.getElementById('clientInvestmentAccount2').value,
        officeAddress1: document.getElementById('clientOfficeAddress1').value,
        officeAddress2: document.getElementById('clientOfficeAddress2').value,
        accountant1Name: document.getElementById('clientAccountant1Name').value,
        accountant1Contact: document.getElementById('clientAccountant1Contact').value,
        accountant2Name: document.getElementById('clientAccountant2Name').value,
        accountant2Contact: document.getElementById('clientAccountant2Contact').value,
        attorney1Name: document.getElementById('clientAttorney1Name').value,
        attorney1Contact: document.getElementById('clientAttorney1Contact').value,
        attorney2Name: document.getElementById('clientAttorney2Name').value,
        attorney2Contact: document.getElementById('clientAttorney2Contact').value,
        details: document.getElementById('clientDetails').value,
        documentName: fileObj?.name || null,
        documentData: fileData,
        documentType: fileObj?.type || null,
        retirementGoals: '',
        collegeFunding: '',
        estatePlanning: '',
        wealthAccumulation: '',
        majorLifeEvents: '',
        totalAUM: 0,
        accountBalances: 0,
        cashHoldings: 0,
        investmentAccounts: 0,
        totalLiabilities: 0
    };

    // Add client to MongoDB via the backend
    try {
        await addClient(clientData);

        // Log workflow activity
        logWorkflowActivity('client_added', `New client added: ${clientData.name}`);

        // Show success message
        showNotification(`Client ${clientData.name} added successfully!`, 'success');

        // Close modal and reload clients
        closeModal('addClientModal');
        loadClientsList();
        loadClientDashboard();

        // Update dashboard stats
        loadDashboardStats();
    } catch (error) {
        showNotification(error.message || 'Failed to save client', 'error');
    }
}

// Load clients list
function loadClientsList() {
    const clients = getClients();
    const container = document.getElementById('clientsList');

    if (clients.length === 0) {
        container.innerHTML = '<p class="empty-state">No clients yet. Start by adding a new client!</p>';
        return;
    }

    container.innerHTML = clients.map(client => `
        <div class="client-card">
            <div class="card-header-info">
                <h3 class="client-name">${client.name}</h3>
                <span class="client-badge badge-blue">${client.businessType}</span>
            </div>
            <div class="client-email">
                <i class="fas fa-envelope"></i>
                <a href="mailto:${client.email}">${client.email}</a>
            </div>
            <div class="client-phone">
                <i class="fas fa-phone"></i>
                ${client.phone}
            </div>
            ${client.altPhone ? `
                <div class="client-phone">
                    <i class="fas fa-phone"></i>
                    ${client.altPhone}
                </div>
            ` : ''}
            <div style="margin-top: 0.75rem; font-size: 0.9rem; color: var(--text-light);">
                <strong>Industry:</strong> ${client.industry}
                <br>
                <strong>Business Type:</strong> ${client.businessType}
                ${client.lob ? `<br><strong>LOB:</strong> ${client.lob}` : ''}
                ${client.spouseName ? `<br><strong>Spouse:</strong> ${client.spouseName}` : ''}
                ${client.childrenNames ? `<br><strong>Children:</strong> ${client.childrenNames}` : ''}
                ${client.accountant1Name ? `<br><strong>Accountant 1:</strong> ${client.accountant1Name}` : ''}
                ${client.attorney1Name ? `<br><strong>Attorney 1:</strong> ${client.attorney1Name}` : ''}
                ${client.documentName ? `<br><strong>Document:</strong> ${client.documentName}` : ''}
            </div>
            <div style="margin-top: 0.75rem; font-size: 0.85rem; color: var(--text-light);">
                Added: ${formatDate(client.createdAt)}
            </div>
            <div class="card-actions">
                <button class="btn-edit" onclick="editClient('${client.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn-delete" onclick="deleteClientConfirm('${client.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

// Filter clients by search
function filterClients() {
    const searchTerm = document.getElementById('clientSearch').value.toLowerCase();
    const clients = getClients();
    const filtered = clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm) ||
        client.email.toLowerCase().includes(searchTerm) ||
        client.phone.includes(searchTerm) ||
        (client.spouseName && client.spouseName.toLowerCase().includes(searchTerm)) ||
        (client.childrenNames && client.childrenNames.toLowerCase().includes(searchTerm)) ||
        (client.accountant1Name && client.accountant1Name.toLowerCase().includes(searchTerm)) ||
        (client.accountant2Name && client.accountant2Name.toLowerCase().includes(searchTerm)) ||
        (client.attorney1Name && client.attorney1Name.toLowerCase().includes(searchTerm)) ||
        (client.attorney2Name && client.attorney2Name.toLowerCase().includes(searchTerm))
    );

    const container = document.getElementById('clientsList');

    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-state">No clients found.</p>';
        return;
    }

    container.innerHTML = filtered.map(client => `
        <div class="client-card">
            <div class="card-header-info">
                <h3 class="client-name">${client.name}</h3>
                <span class="client-badge badge-blue">${client.businessType}</span>
            </div>
            <div class="client-email">
                <i class="fas fa-envelope"></i>
                <a href="mailto:${client.email}">${client.email}</a>
            </div>
            <div class="client-phone">
                <i class="fas fa-phone"></i>
                ${client.phone}
            </div>
            ${client.altPhone ? `
                <div class="client-phone">
                    <i class="fas fa-phone"></i>
                    ${client.altPhone}
                </div>
            ` : ''}
            <div style="margin-top: 0.75rem; font-size: 0.9rem; color: var(--text-light);">
                <strong>Industry:</strong> ${client.industry}
                <br>
                <strong>Business Type:</strong> ${client.businessType}
                ${client.lob ? `<br><strong>LOB:</strong> ${client.lob}` : ''}
                ${client.spouseName ? `<br><strong>Spouse:</strong> ${client.spouseName}` : ''}
                ${client.childrenNames ? `<br><strong>Children:</strong> ${client.childrenNames}` : ''}
                ${client.accountant1Name ? `<br><strong>Accountant 1:</strong> ${client.accountant1Name}` : ''}
                ${client.attorney1Name ? `<br><strong>Attorney 1:</strong> ${client.attorney1Name}` : ''}
                ${client.documentName ? `<br><strong>Document:</strong> ${client.documentName}` : ''}
            </div>
            <div style="margin-top: 0.75rem; font-size: 0.85rem; color: var(--text-light);">
                Added: ${formatDate(client.createdAt)}
            </div>
            <div class="card-actions">
                <button class="btn-edit" onclick="editClient('${client.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn-delete" onclick="deleteClientConfirm('${client.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

// Edit client
function editClient(clientId) {
    const clients = getClients();
    const client = clients.find(c => c.id === clientId);

    if (!client) return;

    // Populate modal with client data
    document.getElementById('clientName').value = client.name;
    document.getElementById('clientEmail').value = client.email;
    document.getElementById('clientPhone').value = client.phone;
    document.getElementById('clientAltPhone').value = client.altPhone || '';
    document.getElementById('clientAddress').value = client.address;
    document.getElementById('clientOfficialAddress').value = client.officialAddress || '';
    document.getElementById('clientBusinessType').value = client.businessType;
    document.getElementById('clientIndustry').value = client.industry;
    document.getElementById('clientLOB').value = client.lob || '';
    document.getElementById('clientSSN').value = client.ssn || '';
    document.getElementById('clientSpouseName').value = client.spouseName || '';
    document.getElementById('clientChildrenNames').value = client.childrenNames || '';
    document.getElementById('clientBeneficiaries').value = client.beneficiaries || '';
    document.getElementById('clientInsuranceDetails').value = client.insuranceDetails || '';
    document.getElementById('clientInvestmentAccount1').value = client.investmentAccount1 || '';
    document.getElementById('clientInvestmentAccount2').value = client.investmentAccount2 || '';
    document.getElementById('clientOfficeAddress1').value = client.officeAddress1 || '';
    document.getElementById('clientOfficeAddress2').value = client.officeAddress2 || '';
    document.getElementById('clientAccountant1Name').value = client.accountant1Name || '';
    document.getElementById('clientAccountant1Contact').value = client.accountant1Contact || '';
    document.getElementById('clientAccountant2Name').value = client.accountant2Name || '';
    document.getElementById('clientAccountant2Contact').value = client.accountant2Contact || '';
    document.getElementById('clientAttorney1Name').value = client.attorney1Name || '';
    document.getElementById('clientAttorney1Contact').value = client.attorney1Contact || '';
    document.getElementById('clientAttorney2Name').value = client.attorney2Name || '';
    document.getElementById('clientAttorney2Contact').value = client.attorney2Contact || '';
    document.getElementById('clientDetails').value = client.details || '';

    // Change button text
    const modal = document.getElementById('addClientModal');
    const form = modal.querySelector('form');
    const submitButton = form.querySelector('button[type="submit"]');

    // Remove old listener and add new one
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    newForm.onsubmit = async (event) => {
        event.preventDefault();

        const documentInput = newForm.querySelector('#clientDocument');
        const documentFile = documentInput?.files[0];

        const clientData = {
            name: document.getElementById('clientName').value,
            email: document.getElementById('clientEmail').value,
            phone: document.getElementById('clientPhone').value,
            altPhone: document.getElementById('clientAltPhone').value,
            address: document.getElementById('clientAddress').value,
            officialAddress: document.getElementById('clientOfficialAddress').value,
            businessType: document.getElementById('clientBusinessType').value,
            industry: document.getElementById('clientIndustry').value,
            lob: document.getElementById('clientLOB').value,
            ssn: document.getElementById('clientSSN').value,
            spouseName: document.getElementById('clientSpouseName').value,
            childrenNames: document.getElementById('clientChildrenNames').value,
            beneficiaries: document.getElementById('clientBeneficiaries').value,
            insuranceDetails: document.getElementById('clientInsuranceDetails').value,
            investmentAccount1: document.getElementById('clientInvestmentAccount1').value,
            investmentAccount2: document.getElementById('clientInvestmentAccount2').value,
            officeAddress1: document.getElementById('clientOfficeAddress1').value,
            officeAddress2: document.getElementById('clientOfficeAddress2').value,
            accountant1Name: document.getElementById('clientAccountant1Name').value,
            accountant1Contact: document.getElementById('clientAccountant1Contact').value,
            accountant2Name: document.getElementById('clientAccountant2Name').value,
            accountant2Contact: document.getElementById('clientAccountant2Contact').value,
            attorney1Name: document.getElementById('clientAttorney1Name').value,
            attorney1Contact: document.getElementById('clientAttorney1Contact').value,
            attorney2Name: document.getElementById('clientAttorney2Name').value,
            attorney2Contact: document.getElementById('clientAttorney2Contact').value,
            details: document.getElementById('clientDetails').value,
            documentName: documentFile?.name || client.documentName,
            retirementGoals: client.retirementGoals || '',
            collegeFunding: client.collegeFunding || '',
            estatePlanning: client.estatePlanning || '',
            wealthAccumulation: client.wealthAccumulation || '',
            majorLifeEvents: client.majorLifeEvents || '',
            totalAUM: client.totalAUM || 0,
            accountBalances: client.accountBalances || 0,
            cashHoldings: client.cashHoldings || 0,
            investmentAccounts: client.investmentAccounts || 0,
            totalLiabilities: client.totalLiabilities || 0
        };

        try {
            await updateClient(clientId, clientData);
            logWorkflowActivity('client_updated', `Client updated: ${clientData.name}`);

            showNotification('Client updated successfully!', 'success');
            closeModal('addClientModal');
            loadClientsList();
            loadClientDashboard();

            // Restore original form
            newForm.onsubmit = handleAddClient;
        } catch (error) {
            showNotification(error.message || 'Failed to update client', 'error');
        }
    };

    showModal('addClientModal');
}

// Delete client with confirmation
async function deleteClientConfirm(clientId) {
    const clients = getClients();
    const client = clients.find(c => c.id === clientId);

    if (!client) return;

    if (confirm(`Are you sure you want to delete ${client.name}?`)) {
        try {
            await deleteClient(clientId);
            logWorkflowActivity('client_deleted', `Client deleted: ${client.name}`);

            showNotification(`${client.name} deleted!`, 'success');
            loadClientsList();
            loadClientDashboard();
            loadDashboardStats();
        } catch (error) {
            showNotification(error.message || 'Failed to delete client', 'error');
        }
    }
}

// Get all contacts (clients and leads) for communication dropdown
function populateCommunicationDropdown() {
    const clients = getClients();
    const leads = getLeads();
    
    const select = document.getElementById('commContact');
    
    select.innerHTML = '<option value="">Select Contact</option>';
    
    if (clients.length > 0) {
        select.innerHTML += '<optgroup label="Clients">';
        clients.forEach(client => {
            select.innerHTML += `<option value="${client.id}" data-name="${client.name}">👤 ${client.name}</option>`;
        });
        select.innerHTML += '</optgroup>';
    }
    
    if (leads.length > 0) {
        select.innerHTML += '<optgroup label="Leads">';
        leads.forEach(lead => {
            select.innerHTML += `<option value="${lead.id}" data-name="${lead.name}">🔥 ${lead.name}</option>`;
        });
        select.innerHTML += '</optgroup>';
    }
}

// Load clients and leads for dashboard
function loadAllContacts() {
    const clients = getClients();
    const leads = getLeads();
    return { clients, leads };
}

// Get contact name by ID
function getContactName(contactId) {
    const { clients, leads } = loadAllContacts();

    const client = clients.find(c => c.id === contactId);
    if (client) return client.name;

    const lead = leads.find(l => l.id === contactId);
    if (lead) return lead.name;

    return 'Unknown Contact';
}

/* =====================================================
   CLIENT DASHBOARD FUNCTIONS
   ===================================================== */

// Load client dashboard
function loadClientDashboard() {
    const clients = getClients();
    const container = document.getElementById('dashboardClientsList');

    if (clients.length === 0) {
        container.innerHTML = '<p class="empty-state">No clients yet. Add clients from Client List tab.</p>';
        return;
    }

    container.innerHTML = clients.map(client => `
        <div class="client-box">
            <div class="client-box-id">Client ID: ${client.clientId || client.id}</div>
            <div class="client-box-name">${client.name}</div>
            <div class="client-box-info">
                <i class="fas fa-envelope"></i>
                <span>${client.email}</span>
            </div>
            <div class="client-box-info">
                <i class="fas fa-phone"></i>
                <span>${client.phone}</span>
            </div>
            <div class="client-box-info">
                <i class="fas fa-briefcase"></i>
                <span>${client.businessType}</span>
            </div>
            <div class="client-box-action">
                <button class="btn btn-primary" onclick="viewClientDetails('${client.id}')">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="btn btn-secondary" onclick="viewClientEmails('${client.id}')">
                    <i class="fas fa-envelope"></i> View Emails
                </button>
                <button class="btn btn-secondary" onclick="viewClientMeetings('${client.id}')">
                    <i class="fas fa-video"></i> View Meetings
                </button>
            </div>
        </div>
    `).join('');
}

// Filter clients in dashboard
function filterClientDashboard() {
    const searchTerm = document.getElementById('dashboardSearch').value.toLowerCase();
    const clients = getClients();
    const filtered = clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm) ||
        client.email.toLowerCase().includes(searchTerm) ||
        client.phone.includes(searchTerm) ||
        (client.clientId || '').toLowerCase().includes(searchTerm)
    );

    const container = document.getElementById('dashboardClientsList');

    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-state">No clients found.</p>';
        return;
    }

    container.innerHTML = filtered.map(client => `
        <div class="client-box">
            <div class="client-box-id">Client ID: ${client.clientId || client.id}</div>
            <div class="client-box-name">${client.name}</div>
            <div class="client-box-info">
                <i class="fas fa-envelope"></i>
                <span>${client.email}</span>
            </div>
            <div class="client-box-info">
                <i class="fas fa-phone"></i>
                <span>${client.phone}</span>
            </div>
            <div class="client-box-info">
                <i class="fas fa-briefcase"></i>
                <span>${client.businessType}</span>
            </div>
            <div class="client-box-action">
                <button class="btn btn-primary" onclick="viewClientDetails('${client.id}')">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="btn btn-secondary" onclick="viewClientEmails('${client.id}')">
                    <i class="fas fa-envelope"></i> View Emails
                </button>
                <button class="btn btn-secondary" onclick="viewClientMeetings('${client.id}')">
                    <i class="fas fa-video"></i> View Meetings
                </button>
            </div>
        </div>
    `).join('');
}

// View client details
function viewClientDetails(clientId) {
    const clients = getClients();
    const client = clients.find(c => c.id === clientId);

    if (!client) return;

    // Populate detail view
    document.getElementById('detailClientName').textContent = client.name;
    document.getElementById('detailClientID').textContent = `ID: ${client.clientId || client.id}`;

    // Overview tab data
    document.getElementById('d-email').textContent = client.email || 'N/A';
    document.getElementById('d-phone').textContent = client.phone || 'N/A';
    document.getElementById('d-spouse').textContent = client.spouseName || 'N/A';
    document.getElementById('d-children').textContent = client.childrenNames || 'N/A';
    document.getElementById('d-businessType').textContent = client.businessType || 'N/A';
    document.getElementById('d-industry').textContent = client.industry || 'N/A';
    document.getElementById('d-lob').textContent = client.lob || 'N/A';
    document.getElementById('d-address').textContent = client.address || 'N/A';

    // Professional contacts
    document.getElementById('d-accountant1').textContent = client.accountant1Name ?
        `${client.accountant1Name} (${client.accountant1Contact || 'N/A'})` : 'N/A';
    document.getElementById('d-attorney1').textContent = client.attorney1Name ?
        `${client.attorney1Name} (${client.attorney1Contact || 'N/A'})` : 'N/A';
    document.getElementById('d-accountant2').textContent = client.accountant2Name ?
        `${client.accountant2Name} (${client.accountant2Contact || 'N/A'})` : 'N/A';
    document.getElementById('d-attorney2').textContent = client.attorney2Name ?
        `${client.attorney2Name} (${client.attorney2Contact || 'N/A'})` : 'N/A';

    // Planning tab data
    document.getElementById('d-retirementGoals').textContent = client.retirementGoals || 'Not specified';
    document.getElementById('d-collegeFunding').textContent = client.collegeFunding || 'Not specified';
    document.getElementById('d-estatePlanning').textContent = client.estatePlanning || 'Not specified';
    document.getElementById('d-wealthAccumulation').textContent = client.wealthAccumulation || 'Not specified';
    document.getElementById('d-majorLifeEvents').textContent = client.majorLifeEvents || 'Not specified';

    // Assets tab data
    const totalAUM = parseFloat(client.totalAUM) || 0;
    const accountBalances = parseFloat(client.accountBalances) || 0;
    const cashHoldings = parseFloat(client.cashHoldings) || 0;
    const investmentAccounts = parseFloat(client.investmentAccounts) || 0;
    const totalLiabilities = parseFloat(client.totalLiabilities) || 0;
    const netWorth = (totalAUM + accountBalances + cashHoldings + investmentAccounts) - totalLiabilities;

    document.getElementById('d-totalAUM').textContent = '$' + totalAUM.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('d-accountBalances').textContent = '$' + accountBalances.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('d-cashHoldings').textContent = '$' + cashHoldings.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('d-investmentAccounts').textContent = '$' + investmentAccounts.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('d-totalLiabilities').textContent = '$' + totalLiabilities.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('d-netWorth').textContent = '$' + netWorth.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

    // Payments tab data
    const clientPayments = getClientPayments(clientId);
    const pendingPayments = clientPayments.filter(p => p.status === 'pending');
    const allPayments = clientPayments;

    // Display pending payments
    const pendingPaymentsDiv = document.getElementById('d-pendingPayments');
    if (pendingPayments.length === 0) {
        pendingPaymentsDiv.innerHTML = '<div class="payment-item" style="grid-column: 1/-1;"><p style="color: var(--text-light);">✓ Client has no pending payments</p></div>';
    } else {
        pendingPaymentsDiv.innerHTML = pendingPayments.map(payment => `
            <div class="payment-item pending">
                <div class="payment-icon"><i class="fas fa-hourglass-half"></i></div>
                <div class="payment-details">
                    <div class="payment-title">${payment.description || payment.type}</div>
                    <div class="payment-description">${payment.plan ? `Plan: ${payment.plan}` : ''} • Due: ${formatDate(payment.dueDate || payment.createdAt)}</div>
                    <span class="payment-status pending">PENDING</span>
                </div>
                <div class="payment-amount">$${parseFloat(payment.amount).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
        `).join('');
    }

    // Display payment history
    const paymentHistoryDiv = document.getElementById('d-paymentHistory');
    if (allPayments.length === 0) {
        paymentHistoryDiv.innerHTML = '<p style="color: var(--text-light);">No payment history</p>';
    } else {
        paymentHistoryDiv.innerHTML = allPayments.map(payment => `
            <div class="payment-item ${payment.status}">
                <div class="payment-icon"><i class="fas fa-${payment.status === 'paid' ? 'check-circle' : 'clock'}"></i></div>
                <div class="payment-details">
                    <div class="payment-title">${payment.description || payment.type}</div>
                    <div class="payment-description">${payment.plan ? `Plan: ${payment.plan}` : ''} • ${formatDate(payment.createdAt)}</div>
                    <span class="payment-status ${payment.status}">${payment.status.toUpperCase()}</span>
                </div>
                <div class="payment-amount">$${parseFloat(payment.amount).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
        `).join('');
    }

    // Edit tab - populate edit fields
    document.getElementById('edit-retirementGoals').value = client.retirementGoals || '';
    document.getElementById('edit-collegeFunding').value = client.collegeFunding || '';
    document.getElementById('edit-estatePlanning').value = client.estatePlanning || '';
    document.getElementById('edit-wealthAccumulation').value = client.wealthAccumulation || '';
    document.getElementById('edit-majorLifeEvents').value = client.majorLifeEvents || '';
    document.getElementById('edit-totalAUM').value = client.totalAUM || '';
    document.getElementById('edit-accountBalances').value = client.accountBalances || '';
    document.getElementById('edit-cashHoldings').value = client.cashHoldings || '';
    document.getElementById('edit-investmentAccounts').value = client.investmentAccounts || '';
    document.getElementById('edit-totalLiabilities').value = client.totalLiabilities || '';

    // Store current client ID for saving
    window.currentViewingClientId = clientId;

    // Display documents
    displayClientDocuments(clientId);

    // Render Investment Products fields for this client
    renderInvestmentProducts(client);

    showModal('clientDetailModal');
}

// Curated list of investment products (from across the financial markets)
const INVESTMENT_PRODUCTS = [
    ['invTreasuryBills', 'Treasury Bills'],
    ['invTreasuryBonds', 'Treasury Notes / Bonds'],
    ['invGovBonds', 'Government / Sovereign Bonds'],
    ['invMunicipalBonds', 'Municipal Bonds'],
    ['invCorporateBonds', 'Corporate Bonds'],
    ['invStructuredBonds', 'Structured Bonds'],
    ['invUnstructuredBonds', 'Unstructured Bonds'],
    ['invSukuk', 'Sukuk (Islamic Bonds)'],
    ['invFixedIncome', 'Fixed Income'],
    ['invEquities', 'Equities / Stocks'],
    ['invEtf', 'ETFs'],
    ['invIndexFunds', 'Index Funds'],
    ['invMutualFunds', 'Mutual Funds'],
    ['invMoneyMarket', 'Money Market Funds'],
    ['invCds', 'Certificates of Deposit (CDs)'],
    ['invCommodities', 'Commodities'],
    ['invPreciousMetals', 'Gold / Precious Metals'],
    ['invDerivatives', 'Derivatives (Options / Futures)'],
    ['invForeignInvestments', 'Foreign Investments'],
    ['invEsg', 'ESG / Sustainable Investments'],
    ['invCrypto', 'Cryptocurrency'],
    ['invDigitizedTokens', 'Digitized / Tokenized Assets'],
    ['invAlternativeAIF', 'Alternative Investments (AIF)'],
    ['invRealEstate', 'Real Estate / REITs'],
    ['invPrivateEquity', 'Private Equity'],
    ['invHedgeFunds', 'Hedge Funds'],
    ['invVentureCapital', 'Venture Capital'],
    ['invAnnuities', 'Annuities'],
    ['invUlip', 'Insurance-linked (ULIPs)'],
    ['invPension', 'Pension / Retirement Accounts']
];

function renderInvestmentProducts(client) {
    const container = document.getElementById('investmentFields');
    if (!container) return;
    client = client || {};
    container.innerHTML = INVESTMENT_PRODUCTS.map(([key, label]) => `
        <div class="form-group">
            <label style="font-size:0.8rem;">${label}</label>
            <input type="text" id="${key}" value="${escInv(client[key] || '')}" placeholder="Holding / interest / notes">
        </div>
    `).join('');
}

async function saveInvestmentProducts() {
    const clientId = window.currentViewingClientId;
    if (!clientId) { showNotification('No client selected', 'error'); return; }
    const data = {};
    INVESTMENT_PRODUCTS.forEach(([key]) => {
        const el = document.getElementById(key);
        if (el) data[key] = el.value.trim();
    });
    try {
        await updateClient(clientId, data);
        logWorkflowActivity('client_investments_updated', 'Investment products updated');
        showNotification('Investment products saved!', 'success');
        loadClientDashboard();
    } catch (error) {
        showNotification(error.message || 'Failed to save investment products', 'error');
    }
}

function escInv(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}

// Switch detail tabs
function switchDetailTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.detail-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(tabName + '-tab').classList.add('active');
    event.target.classList.add('active');
}

// Save client details
async function saveClientDetails() {
    const clientId = window.currentViewingClientId;
    const clients = getClients();
    const clientIndex = clients.findIndex(c => c.id === clientId);

    if (clientIndex === -1) {
        showNotification('Client not found!', 'error');
        return;
    }

    const updatedData = {
        retirementGoals: document.getElementById('edit-retirementGoals').value,
        collegeFunding: document.getElementById('edit-collegeFunding').value,
        estatePlanning: document.getElementById('edit-estatePlanning').value,
        wealthAccumulation: document.getElementById('edit-wealthAccumulation').value,
        majorLifeEvents: document.getElementById('edit-majorLifeEvents').value,
        totalAUM: document.getElementById('edit-totalAUM').value,
        accountBalances: document.getElementById('edit-accountBalances').value,
        cashHoldings: document.getElementById('edit-cashHoldings').value,
        investmentAccounts: document.getElementById('edit-investmentAccounts').value,
        totalLiabilities: document.getElementById('edit-totalLiabilities').value
    };

    try {
        await updateClient(clientId, updatedData);
        logWorkflowActivity('client_details_updated', `Client details updated: ${clients[clientIndex].name}`);

        showNotification('Client details updated successfully!', 'success');
        closeModal('clientDetailModal');
        loadClientDashboard();
    } catch (error) {
        showNotification(error.message || 'Failed to update client details', 'error');
    }
}

// Display client documents
function displayClientDocuments(clientId) {
    const clients = getClients();
    const client = clients.find(c => c.id === clientId);

    if (!client) return;

    const documentsDiv = document.getElementById('d-documents');

    if (!client.documentName || !client.documentData) {
        documentsDiv.innerHTML = '<p style="color: var(--text-light);">No documents uploaded</p>';
        return;
    }

    const fileType = getFileType(client.documentType || client.documentName);
    const fileIcon = getFileIcon(fileType);

    const documentHTML = `
        <div class="document-item">
            <div class="document-icon ${fileType}">
                <i class="fas fa-${fileIcon}"></i>
            </div>
            <div class="document-name">${client.documentName}</div>
            <div class="document-type">${fileType.toUpperCase()} File</div>
            <div class="document-actions">
                <button class="document-btn document-btn-view" onclick="viewDocument('${clientId}')">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="document-btn document-btn-download" onclick="downloadDocument('${clientId}')">
                    <i class="fas fa-download"></i> Download
                </button>
            </div>
        </div>
    `;

    documentsDiv.innerHTML = documentHTML;
}

// Get file type from mime type or filename
function getFileType(input) {
    if (!input) return 'other';

    if (input.includes('pdf')) return 'pdf';
    if (input.includes('word') || input.includes('document')) return 'word';
    if (input.includes('sheet') || input.includes('excel')) return 'excel';
    if (input.includes('text')) return 'text';
    if (input.includes('image')) return 'image';

    const ext = input.split('.').pop().toLowerCase();
    if (['pdf'].includes(ext)) return 'pdf';
    if (['doc', 'docx'].includes(ext)) return 'word';
    if (['xls', 'xlsx'].includes(ext)) return 'excel';
    if (['txt'].includes(ext)) return 'text';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'image';

    return 'other';
}

// Get font awesome icon for file type
function getFileIcon(fileType) {
    const icons = {
        'pdf': 'file-pdf',
        'word': 'file-word',
        'excel': 'file-excel',
        'text': 'file-alt',
        'image': 'image',
        'other': 'file'
    };
    return icons[fileType] || 'file';
}

// View document
function viewDocument(clientId) {
    const clients = getClients();
    const client = clients.find(c => c.id === clientId);

    if (!client || !client.documentData) {
        showNotification('Document not found', 'error');
        return;
    }

    const fileType = getFileType(client.documentType || client.documentName);
    const modal = document.getElementById('docViewerModal');
    const body = document.getElementById('docViewerBody');
    const title = document.getElementById('docViewerTitle');

    title.textContent = client.documentName;
    window.currentViewingDocument = { clientId, fileType, data: client.documentData, name: client.documentName };

    if (fileType === 'image') {
        body.innerHTML = `<img src="${client.documentData}" alt="Document" class="doc-viewer-image">`;
    } else if (fileType === 'pdf') {
        body.innerHTML = `<iframe src="${client.documentData}" class="doc-viewer-pdf"></iframe>`;
    } else if (fileType === 'text') {
        // For text files, decode base64
        try {
            const text = atob(client.documentData.split(',')[1]);
            body.innerHTML = `<div class="doc-viewer-text">${escapeHtml(text)}</div>`;
        } catch (e) {
            body.innerHTML = `<div class="doc-viewer-unsupported"><i class="fas fa-file-alt"></i><p>Cannot preview this text file</p></div>`;
        }
    } else {
        body.innerHTML = `<div class="doc-viewer-unsupported"><i class="fas fa-file"></i><p>Preview not available for ${fileType} files</p><p>Please download to view</p></div>`;
    }

    modal.classList.add('active');
}

// Download document
function downloadDocument(clientId) {
    const clients = getClients();
    const client = clients.find(c => c.id === clientId);

    if (!client || !client.documentData) {
        showNotification('Document not found', 'error');
        return;
    }

    const link = document.createElement('a');
    link.href = client.documentData;
    link.download = client.documentName;
    link.click();

    logWorkflowActivity('document_downloaded', `Document downloaded: ${client.documentName}`);
}

// Download current viewing document
function downloadCurrentDoc() {
    if (window.currentViewingDocument) {
        const link = document.createElement('a');
        link.href = window.currentViewingDocument.data;
        link.download = window.currentViewingDocument.name;
        link.click();
    }
}

// Close document viewer
function closeDocViewer() {
    const modal = document.getElementById('docViewerModal');
    modal.classList.remove('active');
    window.currentViewingDocument = null;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}
