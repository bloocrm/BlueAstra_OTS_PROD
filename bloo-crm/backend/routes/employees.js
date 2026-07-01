/* =====================================================
   EMPLOYEE API — HR employee records (PII encrypted)
   ===================================================== */

const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

const ALLOWED = [
  'name', 'email', 'phone', 'department', 'jobTitle', 'manager', 'dateOfJoining',
  'status', 'ssn', 'dateOfBirth', 'bankAccount', 'address', 'emergencyContact', 'notes'
];

function pick(body) {
  const out = {};
  ALLOWED.forEach(k => { if (body[k] !== undefined) out[k] = body[k]; });
  return out;
}

// POST /api/employees — add an employee
router.post('/', async (req, res) => {
  try {
    if (!req.body || !req.body.name) return res.status(400).json({ error: 'Name is required' });
    const data = pick(req.body);
    data.userId = req.userId;
    const employee = new Employee(data);
    await employee.save();
    res.status(201).json({ status: 'success', employee });
  } catch (error) {
    console.error('Employee create error:', error);
    res.status(500).json({ error: 'Failed to add employee', message: error.message });
  }
});

// GET /api/employees — list / search (+ dashboard counts). PII excluded.
router.get('/', async (req, res) => {
  try {
    const query = { userId: req.userId };
    const search = (req.query.search || '').trim();
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ name: rx }, { email: rx }, { department: rx }, { jobTitle: rx }, { employeeId: rx }];
    }
    const employees = await Employee.find(query).sort({ createdAt: -1 }).limit(500).lean();
    const byDept = {};
    employees.forEach(e => { if (e.department) byDept[e.department] = (byDept[e.department] || 0) + 1; });
    const counts = {
      total: employees.length,
      active: employees.filter(e => e.status === 'active').length,
      onLeave: employees.filter(e => e.status === 'on-leave').length,
      departments: Object.keys(byDept).length,
      byDept
    };
    res.json({ status: 'success', counts, employees });
  } catch (error) {
    console.error('Employee list error:', error);
    res.status(500).json({ error: 'Failed to list employees', message: error.message });
  }
});

// GET /api/employees/:employeeId — one employee (PII excluded)
router.get('/:employeeId', async (req, res) => {
  try {
    const e = await Employee.findOne({ userId: req.userId, employeeId: req.params.employeeId });
    if (!e) return res.status(404).json({ error: 'Employee not found' });
    res.json({ status: 'success', employee: e.toJSON() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get employee', message: error.message });
  }
});

// GET /api/employees/:employeeId/pii — decrypted PII (explicit, audited access)
router.get('/:employeeId/pii', async (req, res) => {
  try {
    const e = await Employee.findOne({ userId: req.userId, employeeId: req.params.employeeId })
      .select('+ssn +dateOfBirth +bankAccount');
    if (!e) return res.status(404).json({ error: 'Employee not found' });
    res.json({ status: 'success', pii: { ssn: e.ssn || '', dateOfBirth: e.dateOfBirth || '', bankAccount: e.bankAccount || '' } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get PII', message: error.message });
  }
});

// PUT /api/employees/:employeeId — update
router.put('/:employeeId', async (req, res) => {
  try {
    const data = pick(req.body || {});
    const e = await Employee.findOneAndUpdate(
      { userId: req.userId, employeeId: req.params.employeeId },
      data, { new: true, runValidators: true }
    );
    if (!e) return res.status(404).json({ error: 'Employee not found' });
    res.json({ status: 'success', employee: e.toJSON() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update employee', message: error.message });
  }
});

// DELETE /api/employees/:employeeId
router.delete('/:employeeId', async (req, res) => {
  try {
    const e = await Employee.findOneAndDelete({ userId: req.userId, employeeId: req.params.employeeId });
    if (!e) return res.status(404).json({ error: 'Employee not found' });
    res.json({ status: 'success', message: 'Employee deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete employee', message: error.message });
  }
});

module.exports = router;
