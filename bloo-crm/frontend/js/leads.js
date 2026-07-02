/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   LEAD MANAGEMENT
   ===================================================== */

// Handle add lead form submission
async function handleAddLead(event) {
    event.preventDefault();

    const leadData = {
        name: document.getElementById('leadName').value,
        email: document.getElementById('leadEmail').value,
        phone: document.getElementById('leadPhone').value,
        company: document.getElementById('leadCompany').value,
        status: document.getElementById('leadStatus').value,
        source: document.getElementById('leadSource').value,
        notes: document.getElementById('leadNotes').value
    };

    try {
        // Add lead to MongoDB
        await addLead(leadData);
        logWorkflowActivity('lead_added', `New lead added: ${leadData.name} - Status: ${leadData.status}`);
        showNotification(`Lead ${leadData.name} added successfully!`, 'success');
        closeModal('addLeadModal');
        loadLeadsList();
        loadDashboardStats();
    } catch (error) {
        showNotification(error.message || 'Failed to add lead', 'error');
    }
}

// Assign an employee to a lead (Swift AI+ or higher)
async function assignEmployeeToLead(leadId) {
    if (typeof swiftGate === 'function' && !swiftGate('Assign employee to lead')) return;
    const employee = prompt('Assign which employee to this lead?');
    if (employee === null) return;
    try {
        await updateLead(leadId, { assignedEmployee: employee });
        showNotification('Employee assigned to lead', 'success');
        loadLeadsList();
    } catch (e) { showNotification(`Could not assign: ${e.message}`, 'error'); }
}

// Load leads list
function loadLeadsList() {
    const leads = getLeads();
    const container = document.getElementById('leadsList');
    
    if (leads.length === 0) {
        container.innerHTML = '<p class="empty-state">No leads yet. Add a new lead to get started!</p>';
        return;
    }
    
    container.innerHTML = leads.map(lead => `
        <div class="lead-card">
            <div class="card-header-info">
                <h3 class="client-name">${lead.name}</h3>
                <span class="client-badge ${getStatusBadgeClass(lead.status)}">${lead.status}</span>
            </div>
            <div class="client-email">
                <i class="fas fa-envelope"></i>
                <a href="mailto:${lead.email}">${lead.email}</a>
            </div>
            <div class="client-phone">
                <i class="fas fa-phone"></i>
                ${lead.phone}
            </div>
            ${lead.company ? `
                <div style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-light);">
                    <strong>Company:</strong> ${lead.company}
                </div>
            ` : ''}
            ${lead.source ? `
                <div style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-light);">
                    <strong>Source:</strong> ${lead.source}
                </div>
            ` : ''}
            ${lead.notes ? `
                <div style="margin-top: 0.75rem; padding: 0.75rem; background-color: var(--light-gray); border-radius: 0.5rem; font-size: 0.9rem;">
                    <strong>Notes:</strong><br>
                    ${lead.notes}
                </div>
            ` : ''}
            ${lead.assignedEmployee ? `
                <div style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--theme-primary);">
                    <i class="fas fa-id-badge"></i> <strong>Assigned to:</strong> ${lead.assignedEmployee}
                </div>
            ` : ''}
            <div style="margin-top: 0.75rem; font-size: 0.85rem; color: var(--text-light);">
                Added: ${formatDate(lead.createdAt)}
            </div>
            <div class="card-actions">
                <button class="btn-edit" onclick="editLead('${lead.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-sm btn-secondary" onclick="assignEmployeeToLead('${lead.id}')">
                    <i class="fas fa-user-plus"></i> Assign Employee ${(typeof isSwiftPlan==='function'&&isSwiftPlan())?'':'🔒'}
                </button>
                <button class="btn-delete" onclick="deleteLeadConfirm('${lead.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

// Filter leads by search
function filterLeads() {
    const searchTerm = document.getElementById('leadSearch').value.toLowerCase();
    const leads = getLeads();
    const filtered = leads.filter(lead =>
        lead.name.toLowerCase().includes(searchTerm) ||
        lead.email.toLowerCase().includes(searchTerm) ||
        lead.phone.includes(searchTerm) ||
        (lead.company && lead.company.toLowerCase().includes(searchTerm))
    );
    
    const container = document.getElementById('leadsList');
    
    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-state">No leads found.</p>';
        return;
    }
    
    container.innerHTML = filtered.map(lead => `
        <div class="lead-card">
            <div class="card-header-info">
                <h3 class="client-name">${lead.name}</h3>
                <span class="client-badge ${getStatusBadgeClass(lead.status)}">${lead.status}</span>
            </div>
            <div class="client-email">
                <i class="fas fa-envelope"></i>
                <a href="mailto:${lead.email}">${lead.email}</a>
            </div>
            <div class="client-phone">
                <i class="fas fa-phone"></i>
                ${lead.phone}
            </div>
            ${lead.company ? `
                <div style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-light);">
                    <strong>Company:</strong> ${lead.company}
                </div>
            ` : ''}
            ${lead.source ? `
                <div style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-light);">
                    <strong>Source:</strong> ${lead.source}
                </div>
            ` : ''}
            ${lead.notes ? `
                <div style="margin-top: 0.75rem; padding: 0.75rem; background-color: var(--light-gray); border-radius: 0.5rem; font-size: 0.9rem;">
                    <strong>Notes:</strong><br>
                    ${lead.notes}
                </div>
            ` : ''}
            ${lead.assignedEmployee ? `
                <div style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--theme-primary);">
                    <i class="fas fa-id-badge"></i> <strong>Assigned to:</strong> ${lead.assignedEmployee}
                </div>
            ` : ''}
            <div style="margin-top: 0.75rem; font-size: 0.85rem; color: var(--text-light);">
                Added: ${formatDate(lead.createdAt)}
            </div>
            <div class="card-actions">
                <button class="btn-edit" onclick="editLead('${lead.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-sm btn-secondary" onclick="assignEmployeeToLead('${lead.id}')">
                    <i class="fas fa-user-plus"></i> Assign Employee ${(typeof isSwiftPlan==='function'&&isSwiftPlan())?'':'🔒'}
                </button>
                <button class="btn-delete" onclick="deleteLeadConfirm('${lead.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

// Get badge class based on status
function getStatusBadgeClass(status) {
    switch(status) {
        case 'new':
        case 'qualified':
            return 'badge-blue';
        case 'interested':
        case 'negotiating':
            return 'badge-aqua';
        case 'converted':
            return 'badge-blue';
        case 'lost':
            return 'badge-orange';
        default:
            return 'badge-blue';
    }
}

// Edit lead
function editLead(leadId) {
    const leads = getLeads();
    const lead = leads.find(l => l.id === leadId);
    
    if (!lead) return;
    
    // Populate modal with lead data
    document.getElementById('leadName').value = lead.name;
    document.getElementById('leadEmail').value = lead.email;
    document.getElementById('leadPhone').value = lead.phone;
    document.getElementById('leadCompany').value = lead.company || '';
    document.getElementById('leadStatus').value = lead.status;
    document.getElementById('leadSource').value = lead.source || '';
    document.getElementById('leadNotes').value = lead.notes || '';
    
    // Change form behavior
    const modal = document.getElementById('addLeadModal');
    const form = modal.querySelector('form');
    
    // Remove old listener and add new one
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    newForm.onsubmit = async (event) => {
        event.preventDefault();

        const oldStatus = lead.status;
        const leadData = {
            name: document.getElementById('leadName').value,
            email: document.getElementById('leadEmail').value,
            phone: document.getElementById('leadPhone').value,
            company: document.getElementById('leadCompany').value,
            status: document.getElementById('leadStatus').value,
            source: document.getElementById('leadSource').value,
            notes: document.getElementById('leadNotes').value
        };
        
        try {
            await updateLead(leadId, leadData);
        } catch (error) {
            showNotification(error.message || 'Failed to update lead', 'error');
            return;
        }

        // Log if status changed
        if (oldStatus !== leadData.status) {
            logWorkflowActivity('lead_status_changed', 
                `Lead ${leadData.name} status changed from ${oldStatus} to ${leadData.status}`,
                { leadId, oldStatus, newStatus: leadData.status }
            );
            
            // If converted, offer to convert to client
            if (leadData.status === 'converted') {
                if (confirm(`Convert "${leadData.name}" to a client?`)) {
                    const clientData = {
                        name: leadData.name,
                        email: leadData.email,
                        phone: leadData.phone,
                        company: leadData.company,
                        address: '',
                        businessType: 'b2b',
                        industry: 'other'
                    };
                    
                    addClient(clientData)
                        .then(() => logWorkflowActivity('lead_converted', `Lead ${leadData.name} converted to client`))
                        .catch(err => showNotification(err.message || 'Failed to convert lead to client', 'error'));
                }
            }
        } else {
            logWorkflowActivity('lead_updated', `Lead updated: ${leadData.name}`);
        }
        
        showNotification('Lead updated successfully!', 'success');
        closeModal('addLeadModal');
        loadLeadsList();
        loadDashboardStats();
        
        // Restore original form
        newForm.onsubmit = handleAddLead;
    };
    
    showModal('addLeadModal');
}

// Delete lead with confirmation
async function deleteLeadConfirm(leadId) {
    const leads = getLeads();
    const lead = leads.find(l => l.id === leadId);

    if (!lead) return;

    if (confirm(`Are you sure you want to delete ${lead.name}?`)) {
        try {
            await deleteLead(leadId);
            logWorkflowActivity('lead_deleted', `Lead deleted: ${lead.name}`);
            showNotification(`${lead.name} deleted!`, 'success');
            loadLeadsList();
            loadDashboardStats();
        } catch (error) {
            showNotification(error.message || 'Failed to delete lead', 'error');
        }
    }
}

// Convert lead to client (can be called from lead details)
async function convertLeadToClient(leadId) {
    const leads = getLeads();
    const lead = leads.find(l => l.id === leadId);

    if (!lead) return;

    const clientData = {
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        address: '',
        businessType: 'b2b',
        industry: 'other',
        details: lead.notes
    };

    try {
        const client = await addClient(clientData);

        // Update lead status
        updateLead(leadId, { status: 'converted' });

        logWorkflowActivity('lead_converted',
            `Lead ${lead.name} converted to client`,
            { leadId, clientId: client.clientId }
        );

        showNotification(`${lead.name} converted to client!`, 'success');
        loadLeadsList();
        loadDashboardStats();
    } catch (error) {
        showNotification(error.message || 'Failed to convert lead to client', 'error');
    }
}
