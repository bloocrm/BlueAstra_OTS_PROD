/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   ANALYTICS DASHBOARD — interactive charts from MongoDB
   ===================================================== */

window.__charts = window.__charts || {};

function destroyChart(key) {
    if (window.__charts[key]) { try { window.__charts[key].destroy(); } catch (e) {} window.__charts[key] = null; }
}

async function loadAnalyticsDashboard() {
    if (typeof Chart === 'undefined') { setTimeout(loadAnalyticsDashboard, 400); return; }
    let data;
    try {
        data = await apiRequest('/analytics/dashboard', { method: 'GET' });
    } catch (e) {
        console.warn('Analytics load failed:', e.message);
        return;
    }
    renderKpis(data.kpis || {});
    renderConversionDonut(data.leadFunnel || {}, data.kpis || {});
    renderScatter(data.meetingScatter || []);
    renderEmployeeDonut(data.employeesByStatus || {});
    renderDefaulters(data.defaulters || []);
    renderPending(data.pending || []);
    renderNews(data.news || []);
}

function renderKpis(k) {
    const el = document.getElementById('analyticsKpis');
    if (!el) return;
    const card = (icon, cls, value, label) =>
        `<div class="stat-card"><div class="stat-icon ${cls}"><i class="fas ${icon}"></i></div><div class="stat-content"><h3>${value}</h3><p>${label}</p></div></div>`;
    el.innerHTML =
        card('fa-percentage', 'aqua-bg', (k.conversionRate || 0) + '%', 'Conversion Rate (KPI)') +
        card('fa-user-check', 'blue-bg', k.converted || 0, 'Converted Clients') +
        card('fa-user-friends', 'orange-bg', k.prospects || 0, 'Open Opportunities') +
        card('fa-video', 'blue-bg', k.totalMeetings || 0, 'Total Meetings (KRI)');
}

function renderConversionDonut(funnel, k) {
    const ctx = document.getElementById('chartConversion');
    if (!ctx) return;
    destroyChart('conversion');
    window.__charts.conversion = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Converted', 'Negotiating', 'Interested', 'Qualified', 'New', 'Lost'],
            datasets: [{
                data: [funnel.converted || 0, funnel.negotiating || 0, funnel.interested || 0, funnel.qualified || 0, funnel.new || 0, funnel.lost || 0],
                backgroundColor: ['#2ecc71', '#8e44ad', '#2d6cdf', '#00bcd4', '#f39c12', chartRed()],
                borderWidth: 2, borderColor: '#fff'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '62%',
            plugins: {
                legend: { position: 'bottom' },
                tooltip: { callbacks: { label: c => `${c.label}: ${c.parsed}` } },
                title: { display: true, text: `${k.conversionRate || 0}% of leads converted` }
            }
        }
    });
}

function renderScatter(points) {
    const ctx = document.getElementById('chartScatter');
    if (!ctx) return;
    destroyChart('scatter');
    window.__charts.scatter = new Chart(ctx, {
        type: 'scatter',
        data: { datasets: [{ label: 'Meetings (duration min)', data: points, backgroundColor: chartRed(), pointRadius: 6, pointHoverRadius: 9 }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                tooltip: { callbacks: { label: c => `${c.raw.label}: ${c.raw.y} min` } },
                legend: { position: 'bottom' }
            },
            scales: {
                x: { type: 'linear', ticks: { callback: v => new Date(v).toLocaleDateString() }, title: { display: true, text: 'Meeting Date' } },
                y: { beginAtZero: true, title: { display: true, text: 'Duration (min)' } }
            }
        }
    });
}

function renderEmployeeDonut(byStatus) {
    const ctx = document.getElementById('chartEmployees');
    if (!ctx) return;
    destroyChart('employees');
    window.__charts.employees = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Active', 'On Leave', 'Terminated'],
            datasets: [{ data: [byStatus.active || 0, byStatus['on-leave'] || 0, byStatus.terminated || 0], backgroundColor: ['#2ecc71', '#f39c12', chartRed()], borderWidth: 2, borderColor: '#fff' }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom' } } }
    });
}

function renderDefaulters(items) {
    const el = document.getElementById('defaultersList');
    if (!el) return;
    el.innerHTML = items.length ? items.map(d => `
        <div class="activity-item"><div class="activity-icon orange-bg"><i class="fas fa-user"></i></div>
        <div class="activity-content"><div class="activity-title">${escA(d.name)}</div>
        <div class="activity-time">${escA(d.status)}${d.department ? ' · ' + escA(d.department) : ''}</div></div></div>`).join('')
        : '<p class="empty-state">No defaulters 🎉</p>';
}

function renderPending(items) {
    const el = document.getElementById('pendingList');
    if (!el) return;
    el.innerHTML = items.length ? items.map(p => `
        <div class="activity-item"><div class="activity-icon aqua-bg"><i class="fas fa-clock"></i></div>
        <div class="activity-content"><div class="activity-title">${escA(p.grievanceId)} — ${escA(p.name)}</div>
        <div class="activity-time">${escA(p.problemType || 'Item')}${p.section ? ' · ' + escA(p.section) : ''} · ${(p.status || '').toUpperCase()}</div></div></div>`).join('')
        : '<p class="empty-state">Nothing pending 🎉</p>';
}

function renderNews(items) {
    const el = document.getElementById('newsList');
    if (!el) return;
    el.innerHTML = items.length ? items.map(n => `
        <div class="activity-item"><div class="activity-icon ${n.published ? 'blue-bg' : 'orange-bg'}"><i class="fas fa-bullhorn"></i></div>
        <div class="activity-content"><div class="activity-title">${escA(n.title)} <span style="font-size:0.75em;color:#888;">v${n.version}</span></div>
        <div class="activity-time">${escA(n.category || 'Policy')} · ${n.published ? 'Published' : 'Updated'} ${n.date ? new Date(n.date).toLocaleDateString() : ''}</div></div></div>`).join('')
        : '<p class="empty-state">No company news yet</p>';
}

function escA(t) {
    return String(t || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}
