/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  Proprietary software. Unauthorized copying, modification, or use by any means
  or technology (including AI tools) is strictly prohibited.
*/
/* =====================================================
   AI TOOLS — assistant, duplicate detection/merge, email analysis, drafting
   ===================================================== */

// ---- Assistant chat ----
async function aiSendChat() {
    const input = document.getElementById('aiChatInput');
    const log = document.getElementById('aiChatLog');
    const msg = (input?.value || '').trim();
    if (!msg) return;
    input.value = '';
    log.innerHTML += `<div style="margin:6px 0;"><strong>You:</strong> ${escAI(msg)}</div>`;
    log.innerHTML += `<div id="aiThinking" style="color:#888;">Assistant is thinking…</div>`;
    log.scrollTop = log.scrollHeight;
    try {
        const res = await apiRequest('/ai/chat', { method: 'POST', body: { message: msg } });
        document.getElementById('aiThinking')?.remove();
        log.innerHTML += `<div style="margin:6px 0;padding:8px;background:#eef4ff;border-radius:6px;"><strong>Assistant:</strong> ${escAI(res.reply)}</div>`;
        log.scrollTop = log.scrollHeight;
    } catch (e) {
        document.getElementById('aiThinking')?.remove();
        log.innerHTML += `<div style="color:#e74c3c;">Could not reach the assistant: ${escAI(e.message)}</div>`;
    }
}

// ---- Duplicate detection ----
async function aiScanDuplicates() {
    const el = document.getElementById('aiDupResults');
    el.innerHTML = '<p class="empty-state">Scanning leads…</p>';
    try {
        const res = await apiRequest('/ai/duplicates', { method: 'GET' });
        const dups = res.duplicates || [];
        if (!dups.length) { el.innerHTML = '<p class="empty-state">No likely duplicate leads found. 🎉</p>'; return; }
        el.innerHTML = dups.map((d, i) => `
            <div class="activity-item" style="align-items:flex-start;">
                <div class="activity-icon ${d.score >= 90 ? 'orange-bg' : 'aqua-bg'}"><span style="color:#fff;font-weight:700;font-size:0.75rem;">${d.score}%</span></div>
                <div class="activity-content" style="flex:1;">
                    <div class="activity-title">${escAI(d.primary.name)} ↔ ${escAI(d.secondary.name)}</div>
                    <div class="activity-time">
                        ${escAI(d.explanation)}<br>
                        <small>A: ${escAI(d.primary.email||'—')} / ${escAI(d.primary.phone||'—')} · B: ${escAI(d.secondary.email||'—')} / ${escAI(d.secondary.phone||'—')}</small>
                    </div>
                    ${d.recommendMerge ? '<div style="color:#2d6cdf;font-size:0.82rem;margin-top:4px;"><i class="fas fa-lightbulb"></i> Recommended: merge these records.</div>' : ''}
                    <div style="margin-top:6px;">
                        <button class="btn btn-sm btn-primary" onclick="aiMerge('${d.primary.id}','${d.secondary.id}',this)"><i class="fas fa-code-branch"></i> Merge (keep ${escAttrAI(d.primary.name)})</button>
                    </div>
                </div>
            </div>`).join('');
    } catch (e) { el.innerHTML = `<p class="empty-state">Scan failed: ${escAI(e.message)}</p>`; }
}

async function aiMerge(primaryId, secondaryId, btn) {
    if (!confirm('Merge these two leads? The secondary record will be removed and its details folded into the primary.')) return;
    if (btn) { btn.disabled = true; btn.textContent = 'Merging…'; }
    try {
        const res = await apiRequest('/ai/merge', { method: 'POST', body: { primaryId, secondaryId } });
        showNotification(res.message || 'Merged', 'success');
        if (typeof loadLeadsFromServer === 'function') { try { await loadLeadsFromServer(); } catch (e) {} }
        aiScanDuplicates();
    } catch (e) {
        showNotification(`Merge failed: ${e.message}`, 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'Merge'; }
    }
}

// ---- Email analyzer ----
async function aiAnalyzeEmail() {
    const text = (document.getElementById('aiEmailText')?.value || '').trim();
    const el = document.getElementById('aiEmailResult');
    if (!text) { showNotification('Paste an email first', 'error'); return; }
    el.innerHTML = '<p class="empty-state">Analyzing…</p>';
    try {
        const res = await apiRequest('/ai/analyze-email', { method: 'POST', body: { text } });
        const a = res.analysis || {};
        const sentColor = a.sentiment === 'positive' ? '#2ecc71' : a.sentiment === 'negative' ? '#e74c3c' : '#f39c12';
        const prioColor = a.priority === 'High' ? '#e74c3c' : a.priority === 'Medium' ? '#f39c12' : '#2ecc71';
        el.innerHTML = `
            <div style="background:#f8fafc;border-radius:8px;padding:14px;">
                <div style="font-size:1.05rem;font-weight:600;margin-bottom:10px;">${escAI(a.summary || '')}</div>
                <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px;">
                    <span style="background:${sentColor};color:#fff;padding:3px 10px;border-radius:12px;font-size:0.8rem;">Sentiment: ${escAI(a.sentiment||'—')}</span>
                    <span style="background:${prioColor};color:#fff;padding:3px 10px;border-radius:12px;font-size:0.8rem;">Priority: ${escAI(a.priority||'—')}</span>
                    ${a.followUpDate ? `<span style="background:#2d6cdf;color:#fff;padding:3px 10px;border-radius:12px;font-size:0.8rem;">Follow-up: ${escAI(a.followUpDate)}</span>` : ''}
                </div>
                ${a.intent ? `<div style="font-size:0.9rem;"><strong>Intent:</strong> ${escAI(a.intent)}</div>` : ''}
                ${(a.actionItems && a.actionItems.length) ? `<div style="margin-top:6px;"><strong>Action Items:</strong><ul style="margin:4px 0;">${a.actionItems.map(x => `<li>${escAI(x)}</li>`).join('')}</ul></div>` : ''}
                <div style="font-size:0.72rem;color:#aaa;margin-top:6px;">${res.source === 'ai' ? 'AI analysis' : 'Heuristic analysis (enable OpenAI billing for deeper AI)'}</div>
            </div>`;
    } catch (e) { el.innerHTML = `<p class="empty-state">Analysis failed: ${escAI(e.message)}</p>`; }
}

// ---- Follow-up drafter ----
async function aiDraftEmail() {
    const v = id => (document.getElementById(id)?.value || '').trim();
    const el = document.getElementById('aiDraftResult');
    el.innerHTML = '<p class="empty-state">Drafting…</p>';
    try {
        const res = await apiRequest('/ai/draft-email', { method: 'POST', body: {
            name: v('aiDraftName'), industry: v('aiDraftIndustry'), age: v('aiDraftAge'),
            investmentInterests: v('aiDraftInterests'), portfolio: v('aiDraftPortfolio'),
            previousMeetings: v('aiDraftMeetings'), priorConversations: v('aiDraftPrior'), goal: v('aiDraftGoal')
        }});
        el.innerHTML = `
            <div style="background:#f8fafc;border-radius:8px;padding:14px;">
                <pre style="white-space:pre-wrap;font-family:inherit;margin:0;">${escAI(res.draft || '')}</pre>
                <div style="margin-top:8px;display:flex;gap:8px;">
                    <button class="btn btn-sm btn-secondary" onclick="aiCopyDraft(this)"><i class="fas fa-copy"></i> Copy</button>
                    <span style="font-size:0.72rem;color:#aaa;align-self:center;">${res.source === 'ai' ? 'AI-generated' : 'Template (enable OpenAI billing for AI drafting)'}</span>
                </div>
            </div>`;
    } catch (e) { el.innerHTML = `<p class="empty-state">Drafting failed: ${escAI(e.message)}</p>`; }
}

function aiCopyDraft(btn) {
    const pre = btn.closest('div').parentElement.querySelector('pre');
    if (pre) { navigator.clipboard.writeText(pre.textContent).then(() => showNotification('Draft copied', 'success')); }
}

function escAI(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m])); }
function escAttrAI(t) { return String(t || '').replace(/['"\\]/g, ''); }
