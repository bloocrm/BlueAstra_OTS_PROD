/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   LEAVE APPLICATION API — apply, manager approval, backup delegation
   ===================================================== */

const express = require('express');
const router = express.Router();
const LeaveApplication = require('../models/LeaveApplication');
const Employee = require('../models/Employee');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

function daysBetween(a, b) {
  if (!a || !b) return undefined;
  const ms = new Date(b) - new Date(a);
  return ms >= 0 ? Math.round(ms / 86400000) + 1 : undefined;
}

// Is this person (by name) currently unavailable (on leave)?
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

// POST /api/leaves — employee applies for leave (routes to manager, delegates if unavailable)
router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.employeeName) return res.status(400).json({ error: 'Employee name is required' });

    // Determine the approver: explicit manager, else the applicant's employee record's manager
    let manager = (b.manager || '').trim();
    let applicantEmp = null;
    if (b.employeeRef) applicantEmp = await Employee.findOne({ userId: req.userId, employeeId: b.employeeRef }).lean();
    if (!applicantEmp) applicantEmp = await Employee.findOne({ userId: req.userId, name: b.employeeName }).lean();
    if (!manager && applicantEmp) manager = applicantEmp.manager || '';

    // Delegation: if the manager is currently on leave, route to the manager's backup
    let currentApprover = manager;
    let delegated = false, delegatedTo = '', delegationReason = '';
    if (manager && await isOnLeave(req.userId, manager)) {
      const mgrEmp = await Employee.findOne({ userId: req.userId, name: manager }).select('backupEmployee').lean();
      const backup = mgrEmp && mgrEmp.backupEmployee;
      if (backup) {
        currentApprover = backup; delegated = true; delegatedTo = backup;
        delegationReason = `${manager} is on leave — routed to backup ${backup}`;
      }
    }

    const leave = await LeaveApplication.create({
      userId: req.userId,
      employeeName: b.employeeName.trim(),
      employeeRef: b.employeeRef || '',
      leaveType: b.leaveType || 'Annual',
      startDate: b.startDate ? new Date(b.startDate) : undefined,
      endDate: b.endDate ? new Date(b.endDate) : undefined,
      days: b.days || daysBetween(b.startDate, b.endDate),
      reason: b.reason || '',
      manager, currentApprover, delegated, delegatedTo, delegationReason,
      status: 'pending'
    });

    res.status(201).json({ status: 'success', leave });
  } catch (error) {
    console.error('Leave create error:', error);
    res.status(500).json({ error: 'Failed to apply for leave', message: error.message });
  }
});

// GET /api/leaves — list / search / filter by status
router.get('/', async (req, res) => {
  try {
    const query = { userId: req.userId };
    if (req.query.status && ['pending', 'approved', 'rejected'].includes(req.query.status)) query.status = req.query.status;
    const search = (req.query.search || '').trim();
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ employeeName: rx }, { manager: rx }, { leaveId: rx }, { currentApprover: rx }];
    }
    const leaves = await LeaveApplication.find(query).sort({ createdAt: -1 }).limit(300).lean();
    const counts = {
      total: leaves.length,
      pending: leaves.filter(l => l.status === 'pending').length,
      approved: leaves.filter(l => l.status === 'approved').length,
      rejected: leaves.filter(l => l.status === 'rejected').length,
      delegated: leaves.filter(l => l.delegated).length
    };
    res.json({ status: 'success', counts, leaves });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list leaves', message: error.message });
  }
});

async function decide(req, res, decision) {
  try {
    const leave = await LeaveApplication.findOne({ userId: req.userId, leaveId: req.params.leaveId });
    if (!leave) return res.status(404).json({ error: 'Leave application not found' });
    if (leave.status !== 'pending') return res.status(400).json({ error: `Already ${leave.status}` });

    leave.status = decision;
    leave.decisionNote = (req.body && req.body.note) || '';
    leave.decidedBy = req.userName || req.userEmail || leave.currentApprover;
    leave.decidedAt = new Date();
    await leave.save();

    // On approval, mark the applicant employee as on-leave (so their own approvals delegate)
    if (decision === 'approved' && leave.employeeName) {
      await Employee.findOneAndUpdate(
        { userId: req.userId, name: leave.employeeName },
        { status: 'on-leave' }
      );
    }
    res.json({ status: 'success', leave });
  } catch (error) {
    res.status(500).json({ error: `Failed to ${decision} leave`, message: error.message });
  }
}

router.post('/:leaveId/approve', (req, res) => decide(req, res, 'approved'));
router.post('/:leaveId/reject', (req, res) => decide(req, res, 'rejected'));

// DELETE /api/leaves/:leaveId
router.delete('/:leaveId', async (req, res) => {
  const l = await LeaveApplication.findOneAndDelete({ userId: req.userId, leaveId: req.params.leaveId });
  if (!l) return res.status(404).json({ error: 'Leave application not found' });
  res.json({ status: 'success', message: 'Leave application deleted' });
});

module.exports = router;
