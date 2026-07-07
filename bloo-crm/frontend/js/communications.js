/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   COMMUNICATIONS MANAGEMENT
   ===================================================== */

// Map the UI communication type to the backend enum (and back)
function mapCommTypeToApi(t) { return ({ call: 'phone', other: 'message' })[t] || (['email', 'phone', 'meeting', 'message'].includes(t) ? t : 'message'); }
function mapCommTypeToUi(t) { return t === 'phone' ? 'call' : (t || 'other'); }

// Convert a backend communication document to the shape the UI renders
function mapApiCommToUi(d) {
    const cf = d.customFields || {};
    return {
        id: d._id || d.id,
        contactId: cf.contactId || d.clientId || d.leadId || '',
        contactName: cf.contactName || (d.subject || '').replace(/^.*with\s+/i, '') || 'Contact',
        type: cf.uiType || mapCommTypeToUi(d.type),
        dateTime: cf.dateTime || d.meetingDate || d.createdAt,
        duration: d.meetingDuration || 0,
        communicatedWith: cf.communicatedWith || (d.notes || '').replace(/^With:\s*/, ''),
        notes: d.content || ''
    };
}

// Handle add communication form submission — persists to the backend
async function handleAddCommunication(event) {
    event.preventDefault();

    const contactId = document.getElementById('commContact').value;
    const contactName = getContactName(contactId);
    const uiType = document.getElementById('commType').value;
    const dateTime = document.getElementById('commDateTime').value;
    const duration = parseInt(document.getElementById('commDuration').value) || 0;
    const communicatedWith = document.getElementById('commWith').value;
    const notes = document.getElementById('commNotes').value;

    const payload = {
        type: mapCommTypeToApi(uiType),
        subject: `${capitalizeFirst(uiType || 'note')} with ${contactName}`,
        content: notes || '(no summary provided)',
        meetingDate: dateTime || undefined,
        meetingDuration: duration || undefined,
        notes: communicatedWith ? ('With: ' + communicatedWith) : undefined,
        status: 'completed',
        customFields: { contactId, contactName, communicatedWith, dateTime, uiType }
    };

    try {
        await apiRequest('/communications', { method: 'POST', body: payload });
        showNotification('Communication logged successfully!', 'success');
        closeModal('addCommunicationModal');
        await loadCommunicationsList();
        if (typeof loadDashboardStats === 'function') loadDashboardStats();
        if (typeof loadRecentActivities === 'function') loadRecentActivities();
    } catch (e) {
        showNotification('Could not save communication: ' + e.message, 'error');
    }
}

// Load communications list from the backend (falls back to any local cache)
async function loadCommunicationsList() {
    const container = document.getElementById('communicationsList');
    let communications = [];
    try {
        const res = await apiRequest('/communications?limit=1000', { method: 'GET' });
        communications = (res.data || []).map(mapApiCommToUi);
        // Keep the local cache in sync so synchronous consumers (stats, etc.) stay correct
        try { const u = getCurrentUser(); u.communications = communications; saveCurrentUser(u); } catch (e) {}
    } catch (e) {
        communications = getCommunications();
    }

    if (communications.length === 0) {
        container.innerHTML = '<p class="empty-state">No communications logged yet.</p>';
        return;
    }
    
    // Sort by date (newest first)
    const sorted = [...communications].sort((a, b) => 
        new Date(b.dateTime) - new Date(a.dateTime)
    );
    
    container.innerHTML = sorted.map(comm => `
        <div class="communication-item">
            <div class="comm-header">
                <div>
                    <div class="comm-title">
                        <i class="fas fa-${getCommTypeIcon(comm.type)}"></i>
                        ${comm.contactName}
                    </div>
                </div>
                <div class="comm-time">${formatDateTime(comm.dateTime)}</div>
            </div>
            <div class="comm-details">
                <div class="detail-item">
                    <span class="detail-label">Type:</span>
                    <span>${capitalizeFirst(comm.type)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Duration:</span>
                    <span>${comm.duration > 0 ? comm.duration + ' min' : 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">With:</span>
                    <span>${comm.communicatedWith}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Date:</span>
                    <span>${formatDateTime(comm.dateTime)}</span>
                </div>
            </div>
            <div class="comm-notes">
                <strong>Summary:</strong><br>
                ${comm.notes}
            </div>
            <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                <button class="btn btn-secondary" style="flex: 1;" onclick="editCommunication('${comm.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-secondary" style="flex: 1;" onclick="deleteCommunicationConfirm('${comm.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

// Get icon for communication type
function getCommTypeIcon(type) {
    const icons = {
        'email': 'envelope',
        'call': 'phone',
        'meeting': 'users',
        'message': 'comments',
        'other': 'comments'
    };
    return icons[type] || 'comments';
}

// Capitalize first letter
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Edit communication
function editCommunication(commId) {
    const communications = getCommunications();
    const comm = communications.find(c => c.id === commId);
    
    if (!comm) return;
    
    // Note: For simplicity, we're not implementing full edit functionality
    // In a production app, you'd populate the form and allow editing
    showNotification('Edit feature coming soon!', 'info');
}

// Delete communication with confirmation — removes it from the backend
async function deleteCommunicationConfirm(commId) {
    const communications = getCommunications();
    const comm = communications.find(c => c.id === commId);
    if (!comm) return;

    if (!confirm(`Delete communication with ${comm.contactName}?`)) return;
    try {
        await apiRequest('/communications/' + encodeURIComponent(commId), { method: 'DELETE' });
        if (typeof logWorkflowActivity === 'function') logWorkflowActivity('communication_deleted', `Communication with ${comm.contactName} deleted`);
        showNotification('Communication deleted!', 'success');
        await loadCommunicationsList();
    } catch (e) {
        showNotification('Could not delete: ' + e.message, 'error');
    }
}

// Get communication summary for a client/lead
function getContactCommunications(contactId) {
    const communications = getCommunications();
    return communications.filter(c => c.contactId === contactId);
}

// Generate communication statistics
function getCommunicationStats() {
    const communications = getCommunications();
    
    const stats = {
        total: communications.length,
        byType: {},
        thisMonth: 0,
        totalDuration: 0
    };
    
    const thisMonth = new Date();
    thisMonth.setDate(1);
    
    communications.forEach(comm => {
        // Count by type
        if (!stats.byType[comm.type]) {
            stats.byType[comm.type] = 0;
        }
        stats.byType[comm.type]++;
        
        // Count this month
        if (new Date(comm.dateTime) >= thisMonth) {
            stats.thisMonth++;
        }
        
        // Total duration
        stats.totalDuration += comm.duration || 0;
    });
    
    return stats;
}

// Log communication for workflow
function logCommunicationActivity(contactName, commType) {
    logWorkflowActivity('communication', 
        `${commType} with ${contactName}`,
        { 
            contactName, 
            type: commType,
            timestamp: new Date().toISOString()
        }
    );
}
