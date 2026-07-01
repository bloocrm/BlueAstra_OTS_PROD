/* =====================================================
   PERFORMANCE MANAGEMENT + HR DASHBOARD hub
   ===================================================== */

// ---- HR hub overview (aggregates from analytics + leave/perf counts) ----
async function loadHrDashboard() {
    const el = document.getElementById('hrStats');
    if (!el) return;
    el.innerHTML = '';
    const card = (icon, cls, value, label) =>
        `<div class="stat-card"><div class="stat-icon ${cls}"><i class="fas ${icon}"></i></div><div class="stat-content"><h3>${value}</h3><p>${label}</p></div></div>`;
    try {
        const [a, leaves, perf] = await Promise.all([
            apiRequest('/analytics/dashboard', { method: 'GET' }).catch(() => ({ kpis: {}, employeesByStatus: {} })),
            apiRequest('/leaves', { method: 'GET' }).catch(() => ({ counts: {} })),
            apiRequest('/performance', { method: 'GET' }).catch(() => ({ counts: {} }))
        ]);
        const k = a.kpis || {};
        const es = a.employeesByStatus || {};
        el.innerHTML =
            card('fa-users', 'blue-bg', k.totalEmployees || 0, 'Headcount') +
            card('fa-plane-departure', 'orange-bg', es['on-leave'] || 0, 'On Leave') +
            card('fa-hourglass-half', 'aqua-bg', (leaves.counts || {}).pending || 0, 'Pending Leave Approvals') +
            card('fa-chart-line', 'blue-bg', (perf.counts || {}).total || 0, 'Performance Records');
    } catch (e) {
        el.innerHTML = '<p class="empty-state">Could not load HR overview.</p>';
    }
}

// ---- Performance records ----
function openPerfModal() {
    const m = document.getElementById('perfModal');
    const f = m && m.querySelector('form');
    if (f) f.reset();
    if (m) m.classList.add('active');
}
function closePerfModal() {
    const m = document.getElementById('perfModal');
    if (m) m.classList.remove('active');
}

async function submitPerf(event) {
    event.preventDefault();
    const v = id => (document.getElementById(id)?.value || '').trim();
    const employeeName = v('perfEmployee');
    if (!employeeName) { showNotification('Employee is required', 'error'); return; }
    const kpis = [];
    if (v('perfKpiName')) kpis.push({ name: v('perfKpiName'), target: v('perfKpiTarget'), actual: v('perfKpiActual') });
    const body = {
        employeeName,
        type: v('perfType'),
        title: v('perfTitle'),
        period: v('perfPeriod'),
        reviewer: v('perfReviewer'),
        rating: v('perfRating') || undefined,
        kpis,
        notes: v('perfNotes')
    };
    try {
        const res = await apiRequest('/performance', { method: 'POST', body });
        showNotification(`Saved — ${res.item.perfId}`, 'success');
        closePerfModal();
        loadPerformance();
    } catch (e) {
        showNotification(`Could not save: ${e.message}`, 'error');
    }
}

async function loadPerformance() {
    const list = document.getElementById('perfList');
    if (!list) return;
    const q = (document.getElementById('perfSearch')?.value || '').trim();
    list.innerHTML = '<p class="empty-state">Loading…</p>';
    try {
        const res = await apiRequest(`/performance?search=${encodeURIComponent(q)}`, { method: 'GET' });
        const c = res.counts || {};
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || 0; };
        set('perfGoals', c.goals); set('perfReviews', c.reviews); set('perfFeedback', c.feedback); set('perfTotal', c.total);
        renderPerformance(res.items || []);
    } catch (e) {
        list.innerHTML = `<p class="empty-state">Could not load records: ${e.message}</p>`;
    }
}

const PERF_LABELS = {
    'goal': 'Goal / KPI', 'annual-review': 'Annual Review', 'quarterly-review': 'Quarterly Review',
    'manager-feedback': 'Manager Feedback', 'peer-feedback': 'Peer Feedback', 'promotion': 'Promotion', 'compensation': 'Compensation'
};

function renderPerformance(items) {
    const list = document.getElementById('perfList');
    if (!list) return;
    if (!items.length) { list.innerHTML = '<p class="empty-state">No performance records yet.</p>'; return; }
    list.innerHTML = items.map(i => `
        <div class="activity-item">
            <div class="activity-icon ${/review/.test(i.type) ? 'aqua-bg' : /feedback/.test(i.type) ? 'orange-bg' : 'blue-bg'}"><i class="fas fa-chart-line"></i></div>
            <div class="activity-content" style="flex:1;">
                <div class="activity-title">${escP2(i.employeeName)} — ${PERF_LABELS[i.type] || i.type} <span style="font-size:0.75em;color:#888;">${i.perfId}</span></div>
                <div class="activity-time">
                    ${i.title ? escP2(i.title) + ' · ' : ''}${i.period ? escP2(i.period) + ' · ' : ''}${i.reviewer ? 'by ' + escP2(i.reviewer) : ''}
                    ${i.rating ? ' · ' + '★'.repeat(Math.max(0, Math.min(5, i.rating))) : ''}
                    ${(i.kpis && i.kpis.length) ? '<br>' + i.kpis.map(k => `${escP2(k.name)}: ${escP2(k.actual || '?')}/${escP2(k.target || '?')}`).join(' · ') : ''}
                    ${i.notes ? '<br>' + escP2(i.notes) : ''}
                </div>
                <div style="margin-top:6px;"><button class="btn btn-sm btn-delete" onclick="deletePerf('${i.perfId}')"><i class="fas fa-trash"></i></button></div>
            </div>
        </div>
    `).join('');
}

async function deletePerf(perfId) {
    if (!confirm('Delete this record?')) return;
    try {
        await apiRequest(`/performance/${perfId}`, { method: 'DELETE' });
        showNotification('Deleted', 'success');
        loadPerformance();
    } catch (e) {
        showNotification(`Could not delete: ${e.message}`, 'error');
    }
}

function escP2(t) {
    return String(t || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}
