/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   PROJECT-MANAGEMENT INTEGRATIONS
   Trello, Asana, Monday.com, ClickUp, JIRA, JAMA, Notion, MS Planner.
   Available only on the Rocket AI+ plan (gated server-side).
   ===================================================== */

const express = require('express');
const router = express.Router();
const Integration = require('../models/Integration');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

const TOOLS = ['trello', 'asana', 'monday', 'clickup', 'jira', 'jama', 'notion', 'ms-planner',
  'bamboohr', 'workday', 'zoho-people', 'rippling', 'deel', 'sap-successfactors',
  // Proposal / RFP tools
  'responsive', 'loopio', 'qorusdocs', 'pandadoc', 'proposify', 'better-proposals', 'getaccept',
  // Vendor management / VMS
  'sap-fieldglass', 'beeline', 'magnit', 'worksome', 'sap', 'oracle', 'coupa', 'kodiak-hub', 'hicx', 'tealbook', 'graphite-connect',
  // Procurement / sourcing (Upload Source Data)
  'sap-ariba', 'jaggaer', 'ivalua', 'gep', 'zycus', 'basware', 'zycus-proactive'];
const ROCKET = 'rocket-ai-plus';

async function requireRocket(req, res) {
  const user = await User.findById(req.userId).select('plan').lean();
  if (!user || user.plan !== ROCKET) {
    res.status(403).json({ error: 'Rocket AI+ required', message: 'These integrations are available only on the Rocket AI+ plan.' });
    return null;
  }
  return user;
}

// List the user's integration connections (+ their plan for gating in the UI)
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('plan').lean();
    const integrations = await Integration.find({ userId: req.userId }).lean();
    res.json({ status: 'success', plan: user ? user.plan : null, rocketRequired: true, integrations });
  } catch (e) { res.status(500).json({ error: 'Failed to list integrations', message: e.message }); }
});

// Connect a tool (Rocket AI+ only)
router.post('/connect', async (req, res) => {
  try {
    if (!(await requireRocket(req, res))) return;
    const b = req.body || {};
    const tool = (b.tool || '').toLowerCase();
    if (!TOOLS.includes(tool)) return res.status(400).json({ error: 'Unknown tool' });
    const apiKey = (b.apiKey || '').toString();
    const integration = await Integration.findOneAndUpdate(
      { userId: req.userId, tool },
      { status: 'connected', workspace: b.workspace || '', apiKeyLast4: apiKey ? apiKey.slice(-4) : '', connectedAt: new Date() },
      { new: true, upsert: true }
    );
    res.json({ status: 'success', integration });
  } catch (e) { res.status(500).json({ error: 'Failed to connect', message: e.message }); }
});

// Disconnect a tool
router.post('/disconnect', async (req, res) => {
  try {
    const tool = ((req.body && req.body.tool) || '').toLowerCase();
    await Integration.findOneAndDelete({ userId: req.userId, tool });
    res.json({ status: 'success', message: 'Disconnected' });
  } catch (e) { res.status(500).json({ error: 'Failed to disconnect', message: e.message }); }
});

module.exports = router;
