/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  Proprietary software. Unauthorized copying or use by any means or technology
  (including AI tools) is strictly prohibited.
*/
/* =====================================================
   KNOWLEDGE REPOSITORY — search, RAG ask, browse, CRUD
   ===================================================== */

let _kbCache = {};

async function loadKnowledge() {
    // Knowledge Repository requires Rocket AI+
    if (typeof isRocketPlan === 'function' && !isRocketPlan()) {
        const results = document.getElementById('kbResults');
        const ask = document.getElementById('kbAskResult');
        const lock = `<div style="background:var(--theme-soft);border:1px dashed var(--theme-primary);border-radius:8px;padding:18px;color:#555;">
            <i class="fas fa-lock" style="color:var(--theme-primary);"></i> The <strong>Knowledge Repository</strong> is a <strong>Rocket AI+</strong> feature.
            <div style="margin-top:10px;"><button class="btn btn-primary" onclick="if(typeof selectPlan==='function')selectPlan('rocket-ai-plus')">Upgrade to Rocket AI+</button></div>
        </div>`;
        if (ask) ask.innerHTML = lock;
        if (results) results.innerHTML = '';
        return;
    }
    await Promise.all([kbLoadCategories(), kbSearch()]);
}

async function kbLoadCategories() {
    try {
        const res = await apiRequest('/knowledge/categories', { method: 'GET' });
        const sel = document.getElementById('kbCategory');
        if (sel) {
            const cur = sel.value;
            sel.innerHTML = `<option value="">All domains (${res.total || 0})</option>` +
                (res.categories || []).map(c => `<option value="${escKb(c.category)}">${escKb(c.category)} (${c.count})</option>`).join('');
            sel.value = cur;
        }
    } catch (e) { /* ignore */ }
}

async function kbSearch() {
    const el = document.getElementById('kbResults');
    if (!el) return;
    const q = (document.getElementById('kbSearch')?.value || '').trim();
    const cat = document.getElementById('kbCategory')?.value || '';
    el.innerHTML = '<p class="empty-state">Loading…</p>';
    try {
        const res = await apiRequest(`/knowledge?q=${encodeURIComponent(q)}&category=${encodeURIComponent(cat)}`, { method: 'GET' });
        const arts = res.articles || [];
        _kbCache = {};
        arts.forEach(a => { _kbCache[a.articleId] = a; });
        if (!arts.length) { el.innerHTML = '<p class="empty-state">No articles found. Click "Load Starter Articles" or add one.</p>'; return; }
        el.innerHTML = arts.map(a => `
            <div class="activity-item" style="cursor:pointer;" onclick="kbOpen('${a.articleId}')">
                <div class="activity-icon blue-bg"><i class="fas fa-file-alt"></i></div>
                <div class="activity-content" style="flex:1;">
                    <div class="activity-title">${escKb(a.title)} <span style="font-size:0.72em;color:#888;">${escKb(a.category)}${a.subcategory ? ' · ' + escKb(a.subcategory) : ''} · ${escKb(a.difficulty)}</span></div>
                    <div class="activity-time">${escKb(a.summary || '')}${(a.keywords && a.keywords.length) ? '<br><small>🏷 ' + a.keywords.map(escKb).join(', ') + '</small>' : ''}</div>
                </div>
            </div>`).join('');
    } catch (e) { el.innerHTML = `<p class="empty-state">Search failed: ${escKb(e.message)}</p>`; }
}

async function kbOpen(articleId) {
    try {
        const res = await apiRequest(`/knowledge/${articleId}`, { method: 'GET' });
        const a = res.article;
        const overlay = document.createElement('div');
        overlay.className = 'modal active';
        overlay.style.display = 'flex';
        overlay.innerHTML = `
            <div class="modal-content" style="max-width:680px;">
                <div class="modal-header"><h2><i class="fas fa-file-alt"></i> ${escKb(a.title)}</h2><button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button></div>
                <div style="padding:0 4px;">
                    <p style="color:#888;font-size:0.85rem;">${escKb(a.category)}${a.subcategory ? ' · ' + escKb(a.subcategory) : ''} · ${escKb(a.difficulty)} · ${escKb(a.industry || '')} · ${a.articleId}</p>
                    ${a.summary ? `<p style="font-weight:600;">${escKb(a.summary)}</p>` : ''}
                    <div style="white-space:pre-wrap;line-height:1.55;color:#333;">${escKb(a.content || '')}</div>
                    ${(a.keywords && a.keywords.length) ? `<p style="margin-top:10px;"><small>🏷 ${a.keywords.map(escKb).join(', ')}</small></p>` : ''}
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="kbEdit('${a.articleId}');this.closest('.modal').remove();"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn btn-delete" onclick="kbDelete('${a.articleId}');this.closest('.modal').remove();"><i class="fas fa-trash"></i> Delete</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        window.__kbFull = window.__kbFull || {}; window.__kbFull[a.articleId] = a;
    } catch (e) { showNotification(`Could not open: ${e.message}`, 'error'); }
}

async function kbAskAI() {
    const el = document.getElementById('kbAskResult');
    const q = (document.getElementById('kbAsk')?.value || '').trim();
    if (!q) { showNotification('Type a question', 'error'); return; }
    el.innerHTML = '<p class="empty-state">Searching the repository and composing an answer…</p>';
    try {
        const res = await apiRequest('/knowledge/ask', { method: 'POST', body: { question: q } });
        const srcs = (res.sources || []).map((s, i) => `<span style="display:inline-block;background:var(--theme-soft);color:var(--theme-primary);border-radius:10px;padding:2px 8px;margin:2px;font-size:0.75rem;cursor:pointer;" onclick="kbOpen('${s.articleId}')">[${i + 1}] ${escKb(s.title)}</span>`).join('');
        el.innerHTML = `
            <div style="background:#f8fafc;border-radius:8px;padding:14px;">
                <div style="white-space:pre-wrap;line-height:1.55;">${escKb(res.answer || '')}</div>
                ${srcs ? `<div style="margin-top:10px;"><strong style="font-size:0.8rem;">Sources:</strong><br>${srcs}</div>` : ''}
                <div style="font-size:0.72rem;color:#aaa;margin-top:8px;">${res.source === 'ai' ? 'AI answer grounded in the knowledge repository' : 'Repository matches (enable OpenAI for AI answers)'}</div>
            </div>`;
    } catch (e) { el.innerHTML = `<p class="empty-state">Ask failed: ${escKb(e.message)}</p>`; }
}

async function seedKnowledge() {
    if (!confirm('Load the curated starter articles into the repository?')) return;
    try {
        const res = await apiRequest('/knowledge/seed', { method: 'POST' });
        showNotification(`Repository loaded: ${res.inserted} added, ${res.total} total.`, 'success');
        loadKnowledge();
    } catch (e) { showNotification(`Seed failed: ${e.message}`, 'error'); }
}

// ---- Add / edit ----
function openKbModal(a) {
    const g = id => document.getElementById(id);
    g('kbEditId').value = a ? a.articleId : '';
    g('kbModalTitle').innerHTML = a ? '<i class="fas fa-brain"></i> Edit Article' : '<i class="fas fa-brain"></i> Add Article';
    g('kbCat').value = a ? (a.category || '') : '';
    g('kbSub').value = a ? (a.subcategory || '') : '';
    g('kbTitle').value = a ? a.title : '';
    g('kbSummary').value = a ? (a.summary || '') : '';
    g('kbContent').value = a ? (a.content || '') : '';
    g('kbKeywords').value = a ? (a.keywords || []).join(', ') : '';
    g('kbDifficulty').value = a ? (a.difficulty || 'Intermediate') : 'Intermediate';
    g('kbModal').classList.add('active');
}
function closeKbModal() { document.getElementById('kbModal').classList.remove('active'); }
function kbEdit(id) { const a = (window.__kbFull && window.__kbFull[id]) || _kbCache[id]; if (a) openKbModal(a); }

async function submitKb(event) {
    event.preventDefault();
    const g = id => document.getElementById(id).value;
    const body = {
        category: g('kbCat'), subcategory: g('kbSub'), title: g('kbTitle').trim(),
        summary: g('kbSummary'), content: g('kbContent'), keywords: g('kbKeywords'), difficulty: g('kbDifficulty')
    };
    if (!body.title) { showNotification('Title is required', 'error'); return; }
    const editId = document.getElementById('kbEditId').value;
    try {
        if (editId) { await apiRequest(`/knowledge/${editId}`, { method: 'PUT', body }); showNotification('Article updated', 'success'); }
        else { const r = await apiRequest('/knowledge', { method: 'POST', body }); showNotification(`Article added — ${r.article.articleId}`, 'success'); }
        closeKbModal();
        loadKnowledge();
    } catch (e) { showNotification(`Could not save: ${e.message}`, 'error'); }
}

async function kbDelete(id) {
    if (!confirm('Delete this article?')) return;
    try { await apiRequest(`/knowledge/${id}`, { method: 'DELETE' }); showNotification('Deleted', 'success'); loadKnowledge(); }
    catch (e) { showNotification(`Could not delete: ${e.message}`, 'error'); }
}

function escKb(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m])); }
