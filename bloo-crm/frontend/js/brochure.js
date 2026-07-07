/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  Proprietary software. Unauthorized copying or use by any means or technology
  (including AI tools) is strictly prohibited.
*/
/* =====================================================
   BROCHURE PAPA + BROCHURE STUDIO (frontend)
   Generates a brochure, then previews / exports / saves it entirely inside
   BlooCRM — files are proxied through the backend, no external URLs exposed.
   ===================================================== */

let _bpLast = { brochureId: null, title: null };
let _bpPreviewUrl = null;

function _bpShow(id) {
    ['bpForm', 'bpProgress', 'bpResult'].forEach(v => {
        const el = document.getElementById(v); if (el) el.style.display = (v === id) ? 'block' : 'none';
    });
}

function openBrochurePapa() {
    brochurePapaReset();
    document.getElementById('brochurePapaModal').classList.add('active');
}
function closeBrochurePapa() {
    if (_bpPreviewUrl) { URL.revokeObjectURL(_bpPreviewUrl); _bpPreviewUrl = null; }
    document.getElementById('brochurePapaModal').classList.remove('active');
}
function brochurePapaReset() {
    const m = document.getElementById('bpMsg'); if (m) m.style.display = 'none';
    const mc = document.getElementById('bpModalContent'); if (mc) mc.style.maxWidth = '560px';
    if (_bpPreviewUrl) { URL.revokeObjectURL(_bpPreviewUrl); _bpPreviewUrl = null; }
    _bpShow('bpForm');
}

async function brochurePapaGenerate() {
    const v = id => (document.getElementById(id)?.value || '').trim();
    const topic = v('bpTopic');
    const msg = document.getElementById('bpMsg');
    msg.style.display = 'none';
    if (!topic) { msg.className = 'msg err'; msg.style.display = 'block'; msg.textContent = 'Please describe what the brochure is about.'; return; }
    const body = { topic, audience: v('bpAudience'), tone: v('bpTone'), details: v('bpDetails') };
    const btn = document.getElementById('bpGenBtn');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Designing…';
    try {
        const res = await apiRequest('/brochure/generate', { method: 'POST', body });
        if (res.brochureId) { _bpShowResult(res); return; }
        _bpShow('bpProgress');
        document.getElementById('bpProgressText').textContent = 'Your brochure is being designed — this will just take a moment.';
    } catch (e) {
        msg.className = 'msg err'; msg.style.display = 'block';
        msg.textContent = /not configured/i.test(e.message)
            ? 'Convert to Brochure is not configured yet. Ask your administrator to add the brochure API key.'
            : (e.message || 'Could not generate brochure.');
    } finally {
        btn.disabled = false; btn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Generate Brochure';
    }
}

// ---- Brochure Studio ----
function _bpShowResult(r) {
    _bpLast = { brochureId: r.brochureId || r.presentationId || null, title: r.title || null };
    const mc = document.getElementById('bpModalContent'); if (mc) mc.style.maxWidth = '860px';
    const t = document.getElementById('bpStudioTitle'); if (t) t.textContent = _bpLast.title ? ('· ' + _bpLast.title) : '';
    const sm = document.getElementById('bpStudioMsg'); if (sm) sm.style.display = 'none';
    const frame = document.getElementById('bpPreviewFrame');
    const loading = document.getElementById('bpPreviewLoading');
    if (frame) { frame.style.display = 'none'; frame.src = 'about:blank'; }
    if (loading) { loading.style.display = 'flex'; loading.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size:26px;"></i><span>Preparing your brochure preview…</span>'; }
    _bpShow('bpResult');
    if (!_bpLast.brochureId) { if (loading) loading.style.display = 'none'; _bpStudioErr('This brochure has no editable file yet. Please generate again.'); return; }
    bpPreviewPdf();
}

// Authenticated blob export proxied through BlooCRM (never hits the design service directly).
async function _bpFetchBlob(format, download) {
    const base = window.API_BASE_URL || '/api';
    const token = localStorage.getItem('authToken');
    const resp = await fetch(base + '/brochure/export', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: `Bearer ${token}` } : {}),
        body: JSON.stringify({ brochureId: _bpLast.brochureId, format, title: _bpLast.title, download: !!download })
    });
    if (!resp.ok) {
        let m = 'Export failed'; try { const j = await resp.json(); m = j.message || j.error || m; } catch (_) {}
        throw new Error(m);
    }
    return await resp.blob();
}

async function bpPreviewPdf() {
    const frame = document.getElementById('bpPreviewFrame');
    const loading = document.getElementById('bpPreviewLoading');
    try {
        const blob = await _bpFetchBlob('pdf', false);
        if (_bpPreviewUrl) URL.revokeObjectURL(_bpPreviewUrl);
        _bpPreviewUrl = URL.createObjectURL(blob);
        if (frame) { frame.src = _bpPreviewUrl + '#toolbar=1&navpanes=0'; frame.style.display = 'block'; }
        if (loading) loading.style.display = 'none';
    } catch (e) {
        if (loading) loading.innerHTML = '<span style="color:#b91c1c;">Preview unavailable — you can still download or save the file. (' + (e.message || 'error') + ')</span>';
    }
}

function _bpFileBase() { return ((_bpLast.title || 'Brochure').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'Brochure'); }
function _bpDl(name, blob) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

async function bpDownload(format) {
    _bpStudioInfo('Preparing ' + (format === 'pptx' ? 'PowerPoint' : 'PDF') + '…');
    try {
        const blob = await _bpFetchBlob(format, true);
        _bpDl(_bpFileBase() + '.' + format, blob);
        _bpStudioOk('Downloaded to your device.');
    } catch (e) { _bpStudioErr(e.message); }
}

// Word is generated from the underlying proposal text (reuses the Proposals exporter).
function bpSaveWord() {
    const src = (typeof _proLastGenerated !== 'undefined' && _proLastGenerated) ? _proLastGenerated : null;
    const title = (src && src.title) || _bpLast.title || (document.getElementById('bpTopic')?.value) || 'Brochure';
    const content = (src && src.content) || [document.getElementById('bpTopic')?.value, document.getElementById('bpDetails')?.value].filter(Boolean).join('\n\n');
    if (typeof _proBuildWord === 'function') {
        _proBuildWord(title, content);
        _bpStudioOk('Saved as Word (from the proposal text).');
    } else { _bpStudioErr('Word export is unavailable on this page.'); }
}

async function bpSaveToProposals(format) {
    format = format || 'pptx';
    _bpStudioInfo('Saving to Proposals…');
    try {
        const blob = await _bpFetchBlob(format, true);
        const name = _bpFileBase() + '.' + format;
        await _bpUploadToProposals(new File([blob], name, { type: blob.type }));
        _bpStudioOk('Saved to this proposal’s Documents.');
        if (typeof proLoadDocs === 'function') proLoadDocs();
    } catch (e) { _bpStudioErr(e.message); }
}

async function bpReuploadToProposals() {
    const input = document.getElementById('bpReupload');
    const file = input && input.files && input.files[0];
    if (!file) return;
    _bpStudioInfo('Uploading your edited file to Proposals…');
    try {
        await _bpUploadToProposals(file);
        _bpStudioOk('Edited file saved to Proposals.');
        input.value = '';
        if (typeof proLoadDocs === 'function') proLoadDocs();
    } catch (e) { _bpStudioErr(e.message); }
}

async function _bpUploadToProposals(file) {
    const base = window.API_BASE_URL || '/api';
    const token = localStorage.getItem('authToken');
    const form = new FormData();
    form.append('document', file);
    form.append('type', (typeof _proType !== 'undefined' && _proType) ? _proType : 'RFP');
    const resp = await fetch(base + '/proposals/documents', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
    const d = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(d.message || d.error || 'upload failed');
    return d;
}

function _bpStudio(cls, txt) { const m = document.getElementById('bpStudioMsg'); if (!m) return; m.className = 'msg ' + cls; m.style.display = 'block'; m.textContent = txt; }
function _bpStudioOk(t) { _bpStudio('success', t); }
function _bpStudioErr(t) { _bpStudio('err', t); }
function _bpStudioInfo(t) { _bpStudio('info', t); }
