/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  Proprietary software. Unauthorized copying, modification, or use by any means
  or technology (including AI tools) is strictly prohibited.
*/
/* =====================================================
   VENDOR DASHBOARD — vendors, quarterly revenue pies, KPI/KRI, documents
   ===================================================== */

const VENDOR_DOC_TYPES = [
    'Onboarding Forms', 'Personal Vendor Details', 'Compliance Policies Agreement',
    'Pricing Agreement', 'Contact Points', 'Performance Score', 'Payment History',
    'Operational Service Agreement', 'Service Level Agreement', 'Design Document',
    'Technical Design Document', 'Business Agreement', 'Milestone Charts',
    'Invoice Document', 'Purchase Order Document', 'Business Continuity Plans',
    'Disaster Recovery Plans', 'Certifications', 'RFI/RFQ Document',
    'Vendor Product Catalogue', 'Other'
];

let _vendorsCache = [];
window.__vcharts = window.__vcharts || {};
function vDestroy(k) { if (window.__vcharts[k]) { try { window.__vcharts[k].destroy(); } catch (e) {} window.__vcharts[k] = null; } }

async function loadVendorDashboard() {
    await Promise.all([loadVendors(), loadVendorAnalytics(), loadVendorDocs()]);
    if (typeof renderVendorIntegrations === 'function') renderVendorIntegrations();
}

async function loadVendors() {
    const q = (document.getElementById('vendorSearch')?.value || '').trim();
    try {
        const res = await apiRequest(`/vendors?search=${encodeURIComponent(q)}`, { method: 'GET' });
        _vendorsCache = res.vendors || [];
        renderVendorList(_vendorsCache);
    } catch (e) {
        const el = document.getElementById('vendorList'); if (el) el.innerHTML = `<p class="empty-state">Could not load vendors: ${e.message}</p>`;
    }
}

async function loadVendorAnalytics() {
    if (typeof Chart === 'undefined') { setTimeout(loadVendorAnalytics, 400); return; }
    let data;
    try { data = await apiRequest('/vendors/analytics', { method: 'GET' }); }
    catch (e) { return; }
    renderVendorKpis(data.kpis || {});
    ['q1', 'q2', 'q3', 'q4'].forEach(q => renderVendorPie(q, (data.revenueByQuarter || {})[q] || []));
    renderVendorIndex(data.perfRiskIndex || []);
}

function renderVendorKpis(k) {
    const el = document.getElementById('vendorKpis');
    if (!el) return;
    const card = (icon, cls, val, label) => `<div class="stat-card"><div class="stat-icon ${cls}"><i class="fas ${icon}"></i></div><div class="stat-content"><h3>${val}</h3><p>${label}</p></div></div>`;
    el.innerHTML =
        card('fa-truck-loading', 'blue-bg', k.totalVendors || 0, 'Total Vendors') +
        card('fa-check-circle', 'aqua-bg', k.activeVendors || 0, 'Active') +
        card('fa-dollar-sign', 'blue-bg', '$' + (k.totalRevenue || 0).toLocaleString(), 'Total Revenue') +
        card('fa-tachometer-alt', 'orange-bg', (k.avgPerformance || 0) + '% / ' + (k.avgRisk || 0) + '%', 'Avg KPI / KRI');
}

const PIE_COLORS = ['#2d6cdf', '#2ecc71', '#f39c12', '#e74c3c', '#8e44ad', '#00bcd4', '#ff6b6b', '#16a085', '#d35400', '#7f8c8d'];

function renderVendorPie(q, points) {
    const ctx = document.getElementById('vendorPie' + q.toUpperCase());
    if (!ctx) return;
    vDestroy(q);
    const nonzero = points.filter(p => (p.value || 0) > 0);
    const src = nonzero.length ? nonzero : [{ name: 'No data', value: 1 }];
    window.__vcharts[q] = new Chart(ctx, {
        type: 'pie',
        data: { labels: src.map(p => p.name), datasets: [{ data: src.map(p => p.value), backgroundColor: src.map((_, i) => PIE_COLORS[i % PIE_COLORS.length]), borderWidth: 1, borderColor: '#fff' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.label}: $${(c.parsed || 0).toLocaleString()}` } } } }
    });
}

function renderVendorIndex(items) {
    const el = document.getElementById('vendorIndexList');
    if (!el) return;
    if (!items.length) { el.innerHTML = '<p class="empty-state">Add vendors with performance/risk scores to see the index.</p>'; return; }
    el.innerHTML = items.map(v => {
        const color = v.index >= 70 ? '#2ecc71' : v.index >= 40 ? '#f39c12' : '#e74c3c';
        return `<div class="activity-item">
            <div class="activity-icon" style="background:${color};"><span style="color:#fff;font-weight:700;font-size:0.8rem;">${v.index}</span></div>
            <div class="activity-content" style="flex:1;">
                <div class="activity-title">${escV(v.name)} <span style="font-size:0.75em;color:#888;">${v.vendorId}</span></div>
                <div class="activity-time">
                    Performance (KPI): <strong>${v.performance}%</strong> · Risk (KRI): <strong>${v.risk}%</strong> · Revenue: $${(v.revenue || 0).toLocaleString()}
                    <div style="margin-top:5px;background:#eee;border-radius:4px;height:8px;overflow:hidden;max-width:320px;"><div style="width:${v.index}%;height:100%;background:${color};"></div></div>
                    <small>Composite Performance &amp; Risk Index: ${v.index}/100</small>
                </div>
            </div>
        </div>`;
    }).join('');
}

function renderVendorList(vendors) {
    const el = document.getElementById('vendorList');
    if (!el) return;
    if (!vendors.length) { el.innerHTML = '<p class="empty-state">No vendors yet. Click "Add Vendor".</p>'; return; }
    el.innerHTML = vendors.map(v => `
        <div class="activity-item">
            <div class="activity-icon blue-bg"><i class="fas fa-building"></i></div>
            <div class="activity-content" style="flex:1;">
                <div class="activity-title">${escV(v.name)} <span style="font-size:0.75em;color:#888;">${v.vendorId} · ${(v.status||'').toUpperCase()}</span></div>
                <div class="activity-time">
                    ${v.category ? escV(v.category) + ' · ' : ''}${v.contactName ? escV(v.contactName) : ''}${v.contactEmail ? ' · ' + escV(v.contactEmail) : ''}
                    <br>Revenue Q1-Q4: $${(v.revenue?.q1||0).toLocaleString()} / $${(v.revenue?.q2||0).toLocaleString()} / $${(v.revenue?.q3||0).toLocaleString()} / $${(v.revenue?.q4||0).toLocaleString()}
                </div>
                <div style="margin-top:6px;display:flex;gap:8px;">
                    <button class="btn btn-sm btn-secondary" onclick="editVendor('${v.vendorId}')"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn btn-sm btn-primary" onclick="openVendorDocs('${v.vendorId}','${escAttr(v.name)}')"><i class="fas fa-folder-open"></i> Documents</button>
                    <button class="btn btn-sm btn-delete" onclick="deleteVendor('${v.vendorId}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </div>`).join('');
}

// ---- Vendor modal ----
function openVendorModal(v) {
    const g = id => document.getElementById(id);
    g('vendorEditId').value = v ? v.vendorId : '';
    g('vendorModalTitle').innerHTML = v ? '<i class="fas fa-truck-loading"></i> Edit Vendor' : '<i class="fas fa-truck-loading"></i> Add Vendor';
    g('venName').value = v ? v.name : '';
    g('venCategory').value = v ? (v.category || '') : '';
    g('venContactName').value = v ? (v.contactName || '') : '';
    g('venContactEmail').value = v ? (v.contactEmail || '') : '';
    g('venContactPhone').value = v ? (v.contactPhone || '') : '';
    g('venStatus').value = v ? (v.status || 'active') : 'active';
    ['Rev', 'Perf', 'Risk'].forEach(kind => {
        const src = v ? (kind === 'Rev' ? v.revenue : kind === 'Perf' ? v.performance : v.risk) : {};
        ['q1', 'q2', 'q3', 'q4'].forEach(q => { g('ven' + kind + q.toUpperCase()).value = (src && src[q]) || ''; });
    });
    g('vendorModal').classList.add('active');
}
function closeVendorModal() { document.getElementById('vendorModal').classList.remove('active'); }

async function submitVendor(event) {
    event.preventDefault();
    const g = id => document.getElementById(id);
    const quart = kind => ({ q1: g('ven' + kind + 'Q1').value, q2: g('ven' + kind + 'Q2').value, q3: g('ven' + kind + 'Q3').value, q4: g('ven' + kind + 'Q4').value });
    const body = {
        name: g('venName').value.trim(), category: g('venCategory').value, status: g('venStatus').value,
        contactName: g('venContactName').value, contactEmail: g('venContactEmail').value, contactPhone: g('venContactPhone').value,
        revenue: quart('Rev'), performance: quart('Perf'), risk: quart('Risk')
    };
    if (!body.name) { showNotification('Vendor name is required', 'error'); return; }
    const editId = g('vendorEditId').value;
    try {
        if (editId) { await apiRequest(`/vendors/${editId}`, { method: 'PUT', body }); showNotification('Vendor updated', 'success'); }
        else { const r = await apiRequest('/vendors', { method: 'POST', body }); showNotification(`Vendor added — ${r.vendor.vendorId}`, 'success'); }
        closeVendorModal();
        loadVendorDashboard();
    } catch (e) { showNotification(`Could not save: ${e.message}`, 'error'); }
}

function editVendor(id) { const v = _vendorsCache.find(x => x.vendorId === id); if (v) openVendorModal(v); }
async function deleteVendor(id) {
    if (!confirm('Delete this vendor?')) return;
    try { await apiRequest(`/vendors/${id}`, { method: 'DELETE' }); loadVendorDashboard(); }
    catch (e) { showNotification(`Could not delete: ${e.message}`, 'error'); }
}

// ---- Documents ----
function openVendorDocModal() {
    const vSel = document.getElementById('docVendor');
    if (vSel) vSel.innerHTML = '<option value="">— General / unassigned —</option>' + _vendorsCache.map(v => `<option value="${v.vendorId}|${escAttr(v.name)}">${escV(v.name)}</option>`).join('');
    const tSel = document.getElementById('docType');
    if (tSel) tSel.innerHTML = VENDOR_DOC_TYPES.map(t => `<option>${t}</option>`).join('');
    const f = document.getElementById('docFile'); if (f) f.value = '';
    document.getElementById('vendorDocModal').classList.add('active');
}
function closeVendorDocModal() { document.getElementById('vendorDocModal').classList.remove('active'); }

async function submitVendorDoc(event) {
    event.preventDefault();
    const file = document.getElementById('docFile')?.files?.[0];
    if (!file) { showNotification('Select a file', 'error'); return; }
    if (file.size > 30 * 1024 * 1024) { showNotification('File exceeds 30MB', 'error'); return; }
    const vendorVal = (document.getElementById('docVendor')?.value || '').split('|');
    const form = new FormData();
    form.append('document', file);
    form.append('docType', document.getElementById('docType')?.value || 'Other');
    form.append('vendorRef', vendorVal[0] || '');
    form.append('vendorName', vendorVal[1] || '');
    try {
        const token = localStorage.getItem('authToken');
        const resp = await fetch(`${window.API_BASE_URL || '/api'}/vendors/documents`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
        const d = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(d.message || d.error || 'upload failed');
        showNotification('Document uploaded', 'success');
        closeVendorDocModal();
        loadVendorDocs();
    } catch (e) { showNotification(`Upload failed: ${e.message}`, 'error'); }
}

async function loadVendorDocs() {
    const el = document.getElementById('vendorDocList');
    if (!el) return;
    try {
        const res = await apiRequest('/vendors/documents', { method: 'GET' });
        const docs = res.documents || [];
        if (!docs.length) { el.innerHTML = '<p class="empty-state">No documents uploaded yet.</p>'; return; }
        el.innerHTML = docs.map(d => `
            <div class="activity-item">
                <div class="activity-icon aqua-bg"><i class="fas fa-file-alt"></i></div>
                <div class="activity-content" style="flex:1;">
                    <div class="activity-title">${escV(d.docType)}${d.vendorName ? ' — ' + escV(d.vendorName) : ''}</div>
                    <div class="activity-time">${escV(d.originalName)} · ${(d.size/1024).toFixed(0)} KB · ${new Date(d.createdAt).toLocaleDateString()}</div>
                    <div style="margin-top:6px;display:flex;gap:8px;">
                        <a class="btn btn-sm btn-primary" href="${d.url}" target="_blank" download><i class="fas fa-download"></i> Download</a>
                        <button class="btn btn-sm btn-delete" onclick="deleteVendorDoc('${d.docId}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>`).join('');
    } catch (e) { el.innerHTML = `<p class="empty-state">Could not load documents: ${e.message}</p>`; }
}

async function deleteVendorDoc(docId) {
    if (!confirm('Delete this document?')) return;
    try { await apiRequest(`/vendors/documents/${docId}`, { method: 'DELETE' }); loadVendorDocs(); if (window.__vendorDocsOpen) loadVendorDocsFor(window.__vendorDocsOpen.id); }
    catch (e) { showNotification(`Could not delete: ${e.message}`, 'error'); }
}

// ---- Per-vendor documents (specific to one vendor) ----
function openVendorDocs(vendorId, name) {
    window.__vendorDocsOpen = { id: vendorId, name };
    let overlay = document.getElementById('vendorDocsModal');
    if (overlay) overlay.remove();
    overlay = document.createElement('div');
    overlay.id = 'vendorDocsModal';
    overlay.className = 'modal active';
    overlay.style.display = 'flex';
    overlay.innerHTML = `
        <div class="modal-content" style="max-width:640px;">
            <div class="modal-header"><h2><i class="fas fa-folder-open"></i> Documents — ${escV(name)}</h2>
                <button class="close-btn" onclick="document.getElementById('vendorDocsModal').remove()">&times;</button></div>
            <div style="padding:0 4px;">
                <div class="form-row">
                    <div class="form-group"><label>Document Type</label>
                        <select id="vDocType">${VENDOR_DOC_TYPES.map(t => `<option>${t}</option>`).join('')}</select>
                    </div>
                    <div class="form-group"><label>File (PDF, Excel, Word)</label>
                        <input type="file" id="vDocFile" accept=".pdf,.doc,.docx,.xls,.xlsx,.ods,.csv,.ppt,.pptx,.txt,image/*">
                    </div>
                </div>
                <button class="btn btn-primary" onclick="uploadVendorDocFor()"><i class="fas fa-upload"></i> Upload to ${escV(name)}</button>
                <hr style="margin:12px 0;">
                <h4>Documents for this vendor</h4>
                <div id="vendorDocsList" class="activity-list"><p class="empty-state">Loading…</p></div>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    loadVendorDocsFor(vendorId);
}

async function loadVendorDocsFor(vendorId) {
    const el = document.getElementById('vendorDocsList');
    if (!el) return;
    try {
        const res = await apiRequest(`/vendors/documents?vendorRef=${encodeURIComponent(vendorId)}`, { method: 'GET' });
        const docs = res.documents || [];
        el.innerHTML = docs.length ? docs.map(d => `
            <div class="activity-item">
                <div class="activity-icon aqua-bg"><i class="fas fa-file-alt"></i></div>
                <div class="activity-content" style="flex:1;">
                    <div class="activity-title">${escV(d.docType)} — ${escV(d.originalName)}</div>
                    <div class="activity-time">${(d.size/1024).toFixed(0)} KB · ${new Date(d.createdAt).toLocaleDateString()}</div>
                    <div style="margin-top:6px;display:flex;gap:8px;">
                        <a class="btn btn-sm btn-primary" href="${d.url}" target="_blank" download><i class="fas fa-download"></i> Download</a>
                        <button class="btn btn-sm btn-delete" onclick="deleteVendorDoc('${d.docId}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>`).join('') : '<p class="empty-state">No documents for this vendor yet.</p>';
    } catch (e) { el.innerHTML = `<p class="empty-state">Could not load: ${escV(e.message)}</p>`; }
}

async function uploadVendorDocFor() {
    const ctx = window.__vendorDocsOpen;
    if (!ctx) return;
    const file = document.getElementById('vDocFile')?.files?.[0];
    if (!file) { showNotification('Select a file', 'error'); return; }
    if (file.size > 30 * 1024 * 1024) { showNotification('File exceeds 30MB', 'error'); return; }
    const form = new FormData();
    form.append('document', file);
    form.append('docType', document.getElementById('vDocType')?.value || 'Other');
    form.append('vendorRef', ctx.id);
    form.append('vendorName', ctx.name);
    try {
        const token = localStorage.getItem('authToken');
        const resp = await fetch(`${window.API_BASE_URL || '/api'}/vendors/documents`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
        const d = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(d.message || d.error || 'upload failed');
        showNotification(`Uploaded to ${ctx.name}`, 'success');
        document.getElementById('vDocFile').value = '';
        loadVendorDocsFor(ctx.id);
        loadVendorDocs();
    } catch (e) { showNotification(`Upload failed: ${e.message}`, 'error'); }
}

function escV(t) { return String(t || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m])); }
function escAttr(t) { return String(t || '').replace(/[|"']/g, ''); }
