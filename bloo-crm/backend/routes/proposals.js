/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   PROPOSALS API — RFI / RFQ / RFP
   AI-generated templates + guidance for wealth management, investment
   advisory, insurance, and fintech; document uploads; CRUD.
   ===================================================== */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Proposal = require('../models/Proposal');
const ProposalDocument = require('../models/ProposalDocument');
const { verifyToken } = require('../middleware/auth');

const DOCS_DIR = path.join(__dirname, '..', 'uploads', 'proposal-docs');
fs.mkdirSync(DOCS_DIR, { recursive: true });
const upload = multer({ dest: DOCS_DIR, limits: { fileSize: 30 * 1024 * 1024 } });

router.use(verifyToken);

async function chat(messages, maxTokens = 1200) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini', messages, max_tokens: maxTokens, temperature: 0.4 })
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d.choices && d.choices[0] && d.choices[0].message.content || null;
  } catch (e) { return null; }
}

const TYPES = { RFI: 'Request for Information', RFQ: 'Request for Quotation', RFP: 'Request for Proposal' };
const TYPE_PURPOSE = {
  RFI: 'gather information about vendors\' capabilities, offerings, and approach (early market scan; no pricing commitment).',
  RFQ: 'obtain specific, comparable price quotes for well-defined products/services (pricing and commercial terms are the focus).',
  RFP: 'solicit detailed proposals and solutions for a defined need, evaluated on approach, capability, price, and fit.'
};

// ---- AI guidance: what to include in an RFI/RFQ/RFP ----
router.get('/guide', async (req, res) => {
  const type = (req.query.type || 'RFI').toUpperCase();
  if (!TYPES[type]) return res.status(400).json({ error: 'type must be RFI, RFQ or RFP' });

  const prompt = `You are a procurement expert for financial services (wealth management, investment advisory, insurance, fintech). Explain what should go into a ${type} (${TYPES[type]}). Return STRICT JSON with keys: definition (1-2 sentences), whenToUse (1 sentence), sections (array of the key sections/headings a strong ${type} contains), tips (array of 3-5 best-practice tips). Keep it specific to financial-services procurement.`;
  const ai = await chat([{ role: 'system', content: 'You output only JSON.' }, { role: 'user', content: prompt }], 700);
  if (ai) { try { return res.json({ status: 'success', source: 'ai', type, guide: JSON.parse(ai) }); } catch (_) {} }

  // Fallback static guidance
  const base = {
    RFI: { sections: ['Introduction & background', 'Company/vendor overview', 'Capabilities & services', 'Relevant experience & references', 'Technology & security', 'Compliance & certifications', 'High-level approach', 'Response format & timeline'], tips: ['Keep questions open-ended to learn the market', 'Do not ask for firm pricing yet', 'Use it to shortlist vendors for an RFP', 'Be clear about your objectives and timeline'] },
    RFQ: { sections: ['Scope of goods/services', 'Detailed specifications/quantities', 'Pricing schedule (unit & total)', 'Commercial terms (payment, delivery, SLAs)', 'Validity period of quote', 'Evaluation basis (usually lowest compliant price)', 'Submission instructions & deadline'], tips: ['Define specs precisely so quotes are comparable', 'Request a standard pricing table', 'State evaluation criteria up front', 'Include contract/commercial terms'] },
    RFP: { sections: ['Executive summary & objectives', 'Background & current state', 'Scope of work / requirements', 'Proposed solution & methodology', 'Implementation plan & timeline', 'Team & experience', 'Pricing & commercial model', 'Compliance, security & risk', 'Evaluation criteria & weighting', 'Terms, SLAs & references', 'Submission format & deadline'], tips: ['Clearly state evaluation criteria and weights', 'Ask for a solution, not just a price', 'Require references and case studies', 'Define mandatory vs. desirable requirements', 'Give enough time for quality responses'] }
  }[type];
  res.json({ status: 'success', source: 'fallback', type, guide: { definition: `A ${TYPES[type]} is used to ${TYPE_PURPOSE[type]}`, whenToUse: `Use a ${type} to ${TYPE_PURPOSE[type]}`, sections: base.sections, tips: base.tips } });
});

// ---- AI generate a full template ----
router.post('/generate', async (req, res) => {
  const type = (req.body && req.body.type || 'RFI').toUpperCase();
  const industry = (req.body && req.body.industry) || 'Wealth Management';
  const notes = (req.body && req.body.notes) || '';
  if (!TYPES[type]) return res.status(400).json({ error: 'type must be RFI, RFQ or RFP' });

  const prompt = `Generate a complete, professional ${type} (${TYPES[type]}) TEMPLATE for the ${industry} sector. Purpose: ${TYPE_PURPOSE[type]}
Include clear section headings, guidance/placeholders in [brackets] the user fills in, a requirements/questions list appropriate to a ${type}, evaluation criteria (for RFP/RFQ), and a submission/timeline section. ${notes ? 'Extra context: ' + notes : ''} Return well-formatted plain text (use headings and numbered lists). Keep it comprehensive but usable.`;
  const ai = await chat([{ role: 'system', content: 'You are an expert financial-services procurement writer.' }, { role: 'user', content: prompt }], 1500);
  const title = `${type} Template — ${industry}`;
  if (ai) return res.json({ status: 'success', source: 'ai', type, industry, title, content: ai });

  // Fallback template
  const fb = `${title}\n\n1. INTRODUCTION\n[Company name] is issuing this ${TYPES[type]} to ${TYPE_PURPOSE[type]}\n\n2. BACKGROUND\n[Describe your organization and the need.]\n\n3. SCOPE\n[Define the products/services in scope for ${industry}.]\n\n4. ${type === 'RFQ' ? 'PRICING SCHEDULE\n[Line items, unit price, quantity, total. Validity period.]' : type === 'RFP' ? 'REQUIREMENTS & PROPOSED SOLUTION\n[Mandatory vs. desirable requirements; ask vendors for their approach.]' : 'INFORMATION REQUESTED\n[Capabilities, experience, technology, compliance, references.]'}\n\n5. COMPLIANCE & SECURITY\n[Regulatory, data protection, certifications required.]\n\n6. ${type === 'RFI' ? 'RESPONSE FORMAT' : 'EVALUATION CRITERIA'}\n[${type === 'RFI' ? 'How vendors should structure responses.' : 'Criteria and weighting used to evaluate submissions.'}]\n\n7. TIMELINE & SUBMISSION\n[Key dates, contact, and how to submit.]\n\n(Generated offline template — enable OpenAI for a tailored ${industry} ${type}.)`;
  res.json({ status: 'success', source: 'fallback', type, industry, title, content: fb });
});

// ---- Save / list / get / update / delete ----
router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.title) return res.status(400).json({ error: 'title is required' });
    const p = await Proposal.create({
      userId: req.userId, type: (b.type || 'RFI').toUpperCase(), industry: b.industry || 'Wealth Management',
      title: b.title.trim(), content: b.content || '', status: b.status || 'draft', createdBy: b.createdBy || req.userName || 'User'
    });
    res.status(201).json({ status: 'success', proposal: p });
  } catch (e) { res.status(500).json({ error: 'Failed to save proposal', message: e.message }); }
});
router.get('/', async (req, res) => {
  try {
    const q = { userId: req.userId };
    if (req.query.type) q.type = String(req.query.type).toUpperCase();
    const proposals = await Proposal.find(q).sort({ createdAt: -1 }).limit(200).lean();
    res.json({ status: 'success', count: proposals.length, proposals });
  } catch (e) { res.status(500).json({ error: 'Failed to list', message: e.message }); }
});
router.get('/:proposalId', async (req, res) => {
  const p = await Proposal.findOne({ userId: req.userId, proposalId: req.params.proposalId }).lean();
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json({ status: 'success', proposal: p });
});
router.put('/:proposalId', async (req, res) => {
  const b = req.body || {}; const upd = {};
  ['title', 'content', 'industry', 'status', 'type'].forEach(f => { if (b[f] !== undefined) upd[f] = b[f]; });
  const p = await Proposal.findOneAndUpdate({ userId: req.userId, proposalId: req.params.proposalId }, upd, { new: true });
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json({ status: 'success', proposal: p });
});
router.delete('/:proposalId', async (req, res) => {
  const p = await Proposal.findOneAndDelete({ userId: req.userId, proposalId: req.params.proposalId });
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json({ status: 'success', message: 'Deleted' });
});

// ---- Documents ----
router.post('/documents', upload.single('document'), async (req, res) => {
  let tmp;
  try {
    if (!req.file) return res.status(400).json({ error: 'No document uploaded' });
    tmp = req.file.path;
    const ext = path.extname(req.file.originalname) || '';
    const storedName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    fs.renameSync(tmp, path.join(DOCS_DIR, storedName)); tmp = path.join(DOCS_DIR, storedName);
    const doc = await ProposalDocument.create({
      userId: req.userId, type: (req.body && req.body.type) || 'RFI', title: (req.body && req.body.title) || req.file.originalname,
      originalName: req.file.originalname, storedName, mimetype: req.file.mimetype, size: req.file.size, url: `/proposal-docs/${storedName}`
    });
    res.status(201).json({ status: 'success', document: doc });
  } catch (e) { if (tmp) { try { fs.unlinkSync(tmp); } catch (_) {} } res.status(500).json({ error: 'Upload failed', message: e.message }); }
});
router.get('/documents/list', async (req, res) => {
  const q = { userId: req.userId };
  if (req.query.type) q.type = String(req.query.type).toUpperCase();
  const documents = await ProposalDocument.find(q).sort({ createdAt: -1 }).limit(300).lean();
  res.json({ status: 'success', documents });
});
router.delete('/documents/:docId', async (req, res) => {
  const d = await ProposalDocument.findOneAndDelete({ userId: req.userId, docId: req.params.docId });
  if (!d) return res.status(404).json({ error: 'Not found' });
  if (d.storedName) { try { fs.unlinkSync(path.join(DOCS_DIR, d.storedName)); } catch (_) {} }
  res.json({ status: 'success', message: 'Deleted' });
});

module.exports = router;
