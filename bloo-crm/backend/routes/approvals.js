/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   APPROVALS API — expense/purchase/travel/hiring/promotion/policy-exception
   Routes to a manager; delegates to the manager's backup if unavailable.
   ===================================================== */

const express = require('express');
const router = express.Router();
const Approval = require('../models/Approval');
const Employee = require('../models/Employee');
const LeaveApplication = require('../models/LeaveApplication');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

async function isOnLeave(userId, name) {
  if (!name) return false;
  const emp = await Employee.findOne({ userId, name }).select('status').lean();
  if (emp && emp.status === 'on-leave') return true;
  const now = new Date();
  const active = await LeaveApplication.findOne({
    userId, employeeName: name, status: 'approved',
    startDate: { $lte: now }, endDate: { $gte: now }
  }).lean();
  return !!active;
}

// POST /api/approvals — raise a request (routes to manager, delegates if on leave)
router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.title) return res.status(400).json({ error: 'Title is required' });

    const manager = (b.manager || b.approver || '').trim();
    let currentApprover = manager, delegated = false, delegatedTo = '', delegationReason = '';
    if (manager && await isOnLeave(req.userId, manager)) {
      const mgr = await Employee.findOne({ userId: req.userId, name: manager }).select('backupEmployee').lean();
      if (mgr && mgr.backupEmployee) {
        currentApprover = mgr.backupEmployee; delegated = true; delegatedTo = mgr.backupEmployee;
        delegationReason = `${manager} is on leave — routed to backup ${mgr.backupEmployee}`;
      }
    }

    const approval = await Approval.create({
      userId: req.userId,
      type: b.type || 'expense',
      title: b.title.trim(),
      requestedBy: b.requestedBy || req.userName || '',
      amount: b.amount != null ? Number(b.amount) : undefined,
      currency: b.currency || 'USD',
      details: b.details || '',
      manager, currentApprover, delegated, delegatedTo, delegationReason,
      status: 'pending'
    });
    res.status(201).json({ status: 'success', approval });
  } catch (error) {
    console.error('Approval create error:', error);
    res.status(500).json({ error: 'Failed to create approval', message: error.message });
  }
});

// GET /api/approvals — list / filter
router.get('/', async (req, res) => {
  try {
    const query = { userId: req.userId };
    if (req.query.status && ['pending', 'approved', 'rejected'].includes(req.query.status)) query.status = req.query.status;
    if (req.query.type) query.type = req.query.type;
    const search = (req.query.search || '').trim();
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ title: rx }, { requestedBy: rx }, { manager: rx }, { approvalId: rx }, { currentApprover: rx }];
    }
    const approvals = await Approval.find(query).sort({ createdAt: -1 }).limit(300).lean();
    const counts = {
      total: approvals.length,
      pending: approvals.filter(a => a.status === 'pending').length,
      approved: approvals.filter(a => a.status === 'approved').length,
      rejected: approvals.filter(a => a.status === 'rejected').length,
      delegated: approvals.filter(a => a.delegated).length
    };
    res.json({ status: 'success', counts, approvals });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list approvals', message: error.message });
  }
});

async function decide(req, res, decision) {
  try {
    const a = await Approval.findOne({ userId: req.userId, approvalId: req.params.approvalId });
    if (!a) return res.status(404).json({ error: 'Approval not found' });
    if (a.status !== 'pending') return res.status(400).json({ error: `Already ${a.status}` });
    a.status = decision;
    a.decisionNote = (req.body && req.body.note) || '';
    a.decidedBy = req.userName || req.userEmail || a.currentApprover;
    a.decidedAt = new Date();
    await a.save();
    res.json({ status: 'success', approval: a });
  } catch (error) {
    res.status(500).json({ error: `Failed to ${decision}`, message: error.message });
  }
}
router.post('/:approvalId/approve', (req, res) => decide(req, res, 'approved'));
router.post('/:approvalId/reject', (req, res) => decide(req, res, 'rejected'));

router.delete('/:approvalId', async (req, res) => {
  const a = await Approval.findOneAndDelete({ userId: req.userId, approvalId: req.params.approvalId });
  if (!a) return res.status(404).json({ error: 'Approval not found' });
  res.json({ status: 'success', message: 'Approval deleted' });
});

module.exports = router;
