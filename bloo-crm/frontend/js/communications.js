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

// Handle add communication form submission
function handleAddCommunication(event) {
    event.preventDefault();
    
    const contactId = document.getElementById('commContact').value;
    const contactName = getContactName(contactId);
    
    const commData = {
        contactId: contactId,
        contactName: contactName,
        type: document.getElementById('commType').value,
        dateTime: document.getElementById('commDateTime').value,
        duration: parseInt(document.getElementById('commDuration').value) || 0,
        communicatedWith: document.getElementById('commWith').value,
        notes: document.getElementById('commNotes').value
    };
    
    // Add communication to storage
    const communication = addCommunication(commData);
    
    // Show success message
    showNotification(`Communication logged successfully!`, 'success');
    
    // Close modal and reload communications
    closeModal('addCommunicationModal');
    loadCommunicationsList();
    
    // Update dashboard stats
    loadDashboardStats();
    loadRecentActivities();
}

// Load communications list
function loadCommunicationsList() {
    const communications = getCommunications();
    const container = document.getElementById('communicationsList');
    
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

// Delete communication with confirmation
function deleteCommunicationConfirm(commId) {
    const communications = getCommunications();
    const comm = communications.find(c => c.id === commId);
    
    if (!comm) return;
    
    if (confirm(`Delete communication with ${comm.contactName}?`)) {
        const user = getCurrentUser();
        user.communications = user.communications.filter(c => c.id !== commId);
        saveCurrentUser(user);
        
        logWorkflowActivity('communication_deleted', 
            `Communication with ${comm.contactName} deleted`
        );
        
        showNotification('Communication deleted!', 'success');
        loadCommunicationsList();
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
