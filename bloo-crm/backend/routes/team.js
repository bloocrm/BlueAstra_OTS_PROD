/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   TEAM & ACCESS CONTROL
   An admin (main user) creates member sub-users tied to them and grants or
   revokes access to sections of the CRM.
   ===================================================== */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { verifyToken, requireWorkspaceAdmin } = require('../middleware/auth');

// Sections an admin can grant to members
const SECTIONS = [
  'dashboard', 'uploadSourceData', 'clients', 'clientDashboard', 'leads', 'email',
  'calendar', 'compliance', 'communications', 'grievance', 'hr', 'vendors',
  'proposals', 'knowledge', 'pricing', 'workflow', 'meetingRoom', 'ai-insights', 'help'
];

router.use(verifyToken);

// The logged-in user's own access context (role + permissions)
router.get('/me', (req, res) => {
  res.json({ status: 'success', role: req.role, permissions: req.permissions, sections: SECTIONS });
});

// Everything below is admin-only
router.use(requireWorkspaceAdmin);

// List members under this admin
router.get('/members', async (req, res) => {
  try {
    const members = await User.find({ parentUserId: req.actualUserId, role: 'member' })
      .select('name email permissions isActive lastLogin createdAt').sort({ createdAt: -1 }).lean();
    res.json({ status: 'success', sections: SECTIONS, count: members.length, members });
  } catch (e) { res.status(500).json({ error: 'Failed to list members', message: e.message }); }
});

// Create a member
router.post('/members', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.name || !b.email || !b.password) return res.status(400).json({ error: 'name, email and password are required' });
    const exists = await User.findOne({ email: b.email.toLowerCase() });
    if (exists) return res.status(409).json({ error: 'A user with this email already exists' });

    const permissions = Array.isArray(b.permissions) ? b.permissions.filter(p => SECTIONS.includes(p)) : [];
    const member = new User({
      name: b.name.trim(),
      email: b.email.toLowerCase().trim(),
      password: b.password,          // hashed by the model pre-save hook
      phone: (b.phone && b.phone.trim()) || 'N/A',
      role: 'member',
      parentUserId: req.actualUserId,
      permissions,
      isActive: true,
      plan: 'basic'
    });
    await member.save();
    res.status(201).json({ status: 'success', member: { id: member._id, name: member.name, email: member.email, permissions: member.permissions, isActive: member.isActive } });
  } catch (e) { res.status(500).json({ error: 'Failed to create member', message: e.message }); }
});

// Helper: ensure the target member belongs to this admin
async function ownedMember(adminId, memberId) {
  return User.findOne({ _id: memberId, parentUserId: adminId, role: 'member' });
}

// Grant / revoke permissions (replace the set)
router.patch('/members/:id/permissions', async (req, res) => {
  try {
    const m = await ownedMember(req.actualUserId, req.params.id);
    if (!m) return res.status(404).json({ error: 'Member not found' });
    const permissions = Array.isArray(req.body && req.body.permissions) ? req.body.permissions.filter(p => SECTIONS.includes(p)) : [];
    m.permissions = permissions;
    await m.save();
    res.json({ status: 'success', permissions: m.permissions });
  } catch (e) { res.status(500).json({ error: 'Failed to update permissions', message: e.message }); }
});

// Suspend / restore all access
router.patch('/members/:id/active', async (req, res) => {
  try {
    const m = await ownedMember(req.actualUserId, req.params.id);
    if (!m) return res.status(404).json({ error: 'Member not found' });
    m.isActive = !!(req.body && req.body.isActive);
    await m.save();
    res.json({ status: 'success', isActive: m.isActive });
  } catch (e) { res.status(500).json({ error: 'Failed to update status', message: e.message }); }
});

// Remove a member
router.delete('/members/:id', async (req, res) => {
  try {
    const m = await ownedMember(req.actualUserId, req.params.id);
    if (!m) return res.status(404).json({ error: 'Member not found' });
    await User.deleteOne({ _id: m._id });
    res.json({ status: 'success', message: 'Member removed' });
  } catch (e) { res.status(500).json({ error: 'Failed to remove member', message: e.message }); }
});

module.exports = router;
