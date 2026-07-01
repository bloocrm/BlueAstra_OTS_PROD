/* =====================================================
   ANALYTICS API — dashboard aggregates (per user, from MongoDB)
   ===================================================== */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const Client = require('../models/Client');
const Meeting = require('../models/Meeting');
const Employee = require('../models/Employee');
const Policy = require('../models/Policy');
const Grievance = require('../models/Grievance');

router.use(verifyToken);

router.get('/dashboard', async (req, res) => {
  try {
    const uid = req.userId;

    const [clients, meetings, employees, policies, grievances] = await Promise.all([
      Client.find({ userId: uid, deletedAt: null }).select('status createdAt name').lean(),
      Meeting.find({ userId: uid }).select('startTime durationMinutes status title clientName').sort({ startTime: -1 }).limit(200).lean(),
      Employee.find({ userId: uid }).select('name status department').lean(),
      Policy.find({ userId: uid }).select('title category status version lastPublishedAt updatedAt').sort({ updatedAt: -1 }).limit(10).lean(),
      Grievance.find({ userId: uid }).select('grievanceId name problemType section status createdAt').sort({ createdAt: -1 }).lean()
    ]);

    // --- Client / conversion funnel (donut) ---
    const clientByStatus = { active: 0, prospect: 0, inactive: 0, archived: 0 };
    clients.forEach(c => { clientByStatus[c.status] = (clientByStatus[c.status] || 0) + 1; });
    const converted = clientByStatus.active || 0;
    const totalClients = clients.length;
    const conversionRate = totalClients ? Math.round((converted / totalClients) * 100) : 0;

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
        converted,
        conversionRate,
        prospects: clientByStatus.prospect || 0,
        totalMeetings: meetings.length,
        totalEmployees: employees.length,
        openGrievances: pending.length,
        publishedPolicies: policies.filter(p => p.status === 'published').length
      },
      clientFunnel: clientByStatus,
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
