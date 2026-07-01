/* =====================================================
   EMPLOYEE INFORMATION — MongoDB-backed (PII encrypted server-side)
   ===================================================== */

function openEmployeeModal() {
    const m = document.getElementById('employeeModal');
    const f = m && m.querySelector('form');
    if (f) f.reset();
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

    try {
        const res = await apiRequest('/employees', { method: 'POST', body });
        showNotification(`Employee added — ${res.employee.employeeId}`, 'success');
        closeEmployeeModal();
        loadEmployees();
    } catch (e) {
        showNotification(`Could not add employee: ${e.message}`, 'error');
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
            <div class="card-actions" style="margin-top:8px;">
                <button class="btn-delete" onclick="deleteEmployee('${e.employeeId}','${esc(e.name)}')"><i class="fas fa-trash"></i> Delete</button>
            </div>
        </div>
    `).join('');
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
