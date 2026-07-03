/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   GRIEVANCE API — per-user complaints/support tickets
   ===================================================== */

const express = require('express');
const router = express.Router();
const Grievance = require('../models/Grievance');
const { verifyToken, requirePermission } = require('../middleware/auth');

router.use(verifyToken);
router.use(requirePermission('grievance'));

// POST /api/grievances — file a new grievance
router.post('/', async (req, res) => {
  try {
    const { name, problemType, section, description } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const grievance = await Grievance.create({
      userId: req.userId,
      name: name.trim(),
      problemType: (problemType || '').trim(),
      section: (section || '').trim(),
      description: (description || '').trim(),
      status: 'open'
    });
    res.status(201).json({ status: 'success', grievance });
  } catch (error) {
    console.error('Grievance create error:', error);
    res.status(500).json({ error: 'Failed to file grievance', message: error.message });
  }
});

// GET /api/grievances — list the logged-in user's grievances (+ counts)
router.get('/', async (req, res) => {
  try {
    const query = { userId: req.userId };
    const search = (req.query.search || '').trim();
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ name: rx }, { problemType: rx }, { section: rx }, { grievanceId: rx }, { description: rx }];
    }
    const grievances = await Grievance.find(query).sort({ createdAt: -1 }).limit(200).lean();
    const counts = {
      total: grievances.length,
      open: grievances.filter(g => g.status === 'open').length,
      inProgress: grievances.filter(g => g.status === 'in-progress').length,
      resolved: grievances.filter(g => g.status === 'resolved').length
    };
    res.json({ status: 'success', counts, grievances });
  } catch (error) {
    console.error('Grievance list error:', error);
    res.status(500).json({ error: 'Failed to list grievances', message: error.message });
  }
});

// PATCH /api/grievances/:grievanceId/status — update status (own only)
router.patch('/:grievanceId/status', async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!['open', 'in-progress', 'resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const g = await Grievance.findOneAndUpdate(
      { userId: req.userId, grievanceId: req.params.grievanceId },
      { status },
      { new: true }
    );
    if (!g) return res.status(404).json({ error: 'Grievance not found' });
    res.json({ status: 'success', grievance: g });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update grievance', message: error.message });
  }
});

module.exports = router;
