/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   ANALYTICS API — dashboard aggregates (per user, from MongoDB)
   ===================================================== */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const Client = require('../models/Client');
const Lead = require('../models/Lead');
const Meeting = require('../models/Meeting');
const Employee = require('../models/Employee');
const Policy = require('../models/Policy');
const Grievance = require('../models/Grievance');

router.use(verifyToken);

router.get('/dashboard', async (req, res) => {
  try {
    const uid = req.userId;

    const [clients, leads, meetings, employees, policies, grievances] = await Promise.all([
      Client.find({ userId: uid, deletedAt: null }).select('status createdAt name').lean(),
      Lead.find({ userId: uid, deletedAt: null }).select('status createdAt name').lean(),
      Meeting.find({ userId: uid }).select('startTime durationMinutes status title clientName').sort({ startTime: -1 }).limit(200).lean(),
      Employee.find({ userId: uid }).select('name status department').lean(),
      Policy.find({ userId: uid }).select('title category status version lastPublishedAt updatedAt').sort({ updatedAt: -1 }).limit(10).lean(),
      Grievance.find({ userId: uid }).select('grievanceId name problemType section status createdAt').sort({ createdAt: -1 }).lean()
    ]);

    // --- Lead → client conversion funnel (donut) ---
    // Real leads by status; "converted" leads + existing clients drive the KPI.
    const leadByStatus = { new: 0, qualified: 0, interested: 0, negotiating: 0, converted: 0, lost: 0 };
    leads.forEach(l => { leadByStatus[l.status] = (leadByStatus[l.status] || 0) + 1; });
    const totalLeads = leads.length;
    const convertedLeads = leadByStatus.converted || 0;
    const totalClients = clients.length;
    // Conversion rate = converted / (all leads ever). If no leads, fall back to clients present.
    const conversionRate = totalLeads
      ? Math.round((convertedLeads / totalLeads) * 100)
      : (totalClients ? 100 : 0);
    const openOpportunities = leadByStatus.qualified + leadByStatus.interested + leadByStatus.negotiating;

    // --- Meetings over time (bar) + scatter points ---
    const meetingsByMonth = {};
    const meetingScatter = [];
    meetings.forEach(m => {
      const d = m.startTime ? new Date(m.startTime) : null;
      if (!d || isNaN(d)) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      meetingsByMonth[key] = (meetingsByMonth[key] || 0) + 1;
      meetingScatter.push({ x: d.getTime(), y: m.durationMinutes || 0, label: m.title || 'Meeting' });
    });

    // --- Employees + "defaulters" (non-active) ---
    const empByStatus = { active: 0, 'on-leave': 0, terminated: 0 };
    employees.forEach(e => { empByStatus[e.status] = (empByStatus[e.status] || 0) + 1; });
    const defaulters = employees
      .filter(e => e.status && e.status !== 'active')
      .map(e => ({ name: e.name, status: e.status, department: e.department || '' }));

    // --- Pending / clogged items (open + in-progress grievances) ---
    const pending = grievances
      .filter(g => g.status !== 'resolved')
      .map(g => ({ grievanceId: g.grievanceId, name: g.name, problemType: g.problemType, section: g.section, status: g.status, createdAt: g.createdAt }));

    // --- Company news / policy changes (recent published/updated policies) ---
    const news = policies.map(p => ({
      title: p.title, category: p.category, status: p.status, version: p.version,
      date: p.lastPublishedAt || p.updatedAt, published: !!p.lastPublishedAt
    }));

    res.json({
      status: 'success',
      kpis: {
        totalClients,
        totalLeads,
        converted: convertedLeads,
        conversionRate,
        prospects: openOpportunities,
        totalMeetings: meetings.length,
        totalEmployees: employees.length,
        openGrievances: pending.length,
        publishedPolicies: policies.filter(p => p.status === 'published').length
      },
      leadFunnel: leadByStatus,
      meetingsByMonth,
      meetingScatter,
      employeesByStatus: empByStatus,
      defaulters,
      pending,
      news
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to load analytics', message: error.message });
  }
});

module.exports = router;
