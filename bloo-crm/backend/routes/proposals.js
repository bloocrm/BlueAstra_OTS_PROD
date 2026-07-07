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
const zlib = require('zlib');
const multer = require('multer');
const Proposal = require('../models/Proposal');
const ProposalDocument = require('../models/ProposalDocument');
const User = require('../models/User');
const emailService = require('../utils/email-service');
const { verifyToken, requirePermission } = require('../middleware/auth');

async function isRocket(userId) {
  const u = await User.findById(userId).select('plan').lean();
  return !!u && u.plan === 'rocket-ai-plus';
}
// Swift AI+ or higher (rocket also qualifies)
async function isSwift(userId) {
  const u = await User.findById(userId).select('plan').lean();
  return !!u && (u.plan === 'swift-ai-plus' || u.plan === 'rocket-ai-plus');
}

const DOCS_DIR = path.join(__dirname, '..', 'uploads', 'proposal-docs');
fs.mkdirSync(DOCS_DIR, { recursive: true });
const upload = multer({ dest: DOCS_DIR, limits: { fileSize: 30 * 1024 * 1024 } });

router.use(verifyToken);
router.use(requirePermission('proposals'));

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

// Campaign: email a proposal/brochure to many selected clients & leads (Rocket AI+)
router.post('/campaign', async (req, res) => {
  try {
    if (!(await isSwift(req.userId))) return res.status(403).json({ error: 'Swift AI+ required', message: 'Proposal campaigns require the Swift AI+ plan (or higher).' });
    const b = req.body || {};
    const recipients = Array.isArray(b.recipients) ? [...new Set(b.recipients.map(x => (x || '').trim()).filter(Boolean))] : [];
    if (!b.proposalId || !recipients.length) return res.status(400).json({ error: 'proposalId and recipients are required' });
    const p = await Proposal.findOne({ userId: req.userId, proposalId: b.proposalId }).lean();
    if (!p) return res.status(404).json({ error: 'Proposal not found' });

    const html = `<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;">
      <div style="background:#2d6cdf;color:#fff;padding:16px;border-radius:6px 6px 0 0;"><h2 style="margin:0;">${p.type} — ${p.title}</h2></div>
      <div style="border:1px solid #eee;border-top:none;padding:20px;border-radius:0 0 6px 6px;">
        <pre style="white-space:pre-wrap;font-family:inherit;line-height:1.5;">${(p.content || '').replace(/</g, '&lt;')}</pre>
      </div></div>`;
    let sent = 0;
    await Promise.all(recipients.map(async to => {
      try { const r = await emailService.sendEmail({ to, subject: `${p.type}: ${p.title}`, html }); if (r && r.success && !r.mock) sent++; } catch (e) {}
    }));
    res.json({ status: 'success', recipients: recipients.length, sent });
  } catch (e) { res.status(500).json({ error: 'Campaign failed', message: e.message }); }
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
// Proposal Bucket — every saved proposal + stored document across all types,
// each with its storage timestamp (createdAt), newest first.
// NOTE: must stay above '/:proposalId' so the literal path isn't captured as an id.
router.get('/bucket', async (req, res) => {
  try {
    const [proposals, documents] = await Promise.all([
      Proposal.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(500).lean(),
      ProposalDocument.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(500).lean()
    ]);
    const items = [
      ...proposals.map(p => ({
        kind: 'proposal', id: p.proposalId, type: p.type, title: p.title,
        industry: p.industry, status: p.status, assignedEmployee: p.assignedEmployee || '',
        storedAt: p.createdAt, updatedAt: p.updatedAt
      })),
      ...documents.map(d => ({
        kind: 'document', id: d.docId, type: d.type, title: d.title || d.originalName,
        source: d.source || 'upload', format: d.format || null, size: d.size || 0, url: d.url || null,
        storedAt: d.createdAt, updatedAt: d.updatedAt
      }))
    ].sort((a, b) => new Date(b.storedAt) - new Date(a.storedAt));
    res.json({
      status: 'success', count: items.length,
      counts: { proposals: proposals.length, documents: documents.length },
      items
    });
  } catch (e) { res.status(500).json({ error: 'Failed to load proposal bucket', message: e.message }); }
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

// Assign an employee to a proposal's activities/workflow (Rocket AI+ only)
router.post('/:proposalId/assign', async (req, res) => {
  try {
    if (!(await isSwift(req.userId))) return res.status(403).json({ error: 'Swift AI+ required', message: 'Assigning employees to proposal activities requires the Swift AI+ plan (or higher).' });
    const p = await Proposal.findOneAndUpdate(
      { userId: req.userId, proposalId: req.params.proposalId },
      { assignedEmployee: (req.body && req.body.assignedEmployee) || '' },
      { new: true }
    );
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json({ status: 'success', proposal: p });
  } catch (e) { res.status(500).json({ error: 'Failed to assign', message: e.message }); }
});

// Send a proposal to a lead or client by email (Rocket AI+ only)
router.post('/:proposalId/send', async (req, res) => {
  try {
    if (!(await isSwift(req.userId))) return res.status(403).json({ error: 'Swift AI+ required', message: 'Sending proposals to leads/clients requires the Swift AI+ plan (or higher).' });
    const to = ((req.body && req.body.to) || '').trim();
    const recipientType = (req.body && req.body.recipientType) || 'recipient';
    if (!to) return res.status(400).json({ error: 'Recipient email is required' });
    const p = await Proposal.findOne({ userId: req.userId, proposalId: req.params.proposalId }).lean();
    if (!p) return res.status(404).json({ error: 'Not found' });

    const html = `<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;">
      <div style="background:#2d6cdf;color:#fff;padding:16px;border-radius:6px 6px 0 0;"><h2 style="margin:0;">${p.type} — ${p.title}</h2></div>
      <div style="border:1px solid #eee;border-top:none;padding:20px;border-radius:0 0 6px 6px;">
        <p style="color:#888;">${p.industry} · ${p.proposalId}</p>
        <pre style="white-space:pre-wrap;font-family:inherit;line-height:1.5;">${(p.content || '').replace(/</g, '&lt;')}</pre>
      </div></div>`;
    const r = await emailService.sendEmail({ to, subject: `${p.type}: ${p.title}`, html });
    res.json({ status: 'success', emailed: !!(r && r.success && !r.mock), mock: !!(r && r.mock), to, recipientType });
  } catch (e) { res.status(500).json({ error: 'Failed to send', message: e.message }); }
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

// Save a generated template/brochure into MongoDB, gzip-compressed (a few KB)
router.post('/documents/save-generated', async (req, res) => {
  try {
    const b = req.body || {};
    const text = String(b.content || '');
    if (!text.trim()) return res.status(400).json({ error: 'No content to save.' });
    const title = String(b.title || 'Generated Document').slice(0, 200);
    const type = String(b.type || 'RFI').toUpperCase();
    const format = ['text', 'word', 'pdf'].includes(b.format) ? b.format : 'text';
    const gz = zlib.gzipSync(Buffer.from(text, 'utf8'));   // compress
    const doc = await ProposalDocument.create({
      userId: req.userId, type, title,
      originalName: title.replace(/[^a-z0-9]+/gi, '-') + (format === 'word' ? '.doc' : format === 'pdf' ? '.pdf' : '.txt'),
      source: 'generated', format, encoding: 'gzip', content: gz,
      size: gz.length, mimetype: 'application/gzip'
    });
    res.status(201).json({ status: 'success', document: { docId: doc.docId, title: doc.title, type: doc.type, format: doc.format, size: doc.size, source: doc.source, createdAt: doc.createdAt } });
  } catch (e) { res.status(500).json({ error: 'Could not save document', message: e.message }); }
});

// Return the decompressed body of a generated document (for download as word/pdf/text)
router.get('/documents/:docId/content', async (req, res) => {
  try {
    const d = await ProposalDocument.findOne({ userId: req.userId, docId: req.params.docId }).select('+content');
    if (!d) return res.status(404).json({ error: 'Not found' });
    if (!d.content) return res.status(400).json({ error: 'This document has no inline content.' });
    const text = (d.encoding === 'gzip' ? zlib.gunzipSync(d.content) : d.content).toString('utf8');
    res.json({ status: 'success', title: d.title, type: d.type, format: d.format, content: text });
  } catch (e) { res.status(500).json({ error: 'Could not read document', message: e.message }); }
});

module.exports = router;
