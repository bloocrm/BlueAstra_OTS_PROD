/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  Proprietary software. Unauthorized copying or use by any means or technology
  (including AI tools) is strictly prohibited.
*/
/* =====================================================
   BROCHURE PAPA — AI brochure generation via Gamma (frontend)
   ===================================================== */

let _bpPoll = null;

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
    if (_bpPoll) { clearInterval(_bpPoll); _bpPoll = null; }
    document.getElementById('brochurePapaModal').classList.remove('active');
}
function brochurePapaReset() {
    if (_bpPoll) { clearInterval(_bpPoll); _bpPoll = null; }
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
        topic, audience: v('bpAudience'), tone: v('bpTone'), format: v('bpFormat'),
        cards: parseInt(v('bpCards'), 10) || 6, details: v('bpDetails')
    };
    const btn = document.getElementById('bpGenBtn');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending…';
    try {
        const res = await apiRequest('/brochure/generate', { method: 'POST', body });
        if (res.url && !res.pending) { _bpShowResult(res); return; }
        // poll until ready
        _bpShow('bpProgress');
        _bpPollStatus(res.generationId);
    } catch (e) {
        msg.className = 'msg err'; msg.style.display = 'block';
        msg.textContent = /not configured/i.test(e.message)
            ? 'Brochure Papa (Gamma) is not configured yet. Ask your administrator to add the GAMMA_API_KEY.'
            : (e.message || 'Could not generate brochure.');
    } finally {
        btn.disabled = false; btn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Generate Brochure';
    }
}

function _bpPollStatus(generationId) {
    let tries = 0;
    _bpPoll = setInterval(async () => {
        tries++;
        if (tries > 24) { clearInterval(_bpPoll); _bpPoll = null; document.getElementById('bpProgressText').textContent = 'Still working — please try again shortly.'; return; }
        try {
            const st = await apiRequest('/brochure/status/' + encodeURIComponent(generationId), { method: 'GET' });
            if (st.status === 'completed' && st.url) { clearInterval(_bpPoll); _bpPoll = null; _bpShowResult(st); }
            else if (st.status === 'failed') { clearInterval(_bpPoll); _bpPoll = null; brochurePapaReset(); showNotification('Brochure generation failed. Please try again.', 'error'); }
        } catch (e) { /* keep polling */ }
    }, 5000);
}

function _bpShowResult(r) {
    const open = document.getElementById('bpOpenLink');
    open.href = r.url || '#';
    const pdf = document.getElementById('bpPdfLink');
    if (r.pdfUrl) { pdf.href = r.pdfUrl; pdf.style.display = 'inline-block'; } else { pdf.style.display = 'none'; }
    _bpShow('bpResult');
}
