/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   VENDOR API — vendors, quarterly revenue/KPI/KRI, documents
   ===================================================== */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Vendor = require('../models/Vendor');
const VendorDocument = require('../models/VendorDocument');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

async function isRocket(userId) {
  const u = await User.findById(userId).select('plan').lean();
  return !!u && u.plan === 'rocket-ai-plus';
}
// Swift AI+ or higher (rocket also qualifies)
async function isSwift(userId) {
  const u = await User.findById(userId).select('plan').lean();
  return !!u && (u.plan === 'swift-ai-plus' || u.plan === 'rocket-ai-plus');
}

const DOCS_DIR = path.join(__dirname, '..', 'uploads', 'vendor-docs');
fs.mkdirSync(DOCS_DIR, { recursive: true });
const docUpload = multer({ dest: DOCS_DIR, limits: { fileSize: 30 * 1024 * 1024 } });

router.use(verifyToken);

const num = v => (v == null || v === '') ? 0 : (Number(v) || 0);
function pickQuarterly(src) {
  src = src || {};
  return { q1: num(src.q1), q2: num(src.q2), q3: num(src.q3), q4: num(src.q4) };
}

// ---------- Vendors ----------
router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.name) return res.status(400).json({ error: 'Vendor name is required' });
    const vendor = await Vendor.create({
      userId: req.userId,
      name: b.name.trim(), category: b.category || '', status: b.status || 'active',
      contactName: b.contactName || '', contactEmail: b.contactEmail || '', contactPhone: b.contactPhone || '',
      revenue: pickQuarterly(b.revenue), performance: pickQuarterly(b.performance), risk: pickQuarterly(b.risk),
      notes: b.notes || ''
    });
    res.status(201).json({ status: 'success', vendor });
  } catch (e) { res.status(500).json({ error: 'Failed to add vendor', message: e.message }); }
});

router.get('/', async (req, res) => {
  try {
    const query = { userId: req.userId };
    const search = (req.query.search || '').trim();
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ name: rx }, { category: rx }, { vendorId: rx }, { contactName: rx }];
    }
    const vendors = await Vendor.find(query).sort({ createdAt: -1 }).limit(500).lean();
    res.json({ status: 'success', count: vendors.length, vendors });
  } catch (e) { res.status(500).json({ error: 'Failed to list vendors', message: e.message }); }
});

router.get('/analytics', async (req, res) => {
  try {
    const vendors = await Vendor.find({ userId: req.userId }).lean();
    const quarters = ['q1', 'q2', 'q3', 'q4'];
    // Revenue distribution per quarter (for pie charts): { q1: [{name, value}], ... }
    const revenueByQuarter = {};
    quarters.forEach(q => { revenueByQuarter[q] = vendors.map(v => ({ name: v.name, value: (v.revenue && v.revenue[q]) || 0 })); });

    let totalRevenue = 0;
    const perfRiskIndex = vendors.map(v => {
      const rev = quarters.reduce((s, q) => s + ((v.revenue && v.revenue[q]) || 0), 0);
      totalRevenue += rev;
      const perfAvg = quarters.reduce((s, q) => s + ((v.performance && v.performance[q]) || 0), 0) / 4;
      const riskAvg = quarters.reduce((s, q) => s + ((v.risk && v.risk[q]) || 0), 0) / 4;
      // Composite Performance & Risk Index (0-100): performance minus half the risk, clamped
      const index = Math.max(0, Math.min(100, Math.round(perfAvg - riskAvg / 2)));
      return {
        name: v.name, vendorId: v.vendorId, revenue: rev,
        performance: Math.round(perfAvg), risk: Math.round(riskAvg), index,
        performanceByQuarter: v.performance, riskByQuarter: v.risk
      };
    });

    res.json({
      status: 'success',
      kpis: {
        totalVendors: vendors.length,
        activeVendors: vendors.filter(v => v.status === 'active').length,
        totalRevenue,
        avgPerformance: vendors.length ? Math.round(perfRiskIndex.reduce((s, v) => s + v.performance, 0) / vendors.length) : 0,
        avgRisk: vendors.length ? Math.round(perfRiskIndex.reduce((s, v) => s + v.risk, 0) / vendors.length) : 0
      },
      revenueByQuarter,
      perfRiskIndex
    });
  } catch (e) { res.status(500).json({ error: 'Failed to load analytics', message: e.message }); }
});

router.put('/:vendorId', async (req, res) => {
  try {
    const b = req.body || {};
    const update = {};
    ['name', 'category', 'status', 'contactName', 'contactEmail', 'contactPhone', 'notes'].forEach(f => { if (b[f] !== undefined) update[f] = b[f]; });
    if (b.revenue) update.revenue = pickQuarterly(b.revenue);
    if (b.performance) update.performance = pickQuarterly(b.performance);
    if (b.risk) update.risk = pickQuarterly(b.risk);
    const vendor = await Vendor.findOneAndUpdate({ userId: req.userId, vendorId: req.params.vendorId }, update, { new: true });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    res.json({ status: 'success', vendor });
  } catch (e) { res.status(500).json({ error: 'Failed to update vendor', message: e.message }); }
});

router.delete('/:vendorId', async (req, res) => {
  const v = await Vendor.findOneAndDelete({ userId: req.userId, vendorId: req.params.vendorId });
  if (!v) return res.status(404).json({ error: 'Vendor not found' });
  res.json({ status: 'success', message: 'Vendor deleted' });
});

// Map a vendor to a client / employee / workflow (Rocket AI+ only)
router.post('/:vendorId/map', async (req, res) => {
  try {
    if (!(await isSwift(req.userId))) return res.status(403).json({ error: 'Swift AI+ required', message: 'Mapping a vendor to a client/employee/workflow requires the Swift AI+ plan (or higher).' });
    const b = req.body || {};
    const upd = {};
    ['mappedClient', 'mappedEmployee', 'mappedWorkflow'].forEach(f => { if (b[f] !== undefined) upd[f] = b[f]; });
    const v = await Vendor.findOneAndUpdate({ userId: req.userId, vendorId: req.params.vendorId }, upd, { new: true });
    if (!v) return res.status(404).json({ error: 'Vendor not found' });
    res.json({ status: 'success', vendor: v });
  } catch (e) { res.status(500).json({ error: 'Failed to map vendor', message: e.message }); }
});

// Assign an employee to a vendor (Rocket AI+ only)
router.post('/:vendorId/assign-employee', async (req, res) => {
  try {
    if (!(await isSwift(req.userId))) return res.status(403).json({ error: 'Swift AI+ required', message: 'Assigning employees to a vendor requires the Swift AI+ plan (or higher).' });
    const employee = ((req.body && req.body.employee) || '').trim();
    if (!employee) return res.status(400).json({ error: 'employee is required' });
    const v = await Vendor.findOne({ userId: req.userId, vendorId: req.params.vendorId });
    if (!v) return res.status(404).json({ error: 'Vendor not found' });
    if (!v.assignedEmployees.includes(employee)) v.assignedEmployees.push(employee);
    await v.save();
    res.json({ status: 'success', vendor: v });
  } catch (e) { res.status(500).json({ error: 'Failed to assign employee', message: e.message }); }
});

// Assign a task to a vendor (Rocket AI+ only)
router.post('/:vendorId/task', async (req, res) => {
  try {
    if (!(await isSwift(req.userId))) return res.status(403).json({ error: 'Swift AI+ required', message: 'Assigning tasks to a vendor requires the Swift AI+ plan (or higher).' });
    const b = req.body || {};
    if (!b.title) return res.status(400).json({ error: 'title is required' });
    const v = await Vendor.findOne({ userId: req.userId, vendorId: req.params.vendorId });
    if (!v) return res.status(404).json({ error: 'Vendor not found' });
    v.tasks.push({ title: b.title.trim(), dueDate: b.dueDate ? new Date(b.dueDate) : undefined, status: 'open' });
    await v.save();
    res.json({ status: 'success', vendor: v });
  } catch (e) { res.status(500).json({ error: 'Failed to assign task', message: e.message }); }
});

// ---------- Documents ----------
router.post('/documents', docUpload.single('document'), async (req, res) => {
  let tmp;
  try {
    if (!req.file) return res.status(400).json({ error: 'No document uploaded' });
    tmp = req.file.path;
    const ext = path.extname(req.file.originalname) || '';
    const storedName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const finalPath = path.join(DOCS_DIR, storedName);
    fs.renameSync(tmp, finalPath); tmp = finalPath;

    const doc = await VendorDocument.create({
      userId: req.userId,
      vendorRef: (req.body && req.body.vendorRef) || '',
      vendorName: (req.body && req.body.vendorName) || '',
      docType: (req.body && req.body.docType) || 'Other',
      originalName: req.file.originalname,
      storedName,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: `/vendor-docs/${storedName}`
    });
    res.status(201).json({ status: 'success', document: doc });
  } catch (e) {
    if (tmp) { try { fs.unlinkSync(tmp); } catch (_) {} }
    res.status(500).json({ error: 'Failed to upload document', message: e.message });
  }
});

router.get('/documents', async (req, res) => {
  try {
    const query = { userId: req.userId };
    if (req.query.vendorRef) query.vendorRef = req.query.vendorRef;
    if (req.query.docType) query.docType = req.query.docType;
    const documents = await VendorDocument.find(query).sort({ createdAt: -1 }).limit(500).lean();
    res.json({ status: 'success', count: documents.length, documents });
  } catch (e) { res.status(500).json({ error: 'Failed to list documents', message: e.message }); }
});

router.delete('/documents/:docId', async (req, res) => {
  try {
    const doc = await VendorDocument.findOneAndDelete({ userId: req.userId, docId: req.params.docId });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (doc.storedName) { try { fs.unlinkSync(path.join(DOCS_DIR, doc.storedName)); } catch (_) {} }
    res.json({ status: 'success', message: 'Document deleted' });
  } catch (e) { res.status(500).json({ error: 'Failed to delete document', message: e.message }); }
});

module.exports = router;
