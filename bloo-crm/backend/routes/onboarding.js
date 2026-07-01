/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   ONBOARDING API — new-hire checklist + welcome email
   ===================================================== */

const express = require('express');
const router = express.Router();
const Onboarding = require('../models/Onboarding');
const emailService = require('../utils/email-service');
const { verifyToken } = require('../middleware/auth');

const DEFAULT_TASKS = Onboarding.DEFAULT_TASKS;

router.use(verifyToken);

// POST /api/onboarding — start onboarding (default checklist)
router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.employeeName) return res.status(400).json({ error: 'Employee name is required' });
    const item = await Onboarding.create({
      userId: req.userId,
      employeeName: b.employeeName.trim(),
      employeeRef: b.employeeRef || '',
      employeeEmail: b.employeeEmail || '',
      startDate: b.startDate ? new Date(b.startDate) : new Date(),
      checklist: (Array.isArray(b.tasks) && b.tasks.length ? b.tasks : DEFAULT_TASKS).map(t => ({ task: t, done: false }))
    });
    res.status(201).json({ status: 'success', item });
  } catch (error) {
    console.error('Onboarding create error:', error);
    res.status(500).json({ error: 'Failed to start onboarding', message: error.message });
  }
});

// GET /api/onboarding — list / search
router.get('/', async (req, res) => {
  try {
    const query = { userId: req.userId };
    const search = (req.query.search || '').trim();
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ employeeName: rx }, { onboardingId: rx }];
    }
    const items = await Onboarding.find(query).sort({ createdAt: -1 }).limit(200).lean();
    const counts = {
      total: items.length,
      inProgress: items.filter(i => i.status === 'in-progress').length,
      completed: items.filter(i => i.status === 'completed').length
    };
    res.json({ status: 'success', counts, items });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list onboarding', message: error.message });
  }
});

// PATCH /api/onboarding/:onboardingId/task — toggle a checklist item
router.patch('/:onboardingId/task', async (req, res) => {
  try {
    const { index, done } = req.body || {};
    const item = await Onboarding.findOne({ userId: req.userId, onboardingId: req.params.onboardingId });
    if (!item) return res.status(404).json({ error: 'Onboarding not found' });
    if (index == null || !item.checklist[index]) return res.status(400).json({ error: 'Invalid task index' });
    item.checklist[index].done = !!done;
    item.checklist[index].doneAt = done ? new Date() : null;
    item.status = item.checklist.every(t => t.done) ? 'completed' : 'in-progress';
    await item.save();
    res.json({ status: 'success', item });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task', message: error.message });
  }
});

// POST /api/onboarding/:onboardingId/welcome-email — email the new hire
router.post('/:onboardingId/welcome-email', async (req, res) => {
  try {
    const item = await Onboarding.findOne({ userId: req.userId, onboardingId: req.params.onboardingId });
    if (!item) return res.status(404).json({ error: 'Onboarding not found' });
    if (!item.employeeEmail) return res.status(400).json({ error: 'No employee email on file' });

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#2d6cdf;color:#fff;padding:18px;border-radius:6px 6px 0 0;"><h2 style="margin:0;">Welcome to the team, ${item.employeeName}! 🎉</h2></div>
        <div style="border:1px solid #eee;border-top:none;padding:20px;border-radius:0 0 6px 6px;">
          <p>We're excited to have you on board${item.startDate ? ` starting ${new Date(item.startDate).toLocaleDateString()}` : ''}.</p>
          <p>Your onboarding is underway. Here's what's being set up for you:</p>
          <ul>${item.checklist.map(t => `<li>${t.task}</li>`).join('')}</ul>
          <p>Your HR team will reach out with next steps. Welcome aboard!</p>
        </div>
      </div>`;
    const r = await emailService.sendEmail({ to: item.employeeEmail, subject: `Welcome to the team, ${item.employeeName}!`, html });

    // mark the "Welcome email" checklist item done
    const wi = item.checklist.findIndex(t => /welcome email/i.test(t.task));
    if (wi >= 0) { item.checklist[wi].done = true; item.checklist[wi].doneAt = new Date(); }
    item.welcomeEmailSent = true;
    item.status = item.checklist.every(t => t.done) ? 'completed' : 'in-progress';
    await item.save();

    res.json({ status: 'success', item, emailed: !!(r && r.success && !r.mock), mock: !!(r && r.mock) });
  } catch (error) {
    console.error('Welcome email error:', error);
    res.status(500).json({ error: 'Failed to send welcome email', message: error.message });
  }
});

// DELETE
router.delete('/:onboardingId', async (req, res) => {
  const item = await Onboarding.findOneAndDelete({ userId: req.userId, onboardingId: req.params.onboardingId });
  if (!item) return res.status(404).json({ error: 'Onboarding not found' });
  res.json({ status: 'success', message: 'Onboarding deleted' });
});

module.exports = router;
