/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   EMPLOYEE INFORMATION — MongoDB-backed (PII encrypted server-side)
   ===================================================== */

let _empCache = {};

function openEmployeeModal(emp) {
    const m = document.getElementById('employeeModal');
    const f = m && m.querySelector('form');
    if (f) f.reset();
    window.__empEditId = emp ? emp.employeeId : '';
    const titleEl = m && m.querySelector('.modal-header h2');
    if (titleEl) titleEl.innerHTML = emp ? '<i class="fas fa-user-edit"></i> Edit Employee' : '<i class="fas fa-user-plus"></i> Add Employee';
    if (emp) {
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
        set('empName', emp.name); set('empEmail', emp.email); set('empPhone', emp.phone);
        set('empDepartment', emp.department); set('empJobTitle', emp.jobTitle);
        set('empManager', emp.manager); set('empBackup', emp.backupEmployee);
        set('empDateOfJoining', emp.dateOfJoining ? String(emp.dateOfJoining).slice(0, 10) : '');
        set('empStatus', emp.status || 'active');
        set('empStreet', emp.address?.street); set('empCity', emp.address?.city);
        set('empState', emp.address?.state); set('empZip', emp.address?.zipCode);
        set('empNotes', emp.notes);
        // PII left blank on edit — only overwrites if re-entered
        const pii = m && m.querySelector('#empSSN');
        if (pii) pii.placeholder = 'Leave blank to keep existing';
    }
    if (m) m.classList.add('active');
}
function closeEmployeeModal() {
    const m = document.getElementById('employeeModal');
    if (m) m.classList.remove('active');
}

async function submitEmployee(event) {
    event.preventDefault();
    const val = id => (document.getElementById(id)?.value || '').trim();
    const name = val('empName');
    if (!name) { showNotification('Name is required', 'error'); return; }

    const body = {
        name,
        email: val('empEmail'),
        phone: val('empPhone'),
        department: val('empDepartment'),
        jobTitle: val('empJobTitle'),
        manager: val('empManager'),
        backupEmployee: val('empBackup'),
        dateOfJoining: val('empDateOfJoining') || undefined,
        status: val('empStatus') || 'active',
        ssn: val('empSSN') || undefined,
        dateOfBirth: val('empDOB') || undefined,
        bankAccount: val('empBankAccount') || undefined,
        address: {
            street: val('empStreet'), city: val('empCity'),
            state: val('empState'), zipCode: val('empZip')
        },
        notes: val('empNotes')
    };

    const editId = window.__empEditId;
    if (editId) {
        // Don't overwrite PII with blanks on edit
        if (!body.ssn) delete body.ssn;
        if (!body.dateOfBirth) delete body.dateOfBirth;
        if (!body.bankAccount) delete body.bankAccount;
    }

    try {
        if (editId) {
            const res = await apiRequest(`/employees/${editId}`, { method: 'PUT', body });
            showNotification(`Employee updated — ${res.employee.employeeId}`, 'success');
        } else {
            const res = await apiRequest('/employees', { method: 'POST', body });
            showNotification(`Employee added — ${res.employee.employeeId}`, 'success');
        }
        window.__empEditId = '';
        closeEmployeeModal();
        loadEmployees();
    } catch (e) {
        showNotification(`Could not save employee: ${e.message}`, 'error');
    }
}

async function loadEmployees() {
    const list = document.getElementById('employeeList');
    if (!list) return;
    const q = (document.getElementById('employeeSearch')?.value || '').trim();
    list.innerHTML = '<p class="empty-state">Loading…</p>';
    try {
        const res = await apiRequest(`/employees?search=${encodeURIComponent(q)}`, { method: 'GET' });
        const c = res.counts || {};
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v || 0; };
        set('empTotal', c.total); set('empActive', c.active); set('empOnLeave', c.onLeave); set('empDepartments', c.departments);
        renderEmployees(res.employees || []);
    } catch (e) {
        list.innerHTML = `<p class="empty-state">Could not load employees: ${e.message}</p>`;
    }
}

function renderEmployees(items) {
    const list = document.getElementById('employeeList');
    if (!list) return;
    if (!items.length) {
        list.innerHTML = '<p class="empty-state">No employees found.</p>';
        return;
    }
    _empCache = {};
    items.forEach(e => { _empCache[e.employeeId] = e; });
    list.innerHTML = items.map(e => `
        <div class="client-card">
            <div class="card-header-info">
                <h3 class="client-name">${esc(e.name)}</h3>
                <span class="client-badge badge-blue">${esc(e.status || 'active')}</span>
            </div>
            <div style="font-size:0.85rem;color:#666;margin-top:6px;">
                <div><i class="fas fa-id-badge"></i> ${esc(e.employeeId)}</div>
                ${e.jobTitle ? `<div><i class="fas fa-briefcase"></i> ${esc(e.jobTitle)}</div>` : ''}
                ${e.department ? `<div><i class="fas fa-sitemap"></i> ${esc(e.department)}</div>` : ''}
                ${e.email ? `<div><i class="fas fa-envelope"></i> ${esc(e.email)}</div>` : ''}
                ${e.phone ? `<div><i class="fas fa-phone"></i> ${esc(e.phone)}</div>` : ''}
                ${e.manager ? `<div><i class="fas fa-user-tie"></i> Manager: ${esc(e.manager)}</div>` : ''}
            </div>
            <div class="card-actions" style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
                <button class="btn btn-sm btn-secondary" onclick="viewEmployee('${e.employeeId}')"><i class="fas fa-eye"></i> View</button>
                <button class="btn btn-sm btn-primary" onclick="editEmployee('${e.employeeId}')"><i class="fas fa-edit"></i> Edit</button>
                <button class="btn-delete" onclick="deleteEmployee('${e.employeeId}','${esc(e.name)}')"><i class="fas fa-trash"></i> Delete</button>
            </div>
        </div>
    `).join('');
}

function editEmployee(employeeId) { const e = _empCache[employeeId]; if (e) openEmployeeModal(e); }

function viewEmployee(employeeId) {
    const e = _empCache[employeeId];
    if (!e) return;
    const rocket = (typeof isRocketPlan === 'function') && isSwiftPlan();
    const addr = e.address || {};
    const overlay = document.createElement('div');
    overlay.className = 'modal active';
    overlay.style.display = 'flex';
    overlay.innerHTML = `
        <div class="modal-content" style="max-width:600px;">
            <div class="modal-header">
                <h2><i class="fas fa-id-badge"></i> ${esc(e.name)}</h2>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                    <button class="btn btn-sm btn-secondary" onclick="viewRelatedVendors('${esc(e.name)}')"><i class="fas fa-truck-loading"></i> Related Vendors ${rocket ? '' : '🔒'}</button>
                    <button class="btn btn-sm btn-secondary" onclick="viewRelatedProposals('${esc(e.name)}')"><i class="fas fa-file-signature"></i> Related Proposals ${rocket ? '' : '🔒'}</button>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
            </div>
            <div style="padding:0 4px;font-size:0.92rem;">
                <p><strong>Employee ID:</strong> ${esc(e.employeeId)} · <strong>Status:</strong> ${esc(e.status || 'active')}</p>
                ${e.jobTitle ? `<p><strong>Title:</strong> ${esc(e.jobTitle)}</p>` : ''}
                ${e.department ? `<p><strong>Department:</strong> ${esc(e.department)}</p>` : ''}
                ${e.email ? `<p><strong>Email:</strong> ${esc(e.email)}</p>` : ''}
                ${e.phone ? `<p><strong>Phone:</strong> ${esc(e.phone)}</p>` : ''}
                ${e.manager ? `<p><strong>Manager:</strong> ${esc(e.manager)}</p>` : ''}
                ${e.backupEmployee ? `<p><strong>Backup:</strong> ${esc(e.backupEmployee)}</p>` : ''}
                ${(addr.street || addr.city || addr.state) ? `<p><strong>Address:</strong> ${esc([addr.street, addr.city, addr.state, addr.zipCode].filter(Boolean).join(', '))}</p>` : ''}
                ${e.notes ? `<p><strong>Notes:</strong> ${esc(e.notes)}</p>` : ''}
                <p style="color:#888;font-size:0.8rem;"><i class="fas fa-lock"></i> PII (SSN, DOB, bank) is encrypted and hidden.</p>
                <div id="empRelated" style="margin-top:10px;"></div>
            </div>
        </div>`;
    document.body.appendChild(overlay);
}

async function viewRelatedVendors(empName) {
    if (typeof rocketGate === 'function' && !swiftGate('View related vendors')) return;
    const box = document.getElementById('empRelated');
    if (box) box.innerHTML = '<p class="empty-state">Loading related vendors…</p>';
    try {
        const res = await apiRequest('/vendors', { method: 'GET' });
        const vs = (res.vendors || []).filter(v => v.mappedEmployee === empName || (v.assignedEmployees || []).includes(empName));
        if (box) box.innerHTML = `<h4>Related Vendors</h4>` + (vs.length ? vs.map(v => `<div class="activity-item"><div class="activity-icon blue-bg"><i class="fas fa-building"></i></div><div class="activity-content"><div class="activity-title">${esc(v.name)}</div><div class="activity-time">${esc(v.category || '')} · ${v.vendorId}</div></div></div>`).join('') : '<p class="empty-state">No vendors mapped to this employee.</p>');
    } catch (e) { if (box) box.innerHTML = `<p class="empty-state">Could not load: ${esc(e.message)}</p>`; }
}

async function viewRelatedProposals(empName) {
    if (typeof rocketGate === 'function' && !swiftGate('View related proposals')) return;
    const box = document.getElementById('empRelated');
    if (box) box.innerHTML = '<p class="empty-state">Loading related proposals…</p>';
    try {
        const res = await apiRequest('/proposals', { method: 'GET' });
        const ps = (res.proposals || []).filter(p => p.assignedEmployee === empName);
        if (box) box.innerHTML = `<h4>Related Proposals</h4>` + (ps.length ? ps.map(p => `<div class="activity-item"><div class="activity-icon aqua-bg"><i class="fas fa-file-signature"></i></div><div class="activity-content"><div class="activity-title">${esc(p.title)}</div><div class="activity-time">${esc(p.type)} · ${esc(p.industry)} · ${p.proposalId}</div></div></div>`).join('') : '<p class="empty-state">No proposals assigned to this employee.</p>');
    } catch (e) { if (box) box.innerHTML = `<p class="empty-state">Could not load: ${esc(e.message)}</p>`; }
}

async function deleteEmployee(employeeId, name) {
    if (!confirm(`Delete employee ${name} (${employeeId})?`)) return;
    try {
        await apiRequest(`/employees/${employeeId}`, { method: 'DELETE' });
        showNotification('Employee deleted', 'success');
        loadEmployees();
    } catch (e) {
        showNotification(`Could not delete: ${e.message}`, 'error');
    }
}

function esc(t) {
    return String(t || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}
