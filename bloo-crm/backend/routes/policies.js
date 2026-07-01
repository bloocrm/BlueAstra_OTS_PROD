/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   POLICY API — create/update company policies + publish via email
   ===================================================== */

const express = require('express');
const router = express.Router();
const Policy = require('../models/Policy');
const Employee = require('../models/Employee');
const emailService = require('../utils/email-service');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

function policyHtml(p) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;">
      <div style="background:#2d6cdf;color:#fff;padding:16px 20px;border-radius:6px 6px 0 0;">
        <h2 style="margin:0;">Company Policy Update</h2>
      </div>
      <div style="border:1px solid #eee;border-top:none;padding:20px;border-radius:0 0 6px 6px;">
        <h3 style="margin-top:0;">${(p.title || 'Policy')}</h3>
        ${p.category ? `<p style="color:#888;margin:4px 0;">Category: ${p.category}</p>` : ''}
        <p style="color:#888;margin:4px 0;">Policy ID: ${p.policyId} · Version ${p.version}</p>
        <hr>
        <div style="white-space:pre-wrap;line-height:1.5;">${(p.content || '').replace(/</g, '&lt;')}</div>
        <hr>
        <p style="font-size:12px;color:#999;">This policy was published to all employees via Bloo CRM.</p>
      </div>
    </div>`;
}

// POST /api/policies — create a policy (admin)
router.post('/', async (req, res) => {
  try {
    const { title, category, content } = req.body || {};
    if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });
    const policy = await Policy.create({
      userId: req.userId, title: title.trim(), category: (category || '').trim(), content: content || ''
    });
    res.status(201).json({ status: 'success', policy });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create policy', message: error.message });
  }
});

// GET /api/policies — list / search
router.get('/', async (req, res) => {
  try {
    const query = { userId: req.userId };
    const search = (req.query.search || '').trim();
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ title: rx }, { category: rx }, { policyId: rx }];
    }
    const policies = await Policy.find(query).sort({ updatedAt: -1 }).limit(200).lean();
    res.json({ status: 'success', count: policies.length, policies });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list policies', message: error.message });
  }
});

// GET /api/policies/:policyId
router.get('/:policyId', async (req, res) => {
  const p = await Policy.findOne({ userId: req.userId, policyId: req.params.policyId }).lean();
  if (!p) return res.status(404).json({ error: 'Policy not found' });
  res.json({ status: 'success', policy: p });
});

// PUT /api/policies/:policyId — update (bumps version)
router.put('/:policyId', async (req, res) => {
  try {
    const { title, category, content } = req.body || {};
    const p = await Policy.findOne({ userId: req.userId, policyId: req.params.policyId });
    if (!p) return res.status(404).json({ error: 'Policy not found' });
    if (title !== undefined) p.title = title.trim();
    if (category !== undefined) p.category = category.trim();
    if (content !== undefined) p.content = content;
    p.version = (p.version || 1) + 1;
    await p.save();
    res.json({ status: 'success', policy: p });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update policy', message: error.message });
  }
});

// POST /api/policies/:policyId/publish — email the policy to all employees
router.post('/:policyId/publish', async (req, res) => {
  try {
    const p = await Policy.findOne({ userId: req.userId, policyId: req.params.policyId });
    if (!p) return res.status(404).json({ error: 'Policy not found' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const employees = await Employee.find({ userId: req.userId }).select('email name').lean();
    const recipients = [...new Set(employees.map(e => (e.email || '').trim().toLowerCase()).filter(e => emailRegex.test(e)))];

    if (recipients.length === 0) {
      return res.status(400).json({ error: 'No employees with valid email addresses to publish to' });
    }

    const html = policyHtml(p);
    let sent = 0;
    await Promise.all(recipients.map(async (to) => {
      try {
        const r = await emailService.sendEmail({ to, subject: `Company Policy: ${p.title}`, html });
        if (r && r.success && !r.mock) sent++;
      } catch (e) { console.error('Policy email failed for', to, e.message); }
    }));

    p.status = 'published';
    p.lastPublishedAt = new Date();
    p.lastPublishedTo = recipients.length;
    await p.save();

    res.json({ status: 'success', policy: p, recipients: recipients.length, sent });
  } catch (error) {
    console.error('Policy publish error:', error);
    res.status(500).json({ error: 'Failed to publish policy', message: error.message });
  }
});

// DELETE /api/policies/:policyId
router.delete('/:policyId', async (req, res) => {
  const p = await Policy.findOneAndDelete({ userId: req.userId, policyId: req.params.policyId });
  if (!p) return res.status(404).json({ error: 'Policy not found' });
  res.json({ status: 'success', message: 'Policy deleted' });
});

module.exports = router;
