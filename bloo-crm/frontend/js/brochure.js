/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  Proprietary software. Unauthorized copying or use by any means or technology
  (including AI tools) is strictly prohibited.
*/
/* =====================================================
   BROCHURE PAPA — AI brochure generation via Beautiful.ai (frontend)
   ===================================================== */

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
    document.getElementById('brochurePapaModal').classList.remove('active');
}
function brochurePapaReset() {
    const m = document.getElementById('bpMsg'); if (m) m.style.display = 'none';
    _bpShow('bpForm');
}

async function brochurePapaGenerate() {
    const v = id => (document.getElementById(id)?.value || '').trim();
    const topic = v('bpTopic');
    const msg = document.getElementById('bpMsg');
    msg.style.display = 'none';
    if (!topic) { msg.className = 'msg err'; msg.style.display = 'block'; msg.textContent = 'Please describe what the brochure is about.'; return; }
    const body = {
        topic, audience: v('bpAudience'), tone: v('bpTone'), details: v('bpDetails')
    };
    const btn = document.getElementById('bpGenBtn');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending…';
    try {
        // Beautiful.ai returns the finished deck immediately.
        const res = await apiRequest('/brochure/generate', { method: 'POST', body });
        if (res.url) { _bpShowResult(res); return; }
        // No URL yet — deck is still being designed in the Beautiful.ai workspace.
        _bpShow('bpProgress');
        document.getElementById('bpProgressText').textContent = 'Your deck is being designed — check your Beautiful.ai workspace in a moment.';
    } catch (e) {
        msg.className = 'msg err'; msg.style.display = 'block';
        msg.textContent = /not configured/i.test(e.message)
            ? 'Brochure Papa (Beautiful.ai) is not configured yet. Ask your administrator to add the BEAUTIFULAI_API_KEY.'
            : (e.message || 'Could not generate brochure.');
    } finally {
        btn.disabled = false; btn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Generate Brochure';
    }
}

function _bpShowResult(r) {
    const open = document.getElementById('bpOpenLink');
    open.href = r.url || '#';
    const pdf = document.getElementById('bpPdfLink');
    if (r.pdfUrl) { pdf.href = r.pdfUrl; pdf.style.display = 'inline-block'; } else { pdf.style.display = 'none'; }
    _bpShow('bpResult');
}
