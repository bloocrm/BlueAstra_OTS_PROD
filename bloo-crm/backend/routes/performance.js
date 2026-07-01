/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   PERFORMANCE API — goals, KPIs, reviews, feedback (per user)
   ===================================================== */

const express = require('express');
const router = express.Router();
const Performance = require('../models/Performance');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// POST /api/performance
router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.employeeName) return res.status(400).json({ error: 'Employee name is required' });
    const item = await Performance.create({
      userId: req.userId,
      employeeName: b.employeeName.trim(),
      employeeRef: b.employeeRef || '',
      type: b.type || 'goal',
      title: b.title || '',
      period: b.period || '',
      reviewer: b.reviewer || req.userName || '',
      rating: b.rating != null ? Number(b.rating) : undefined,
      kpis: Array.isArray(b.kpis) ? b.kpis : [],
      notes: b.notes || '',
      status: b.status || 'submitted'
    });
    res.status(201).json({ status: 'success', item });
  } catch (error) {
    console.error('Performance create error:', error);
    res.status(500).json({ error: 'Failed to save performance record', message: error.message });
  }
});

// GET /api/performance — list / search / filter by type
router.get('/', async (req, res) => {
  try {
    const query = { userId: req.userId };
    if (req.query.type) query.type = req.query.type;
    const search = (req.query.search || '').trim();
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ employeeName: rx }, { title: rx }, { period: rx }, { reviewer: rx }, { perfId: rx }];
    }
    const items = await Performance.find(query).sort({ createdAt: -1 }).limit(300).lean();
    const counts = {
      total: items.length,
      goals: items.filter(i => i.type === 'goal').length,
      reviews: items.filter(i => /review/.test(i.type)).length,
      feedback: items.filter(i => /feedback/.test(i.type)).length
    };
    res.json({ status: 'success', counts, items });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list performance records', message: error.message });
  }
});

// GET /api/performance/:perfId
router.get('/:perfId', async (req, res) => {
  const item = await Performance.findOne({ userId: req.userId, perfId: req.params.perfId }).lean();
  if (!item) return res.status(404).json({ error: 'Record not found' });
  res.json({ status: 'success', item });
});

// DELETE /api/performance/:perfId
router.delete('/:perfId', async (req, res) => {
  const item = await Performance.findOneAndDelete({ userId: req.userId, perfId: req.params.perfId });
  if (!item) return res.status(404).json({ error: 'Record not found' });
  res.json({ status: 'success', message: 'Record deleted' });
});

module.exports = router;
