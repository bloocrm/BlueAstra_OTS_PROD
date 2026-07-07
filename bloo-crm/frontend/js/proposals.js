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
    // Hide the 🔒 badges on the header buttons for Rocket AI+ users
    const rocket = (typeof isRocketPlan === 'function') && isSwiftPlan();
    document.querySelectorAll('#proposals .pro-lock').forEach(el => { el.style.display = rocket ? 'none' : ''; });
}

// Resolve which proposal the top buttons act on (current, else most recent saved)
async function proResolveCurrent() {
    if (window.__proCurrentId) return window.__proCurrentId;
    try {
        const res = await apiRequest('/proposals', { method: 'GET' });
        const items = res.proposals || [];
        if (items.length) { window.__proCurrentId = items[0].proposalId; return window.__proCurrentId; }
    } catch (e) {}
    showNotification('Generate or save a proposal first, then use these actions.', 'error');
    return null;
}

// Top-right: Assign Employee (Rocket AI+)
async function proAssignEmployeeTop() {
    if (!swiftGate('Assign employee to proposal')) return;
    const id = await proResolveCurrent();
    if (id) proAssign(id);
}

// Top-right: Send to Lead / Client (Rocket AI+)
async function proSendTo(recipientType) {
    if (!swiftGate('Send proposal to ' + recipientType)) return;
    const id = await proResolveCurrent();
    if (!id) return;
    const to = prompt(`Send this proposal to the ${recipientType}'s email address:`);
    if (!to) return;
    try {
        const res = await apiRequest(`/proposals/${id}/send`, { method: 'POST', body: { to, recipientType } });
        showNotification(res.emailed ? `Proposal sent to ${recipientType} (${to})` : `Logged (demo mode) for ${to}`, res.emailed ? 'success' : 'info');
    } catch (e) {
        if ((e.message || '').toLowerCase().includes('rocket')) showNotification('This requires the Rocket AI+ plan.', 'error');
        else showNotification(`Could not send: ${e.message}`, 'error');
    }
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
            <p style="margin-bottom:12px;line-height:1.6;">${escPr(g.definition || '')}</p>
            ${g.whenToUse ? `<div class="pro-guide-note"><strong>When to use:</strong> ${escPr(g.whenToUse)}</div>` : ''}
            <div class="pro-guide-cols">
                ${(g.sections && g.sections.length) ? `<div class="pro-guide-col"><h4><i class="fas fa-list-check"></i> Key sections to include</h4><ul class="pro-guide-list">${g.sections.map(s => '<li>' + escPr(s) + '</li>').join('')}</ul></div>` : ''}
                ${(g.tips && g.tips.length) ? `<div class="pro-guide-col"><h4><i class="fas fa-lightbulb"></i> Best-practice tips</h4><ul class="pro-guide-list">${g.tips.map(s => '<li>' + escPr(s) + '</li>').join('')}</ul></div>` : ''}
            </div>
            <div style="font-size:0.72rem;color:#aaa;margin-top:10px;">${res.source === 'ai' ? 'AI-curated guidance' : 'Standard guidance (enable OpenAI for AI-curated)'}</div>`;
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
                <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
                    <button class="btn btn-sm btn-primary" onclick="proSaveGenerated()"><i class="fas fa-save"></i> Save to Proposals</button>
                    <button class="btn btn-sm btn-secondary" onclick="proDownloadWord()"><i class="fas fa-file-word"></i> Save as Word</button>
                    <button class="btn btn-sm btn-secondary" onclick="proDownloadPdf()"><i class="fas fa-file-pdf"></i> Save as PDF</button>
                    <button class="btn btn-sm btn-secondary" onclick="proSaveGeneratedDoc()"><i class="fas fa-database"></i> Save to Documents</button>
                    <button class="btn btn-sm" style="background:linear-gradient(135deg,#7C4DFF,#B388FF);color:#fff;border:none;" onclick="proToBrochure()"><i class="fas fa-wand-magic-sparkles"></i> Convert to Brochure</button>
                </div>
                <div class="pro-brochure-ask">💡 Want to turn this ${escPr(res.type || _proType)} into a designed brochure? <a href="#" onclick="proToBrochure();return false;">Convert to Brochure →</a></div>
                <div style="font-size:0.72rem;color:#aaa;margin-top:6px;">${res.source === 'ai' ? 'AI-generated' : 'Offline template (enable OpenAI for a tailored version)'} · Saving to Documents compresses &amp; stores it in the cloud.</div>
            </div>`;
    } catch (e) { el.innerHTML = `<p class="empty-state">Generation failed: ${escPr(e.message)}</p>`; }
}

async function proSaveGenerated() {
    if (!_proLastGenerated) return;
    try {
        const r = await apiRequest('/proposals', { method: 'POST', body: { ..._proLastGenerated, status: 'draft' } });
        if (r.proposal) window.__proCurrentId = r.proposal.proposalId;
        showNotification('Saved to Proposals', 'success');
        proLoadSaved();
    } catch (e) { showNotification(`Could not save: ${e.message}`, 'error'); }
}
function proDownloadGenerated() {
    if (!_proLastGenerated) return;
    proDownloadWord();
}

// ---- Word / PDF export + compressed cloud storage ----
function _proFile(title) { return (title || 'document').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'document'; }
function _proDl(name, blob) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}
function _proDocHtml(title, content) {
    return `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset='utf-8'><title>${escPr(title)}</title></head>
    <body style="font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#222;">
    <h2 style="color:#16233a;">${escPr(title)}</h2>
    <pre style="white-space:pre-wrap;font-family:Calibri,Arial,sans-serif;font-size:11pt;">${escPr(content)}</pre></body></html>`;
}
function _proBuildWord(title, content) {
    _proDl(_proFile(title) + '.doc', new Blob(['﻿' + _proDocHtml(title, content)], { type: 'application/msword' }));
}
function _proBuildPdf(title, content) {
    const ns = window.jspdf || {};
    const JsPDF = ns.jsPDF;
    if (!JsPDF) { showNotification('PDF library not loaded — try Word instead.', 'error'); return; }
    const doc = new JsPDF({ unit: 'pt', format: 'a4' });
    const margin = 48, W = doc.internal.pageSize.getWidth() - margin * 2, H = doc.internal.pageSize.getHeight() - margin;
    let y = margin;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
    doc.splitTextToSize(title || 'Document', W).forEach(l => { doc.text(l, margin, y); y += 22; });
    y += 6; doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
    doc.splitTextToSize(content || '', W).forEach(l => { if (y > H) { doc.addPage(); y = margin; } doc.text(l, margin, y); y += 15; });
    doc.save(_proFile(title) + '.pdf');
}

// Store a compressed copy in MongoDB (a few KB) — used on any save/download
async function proSaveToMongo(format) {
    if (!_proLastGenerated) return;
    try {
        await apiRequest('/proposals/documents/save-generated', {
            method: 'POST',
            body: { title: _proLastGenerated.title, type: _proType, content: _proLastGenerated.content, format: format || 'text' }
        });
        proLoadDocs();
    } catch (e) { /* non-fatal */ }
}

async function proSaveGeneratedDoc() {
    if (!_proLastGenerated) { showNotification('Generate a template first.', 'info'); return; }
    try {
        await apiRequest('/proposals/documents/save-generated', { method: 'POST', body: { title: _proLastGenerated.title, type: _proType, content: _proLastGenerated.content, format: 'text' } });
        showNotification('Saved to Documents — compressed & stored in the cloud.', 'success');
        proLoadDocs();
    } catch (e) { showNotification('Could not save: ' + e.message, 'error'); }
}

function proDownloadWord() {
    if (!_proLastGenerated) return;
    _proBuildWord(_proLastGenerated.title, _proLastGenerated.content);
    proSaveToMongo('word');
    showNotification('Downloaded Word — a compressed copy was saved to Documents.', 'success');
}
function proDownloadPdf() {
    if (!_proLastGenerated) return;
    _proBuildPdf(_proLastGenerated.title, _proLastGenerated.content);
    proSaveToMongo('pdf');
    showNotification('Downloaded PDF — a compressed copy was saved to Documents.', 'success');
}

// Ask / convert the generated template into a designed brochure
function proToBrochure() {
    if (typeof openBrochurePapa !== 'function') { showNotification('Convert to Brochure is unavailable.', 'error'); return; }
    openBrochurePapa();
    setTimeout(() => {
        const t = document.getElementById('bpTopic');
        const d = document.getElementById('bpDetails');
        if (t && _proLastGenerated) t.value = _proLastGenerated.title || (_proType + ' brochure');
        if (d && _proLastGenerated) d.value = (_proLastGenerated.content || '').slice(0, 1500);
    }, 150);
}

// Download a saved generated document (word/pdf) from the Documents list
async function proDownloadDoc(docId, format) {
    try {
        const res = await apiRequest('/proposals/documents/' + encodeURIComponent(docId) + '/content', { method: 'GET' });
        if (format === 'pdf') _proBuildPdf(res.title, res.content);
        else _proBuildWord(res.title, res.content);
    } catch (e) { showNotification('Download failed: ' + e.message, 'error'); }
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
                    <div class="activity-title">${escPr(p.title)} <span style="font-size:0.72em;color:#888;">${p.proposalId} · ${p.industry} · ${p.status}</span>${p.assignedEmployee ? ` <span style="font-size:0.72em;color:var(--theme-primary);"><i class="fas fa-id-badge"></i> ${escPr(p.assignedEmployee)}</span>` : ''}</div>
                    <div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap;">
                        <button class="btn btn-sm btn-secondary" onclick="proView('${p.proposalId}')"><i class="fas fa-eye"></i> View</button>
                        <button class="btn btn-sm btn-secondary" onclick="proAssign('${p.proposalId}')"><i class="fas fa-user-plus"></i> Assign Employee ${(typeof isRocketPlan==='function'&&isSwiftPlan())?'':'🔒'}</button>
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
        window.__proCurrentId = id;
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

// Assign an employee to a proposal's activities (Rocket AI+ only)
async function proAssign(id) {
    if (typeof rocketGate === 'function' && !swiftGate('Assign employee to proposal activities')) return;
    const employee = prompt('Assign which employee to this proposal\'s activities/workflow?');
    if (employee === null) return;
    try {
        await apiRequest(`/proposals/${id}/assign`, { method: 'POST', body: { assignedEmployee: employee } });
        showNotification('Employee assigned to proposal', 'success');
        proLoadSaved();
    } catch (e) {
        if ((e.message || '').toLowerCase().includes('rocket')) showNotification('This requires the Rocket AI+ plan.', 'error');
        else showNotification(`Could not assign: ${e.message}`, 'error');
    }
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
        el.innerHTML = docs.map(d => {
            const isGen = d.source === 'generated';
            const dl = isGen
                ? `<button class="btn btn-sm btn-primary" onclick="proDownloadDoc('${d.docId}','word')"><i class="fas fa-file-word"></i> Word</button>
                   <button class="btn btn-sm btn-secondary" onclick="proDownloadDoc('${d.docId}','pdf')"><i class="fas fa-file-pdf"></i> PDF</button>`
                : `<a class="btn btn-sm btn-primary" href="${d.url}" target="_blank" download><i class="fas fa-download"></i> Download</a>`;
            return `
            <div class="activity-item">
                <div class="activity-icon ${isGen ? 'blue-bg' : 'aqua-bg'}"><i class="fas ${isGen ? 'fa-file-lines' : 'fa-paperclip'}"></i></div>
                <div class="activity-content" style="flex:1;">
                    <div class="activity-title">${escPr(d.title || d.originalName)} ${isGen ? '<span style="font-size:0.7em;color:#7C4DFF;font-weight:700;">generated · compressed</span>' : ''}</div>
                    <div class="activity-time">${(d.size / 1024).toFixed(1)} KB · ${new Date(d.createdAt).toLocaleDateString()}</div>
                    <div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap;">
                        ${dl}
                        <button class="btn btn-sm btn-delete" onclick="proDeleteDoc('${d.docId}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>`;
        }).join('');
    } catch (e) { /* ignore */ }
}
async function proDeleteDoc(id) {
    if (!confirm('Delete this document?')) return;
    try { await apiRequest(`/proposals/documents/${id}`, { method: 'DELETE' }); proLoadDocs(); }
    catch (e) { showNotification(e.message, 'error'); }
}

// ===== Proposal Bucket — consolidated store of everything saved under Proposals =====
let _proBucket = [];
let _proBucketKind = 'all';

async function openProposalBucket() {
    document.getElementById('proBucketModal').classList.add('active');
    const list = document.getElementById('proBucketList');
    list.innerHTML = '<p class="empty-state">Loading…</p>';
    proBucketFilter('all');
    try {
        const res = await apiRequest('/proposals/bucket', { method: 'GET' });
        _proBucket = res.items || [];
        const c = res.counts || { proposals: 0, documents: 0 };
        const sum = document.getElementById('proBucketSummary');
        if (sum) sum.textContent = `· ${res.count || 0} items (${c.proposals} proposals · ${c.documents} documents)`;
        proBucketRender();
    } catch (e) {
        list.innerHTML = `<p class="empty-state">Could not load the bucket: ${escPr(e.message)}</p>`;
    }
}
function closeProposalBucket() { document.getElementById('proBucketModal').classList.remove('active'); }

function proBucketFilter(kind) {
    _proBucketKind = kind;
    ['all', 'proposal', 'document'].forEach(k => {
        const b = document.getElementById('proBucketFilter' + k);
        if (b) b.className = 'btn btn-sm ' + (k === kind ? 'btn-primary' : 'btn-secondary');
    });
    proBucketRender();
}

function _proBucketWhen(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) +
        ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function proBucketRender() {
    const list = document.getElementById('proBucketList');
    if (!list) return;
    const q = (document.getElementById('proBucketSearch')?.value || '').trim().toLowerCase();
    let items = _proBucket.slice();
    if (_proBucketKind !== 'all') items = items.filter(i => i.kind === _proBucketKind);
    if (q) items = items.filter(i => (`${i.title || ''} ${i.type || ''} ${i.id || ''}`).toLowerCase().includes(q));
    if (!items.length) { list.innerHTML = '<p class="empty-state">Nothing stored yet.</p>'; return; }
    list.innerHTML = items.map(i => {
        const when = _proBucketWhen(i.storedAt);
        const isProposal = i.kind === 'proposal';
        const icon = isProposal ? 'fa-file-signature' : (i.source === 'generated' ? 'fa-file-lines' : 'fa-paperclip');
        const bg = (isProposal || i.source === 'generated') ? 'blue-bg' : 'aqua-bg';
        let actions;
        if (isProposal) {
            actions = `<button class="btn btn-sm btn-secondary" onclick="proView('${i.id}')"><i class="fas fa-eye"></i> View</button>`;
        } else if (i.source === 'generated') {
            actions = `<button class="btn btn-sm btn-primary" onclick="proDownloadDoc('${i.id}','word')"><i class="fas fa-file-word"></i> Word</button>
                       <button class="btn btn-sm btn-secondary" onclick="proDownloadDoc('${i.id}','pdf')"><i class="fas fa-file-pdf"></i> PDF</button>`;
        } else {
            actions = `<a class="btn btn-sm btn-primary" href="${i.url}" target="_blank" download><i class="fas fa-download"></i> Download</a>`;
        }
        const meta = isProposal
            ? `${i.type} · ${escPr(i.industry || '')} · ${escPr(i.status || '')}${i.assignedEmployee ? ' · ' + escPr(i.assignedEmployee) : ''}`
            : `${escPr(i.type || '')} · ${i.source === 'generated' ? 'generated' : 'uploaded'}${i.size ? ' · ' + (i.size / 1024).toFixed(1) + ' KB' : ''}`;
        return `
        <div class="activity-item">
            <div class="activity-icon ${bg}"><i class="fas ${icon}"></i></div>
            <div class="activity-content" style="flex:1;">
                <div class="activity-title">${escPr(i.title || i.id)}
                    <span style="font-size:0.7em;color:#fff;background:${isProposal ? '#2d6cdf' : '#12b3a6'};padding:1px 7px;border-radius:9px;margin-left:6px;">${isProposal ? 'Proposal' : 'Document'}</span>
                </div>
                <div class="activity-time" style="color:#888;"><i class="far fa-clock"></i> Stored ${when} &nbsp;·&nbsp; ${meta} &nbsp;·&nbsp; <span style="color:#aaa;">${escPr(i.id)}</span></div>
                <div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap;">${actions}</div>
            </div>
        </div>`;
    }).join('');
}

function escPr(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m])); }
