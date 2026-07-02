/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  Proprietary software. Unauthorized copying or use by any means or technology
  (including AI tools) is strictly prohibited.
*/
/* =====================================================
   PROPOSALS — RFI / RFQ / RFP: guidance, AI templates, docs
   ===================================================== */

let _proType = 'RFI';
let _proLastGenerated = null;

function loadProposals() {
    proSetType(_proType);
    if (typeof renderProposalIntegrations === 'function') renderProposalIntegrations();
}

function proSetType(t) {
    _proType = t;
    ['RFI', 'RFQ', 'RFP'].forEach(x => {
        const b = document.getElementById('proTab' + x);
        if (b) b.className = 'btn btn-sm ' + (x === t ? 'btn-primary' : 'btn-secondary');
    });
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('proGuideTitle', `What goes into an ${t}`);
    set('proGenType', t);
    set('proListTitle', `Saved ${t}s & Documents`);
    proLoadGuide();
    proLoadSaved();
    proLoadDocs();
    document.getElementById('proGenResult').innerHTML = '';
}

async function proLoadGuide() {
    const el = document.getElementById('proGuide');
    el.innerHTML = '<p class="empty-state">Loading guidance…</p>';
    try {
        const res = await apiRequest(`/proposals/guide?type=${_proType}`, { method: 'GET' });
        const g = res.guide || {};
        el.innerHTML = `
            <p>${escPr(g.definition || '')}</p>
            ${g.whenToUse ? `<p style="color:#666;"><strong>When to use:</strong> ${escPr(g.whenToUse)}</p>` : ''}
            ${(g.sections && g.sections.length) ? `<div style="margin-top:8px;"><strong>Key sections to include:</strong><ul>${g.sections.map(s => '<li>' + escPr(s) + '</li>').join('')}</ul></div>` : ''}
            ${(g.tips && g.tips.length) ? `<div style="margin-top:8px;"><strong>Best-practice tips:</strong><ul>${g.tips.map(s => '<li>' + escPr(s) + '</li>').join('')}</ul></div>` : ''}
            <div style="font-size:0.72rem;color:#aaa;">${res.source === 'ai' ? 'AI-curated guidance' : 'Standard guidance (enable OpenAI for AI-curated)'}</div>`;
    } catch (e) { el.innerHTML = `<p class="empty-state">Could not load guidance: ${escPr(e.message)}</p>`; }
}

async function proGenerate() {
    const el = document.getElementById('proGenResult');
    const industry = document.getElementById('proIndustry').value;
    const notes = document.getElementById('proNotes').value;
    el.innerHTML = '<p class="empty-state">Generating template…</p>';
    try {
        const res = await apiRequest('/proposals/generate', { method: 'POST', body: { type: _proType, industry, notes } });
        _proLastGenerated = { type: res.type, industry: res.industry, title: res.title, content: res.content };
        el.innerHTML = `
            <div style="background:#f8fafc;border-radius:8px;padding:14px;">
                <div style="font-weight:600;margin-bottom:6px;">${escPr(res.title)}</div>
                <pre style="white-space:pre-wrap;font-family:inherit;margin:0;max-height:340px;overflow:auto;">${escPr(res.content)}</pre>
                <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">
                    <button class="btn btn-sm btn-primary" onclick="proSaveGenerated()"><i class="fas fa-save"></i> Save to Proposals</button>
                    <button class="btn btn-sm btn-secondary" onclick="proDownloadGenerated()"><i class="fas fa-download"></i> Download</button>
                    <span style="font-size:0.72rem;color:#aaa;align-self:center;">${res.source === 'ai' ? 'AI-generated' : 'Offline template (enable OpenAI for a tailored version)'}</span>
                </div>
            </div>`;
    } catch (e) { el.innerHTML = `<p class="empty-state">Generation failed: ${escPr(e.message)}</p>`; }
}

async function proSaveGenerated() {
    if (!_proLastGenerated) return;
    try {
        await apiRequest('/proposals', { method: 'POST', body: { ..._proLastGenerated, status: 'draft' } });
        showNotification('Saved to Proposals', 'success');
        proLoadSaved();
    } catch (e) { showNotification(`Could not save: ${e.message}`, 'error'); }
}
function proDownloadGenerated() {
    if (!_proLastGenerated) return;
    const blob = new Blob([_proLastGenerated.content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (_proLastGenerated.title || 'proposal').replace(/[^a-z0-9]+/gi, '-') + '.txt';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
}

async function proLoadSaved() {
    const el = document.getElementById('proSaved');
    if (!el) return;
    try {
        const res = await apiRequest(`/proposals?type=${_proType}`, { method: 'GET' });
        const items = res.proposals || [];
        el.innerHTML = items.length ? items.map(p => `
            <div class="activity-item">
                <div class="activity-icon blue-bg"><i class="fas fa-file-alt"></i></div>
                <div class="activity-content" style="flex:1;">
                    <div class="activity-title">${escPr(p.title)} <span style="font-size:0.72em;color:#888;">${p.proposalId} · ${p.industry} · ${p.status}</span></div>
                    <div style="margin-top:6px;display:flex;gap:8px;">
                        <button class="btn btn-sm btn-secondary" onclick="proView('${p.proposalId}')"><i class="fas fa-eye"></i> View</button>
                        <button class="btn btn-sm btn-delete" onclick="proDelete('${p.proposalId}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>`).join('') : '';
    } catch (e) { /* ignore */ }
}

async function proView(id) {
    try {
        const res = await apiRequest(`/proposals/${id}`, { method: 'GET' });
        const p = res.proposal;
        const overlay = document.createElement('div');
        overlay.className = 'modal active'; overlay.style.display = 'flex';
        overlay.innerHTML = `<div class="modal-content" style="max-width:700px;">
            <div class="modal-header"><h2><i class="fas fa-file-signature"></i> ${escPr(p.title)}</h2><button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button></div>
            <pre style="white-space:pre-wrap;font-family:inherit;max-height:60vh;overflow:auto;">${escPr(p.content)}</pre></div>`;
        document.body.appendChild(overlay);
    } catch (e) { showNotification(e.message, 'error'); }
}
async function proDelete(id) {
    if (!confirm('Delete this proposal?')) return;
    try { await apiRequest(`/proposals/${id}`, { method: 'DELETE' }); proLoadSaved(); }
    catch (e) { showNotification(e.message, 'error'); }
}

async function proUploadDoc() {
    const file = document.getElementById('proDocFile').files[0];
    if (!file) return;
    const form = new FormData();
    form.append('document', file);
    form.append('type', _proType);
    try {
        const token = localStorage.getItem('authToken');
        const resp = await fetch(`${window.API_BASE_URL || '/api'}/proposals/documents`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
        const d = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(d.message || d.error || 'upload failed');
        showNotification('Document uploaded', 'success');
        document.getElementById('proDocFile').value = '';
        proLoadDocs();
    } catch (e) { showNotification(`Upload failed: ${e.message}`, 'error'); }
}

async function proLoadDocs() {
    const el = document.getElementById('proDocs');
    if (!el) return;
    try {
        const res = await apiRequest(`/proposals/documents/list?type=${_proType}`, { method: 'GET' });
        const docs = res.documents || [];
        el.innerHTML = docs.map(d => `
            <div class="activity-item">
                <div class="activity-icon aqua-bg"><i class="fas fa-paperclip"></i></div>
                <div class="activity-content" style="flex:1;">
                    <div class="activity-title">${escPr(d.originalName)}</div>
                    <div class="activity-time">${(d.size/1024).toFixed(0)} KB · ${new Date(d.createdAt).toLocaleDateString()}</div>
                    <div style="margin-top:6px;display:flex;gap:8px;">
                        <a class="btn btn-sm btn-primary" href="${d.url}" target="_blank" download><i class="fas fa-download"></i> Download</a>
                        <button class="btn btn-sm btn-delete" onclick="proDeleteDoc('${d.docId}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>`).join('');
    } catch (e) { /* ignore */ }
}
async function proDeleteDoc(id) {
    if (!confirm('Delete this document?')) return;
    try { await apiRequest(`/proposals/documents/${id}`, { method: 'DELETE' }); proLoadDocs(); }
    catch (e) { showNotification(e.message, 'error'); }
}

function escPr(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m])); }
