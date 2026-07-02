/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  Proprietary software. Unauthorized copying or use by any means or technology
  (including AI tools) is strictly prohibited.
*/
/* =====================================================
   PROJECT-MANAGEMENT INTEGRATIONS (Rocket AI+ only)
   ===================================================== */

const PM_INTEGRATIONS = [
    { tool: 'trello', name: 'Trello', slug: 'trello' },
    { tool: 'asana', name: 'Asana', slug: 'asana' },
    { tool: 'monday', name: 'Monday.com', slug: 'mondaydotcom' },
    { tool: 'clickup', name: 'ClickUp', slug: 'clickup' },
    { tool: 'jira', name: 'JIRA', slug: 'jira' },
    { tool: 'jama', name: 'JAMA', slug: 'jamasoftware' },
    { tool: 'notion', name: 'Notion', slug: 'notion' },
    { tool: 'ms-planner', name: 'Microsoft Planner', slug: 'microsoftplanner' }
];

async function renderIntegrations() {
    const container = document.getElementById('hrIntegrations');
    if (!container) return;
    let plan = null, connected = {};
    try {
        const res = await apiRequest('/integrations', { method: 'GET' });
        plan = res.plan;
        (res.integrations || []).forEach(i => { connected[i.tool] = i; });
    } catch (e) { /* fall back to local plan */ }
    if (!plan) { try { plan = (getCurrentUser() || {}).plan; } catch (e) {} }

    const isRocket = plan === 'rocket-ai-plus';
    const note = document.getElementById('integrationsNote');
    if (note) note.innerHTML = isRocket
        ? 'Connect your project tools to Bloo CRM.'
        : '🔒 These integrations require the <strong>Rocket AI+</strong> plan. <a href="#" onclick="selectPlan(\'rocket-ai-plus\');return false;" style="color:var(--theme-primary);font-weight:600;">Upgrade now</a>.';

    container.innerHTML = PM_INTEGRATIONS.map(it => {
        const conn = connected[it.tool];
        const logo = `<img src="https://cdn.simpleicons.org/${it.slug}" alt="${it.name}" style="width:34px;height:34px;" onerror="this.replaceWith(Object.assign(document.createElement('i'),{className:'fas fa-plug',style:'font-size:28px;color:var(--theme-primary)'}))">`;
        let action;
        if (!isRocket) {
            action = `<button class="btn btn-sm btn-secondary" disabled style="opacity:.7;"><i class="fas fa-lock"></i> Rocket AI+</button>`;
        } else if (conn && conn.status === 'connected') {
            action = `<div style="color:#2ecc71;font-size:0.8rem;margin-bottom:6px;"><i class="fas fa-check-circle"></i> Connected${conn.workspace ? ' · ' + escInt(conn.workspace) : ''}</div>
                      <button class="btn btn-sm btn-delete" onclick="disconnectIntegration('${it.tool}')"><i class="fas fa-unlink"></i> Disconnect</button>`;
        } else {
            action = `<button class="btn btn-sm btn-primary" onclick="connectIntegration('${it.tool}','${escInt(it.name)}')"><i class="fas fa-plug"></i> Connect</button>`;
        }
        return `
        <div class="stat-card" style="flex-direction:column;align-items:center;text-align:center;gap:8px;${isRocket ? '' : 'opacity:0.75;'}">
            ${logo}
            <div style="font-weight:600;">${escInt(it.name)}</div>
            <div>${action}</div>
        </div>`;
    }).join('');
}

async function connectIntegration(tool, name) {
    const workspace = prompt(`Connect ${name}\n\nEnter your ${name} workspace/board name (optional):`) || '';
    const apiKey = prompt(`Enter your ${name} API key / token to connect (kept private):`) || '';
    try {
        await apiRequest('/integrations/connect', { method: 'POST', body: { tool, workspace, apiKey } });
        showNotification(`${name} connected!`, 'success');
        renderIntegrations();
    } catch (e) {
        if ((e.message || '').toLowerCase().includes('rocket')) showNotification('This integration requires the Rocket AI+ plan.', 'error');
        else showNotification(`Could not connect: ${e.message}`, 'error');
    }
}

async function disconnectIntegration(tool) {
    if (!confirm('Disconnect this integration?')) return;
    try {
        await apiRequest('/integrations/disconnect', { method: 'POST', body: { tool } });
        showNotification('Disconnected', 'success');
        renderIntegrations();
    } catch (e) { showNotification(`Could not disconnect: ${e.message}`, 'error'); }
}

function escInt(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m])); }
