/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  Proprietary software. Unauthorized copying or use by any means or technology
  (including AI tools) is strictly prohibited.
*/
/* =====================================================
   PROJECT-MANAGEMENT INTEGRATIONS (Rocket AI+ only)
   ===================================================== */

// ---- Shared plan tiers & gates ----
const PLAN_RANK = { 'basic': 0, 'swift-ai-plus': 1, 'rocket-ai-plus': 2 };
function currentPlan() { try { return (typeof getCurrentUser === 'function' ? (getCurrentUser() || {}).plan : null) || 'basic'; } catch (e) { return 'basic'; } }
function hasPlan(minPlan) { return (PLAN_RANK[currentPlan()] || 0) >= (PLAN_RANK[minPlan] || 0); }
function isSwiftPlan() { return hasPlan('swift-ai-plus'); }   // swift OR rocket
function swiftGate(feature) {
    if (isSwiftPlan()) return true;
    const go = confirm(`"${feature}" requires the Swift AI+ plan (or higher).\n\nUpgrade now? Go to Pricing?`);
    if (go && typeof selectPlan === 'function') selectPlan('swift-ai-plus');
    return false;
}
window.hasPlan = hasPlan; window.isSwiftPlan = isSwiftPlan; window.swiftGate = swiftGate;

function isRocketPlan() {
    try { return (typeof getCurrentUser === 'function' ? (getCurrentUser() || {}).plan : null) === 'rocket-ai-plus'; }
    catch (e) { return false; }
}
// Returns true if allowed; otherwise shows an upgrade prompt and returns false.
function rocketGate(feature) {
    if (isRocketPlan()) return true;
    const go = confirm(`"${feature}" is a Rocket AI+ feature.\n\nUpgrade to Rocket AI+ to unlock it. Go to Pricing now?`);
    if (go && typeof selectPlan === 'function') selectPlan('rocket-ai-plus');
    return false;
}
window.isRocketPlan = isRocketPlan;
window.rocketGate = rocketGate;

const PM_INTEGRATIONS = [
    { tool: 'trello', name: 'Trello', slug: 'trello' },
    { tool: 'asana', name: 'Asana', slug: 'asana' },
    { tool: 'monday', name: 'Monday.com', slug: 'mondaydotcom' },
    { tool: 'clickup', name: 'ClickUp', slug: 'clickup' },
    { tool: 'jira', name: 'JIRA', slug: 'jira' },
    { tool: 'jama', name: 'JAMA', slug: 'jamasoftware' },
    { tool: 'notion', name: 'Notion', slug: 'notion' },
    { tool: 'ms-planner', name: 'Microsoft Planner', slug: 'microsoftplanner' },
    // HR platforms
    { tool: 'bamboohr', name: 'BambooHR', slug: 'bamboohr' },
    { tool: 'workday', name: 'Workday', slug: 'workday' },
    { tool: 'zoho-people', name: 'Zoho People', slug: 'zoho' },
    { tool: 'rippling', name: 'Rippling', slug: 'rippling' },
    { tool: 'deel', name: 'Deel', slug: 'deel' },
    { tool: 'sap-successfactors', name: 'SAP SuccessFactors', slug: 'sap' }
];

// Proposal / RFP tools (rendered in the Proposals tab)
const PROPOSAL_INTEGRATIONS = [
    { tool: 'responsive', name: 'Responsive (RFPIO)', slug: 'rfpio' },
    { tool: 'loopio', name: 'Loopio', slug: 'loopio' },
    { tool: 'qorusdocs', name: 'QorusDocs', slug: 'qorusdocs' },
    { tool: 'pandadoc', name: 'PandaDoc', slug: 'pandadoc' },
    { tool: 'proposify', name: 'Proposify', slug: 'proposify' },
    { tool: 'better-proposals', name: 'Better Proposals', slug: 'betterproposals' },
    { tool: 'getaccept', name: 'GetAccept', slug: 'getaccept' }
];

// Vendor management / VMS tools (Vendor Dashboard)
const VENDOR_INTEGRATIONS = [
    { tool: 'sap-fieldglass', name: 'SAP Fieldglass', slug: 'sap' },
    { tool: 'beeline', name: 'Beeline', slug: 'beeline' },
    { tool: 'magnit', name: 'Magnit', slug: 'magnit' },
    { tool: 'worksome', name: 'Worksome', slug: 'worksome' },
    { tool: 'sap', name: 'SAP', slug: 'sap' },
    { tool: 'oracle', name: 'Oracle', slug: 'oracle' },
    { tool: 'coupa', name: 'Coupa', slug: 'coupa' },
    { tool: 'kodiak-hub', name: 'Kodiak Hub', slug: 'kodiakhub' },
    { tool: 'hicx', name: 'HICX', slug: 'hicx' },
    { tool: 'tealbook', name: 'TealBook', slug: 'tealbook' },
    { tool: 'graphite-connect', name: 'Graphite Connect', slug: 'graphite' }
];

// Procurement / sourcing tools (Upload Source Data)
const SOURCING_INTEGRATIONS = [
    { tool: 'sap-ariba', name: 'SAP Ariba', slug: 'sap' },
    { tool: 'jaggaer', name: 'Jaggaer', slug: 'jaggaer' },
    { tool: 'ivalua', name: 'Ivalua', slug: 'ivalua' },
    { tool: 'coupa', name: 'Coupa', slug: 'coupa' },
    { tool: 'gep', name: 'GEP', slug: 'gep' },
    { tool: 'zycus', name: 'Zycus', slug: 'zycus' },
    { tool: 'basware', name: 'Basware', slug: 'basware' },
    { tool: 'zycus-proactive', name: 'Zycus Proactive', slug: 'zycus' }
];

// Back-compat wrapper for the Employee Dashboard integrations
async function renderIntegrations() {
    return renderIntegrationSet(PM_INTEGRATIONS, 'hrIntegrations', 'integrationsNote', 'Connect your HR & project tools to Bloo CRM.');
}

// Proposals tab integrations
async function renderProposalIntegrations() {
    return renderIntegrationSet(PROPOSAL_INTEGRATIONS, 'proposalIntegrations', 'proposalIntegrationsNote', 'Connect your proposal / RFP tools to Bloo CRM.');
}

// Vendor Dashboard integrations
async function renderVendorIntegrations() {
    return renderIntegrationSet(VENDOR_INTEGRATIONS, 'vendorIntegrations', 'vendorIntegrationsNote', 'Connect your vendor management / VMS platforms to Bloo CRM.');
}

// Upload Source Data (procurement/sourcing) integrations
async function renderSourcingIntegrations() {
    return renderIntegrationSet(SOURCING_INTEGRATIONS, 'sourcingIntegrations', 'sourcingIntegrationsNote', 'Connect your procurement / sourcing platforms to Bloo CRM.');
}

// Generic renderer for a set of integrations into a given container
async function renderIntegrationSet(list, containerId, noteId, connectedNote) {
    const container = document.getElementById(containerId);
    if (!container) return;
    let plan = null, connected = {};
    try {
        const res = await apiRequest('/integrations', { method: 'GET' });
        plan = res.plan;
        (res.integrations || []).forEach(i => { connected[i.tool] = i; });
    } catch (e) { /* fall back to local plan */ }
    if (!plan) { try { plan = (getCurrentUser() || {}).plan; } catch (e) {} }

    const isRocket = plan === 'rocket-ai-plus';
    const note = document.getElementById(noteId);
    if (note) note.innerHTML = isRocket
        ? connectedNote
        : '🔒 These integrations require the <strong>Rocket AI+</strong> plan. <a href="#" onclick="selectPlan(\'rocket-ai-plus\');return false;" style="color:var(--theme-primary);font-weight:600;">Upgrade now</a>.';

    container.innerHTML = list.map(it => {
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
