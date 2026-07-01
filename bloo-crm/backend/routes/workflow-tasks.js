/* =====================================================
   WORKFLOW TASKS — assign a task to an employee; if the employee is
   on leave, the notification email goes to their backup instead.
   ===================================================== */

const express = require('express');
const router = express.Router();
const WorkflowTask = require('../models/WorkflowTask');
const Employee = require('../models/Employee');
const LeaveApplication = require('../models/LeaveApplication');
const emailService = require('../utils/email-service');
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

function taskHtml(t, recipientName, viaBackup, originalAssignee) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#2d6cdf;color:#fff;padding:16px;border-radius:6px 6px 0 0;"><h2 style="margin:0;">New Workflow Task Assigned</h2></div>
      <div style="border:1px solid #eee;border-top:none;padding:20px;border-radius:0 0 6px 6px;">
        <p>Hi ${recipientName},</p>
        ${viaBackup ? `<p style="color:#b9770e;"><strong>Note:</strong> This task was assigned to ${originalAssignee}, who is currently on leave — so it has been routed to you as their backup.</p>` : ''}
        <h3 style="margin:12px 0 4px;">${t.title}</h3>
        <p style="color:#888;">Task ID: ${t.taskId}${t.dueDate ? ' · Due ' + new Date(t.dueDate).toLocaleDateString() : ''}</p>
        ${t.description ? `<p style="white-space:pre-wrap;">${t.description.replace(/</g, '&lt;')}</p>` : ''}
        <p style="font-size:12px;color:#999;margin-top:16px;">Assigned via Bloo CRM workflow.</p>
      </div>
    </div>`;
}

// POST /api/workflow-tasks — assign a task (emails employee or backup if on leave)
router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.title) return res.status(400).json({ error: 'Title is required' });
    if (!b.assignedToName) return res.status(400).json({ error: 'Assignee (employee) is required' });

    const assignee = b.assignedToName.trim();
    const emp = await Employee.findOne({ userId: req.userId, name: assignee }).lean();

    // Determine recipient: if the assignee is on leave, route to their backup
    let currentAssignee = assignee;
    let recipientEmail = emp ? emp.email : '';
    let delegated = false, delegatedTo = '', delegationReason = '';

    if (await isOnLeave(req.userId, assignee)) {
      const backupName = emp && emp.backupEmployee;
      if (backupName) {
        const backupEmp = await Employee.findOne({ userId: req.userId, name: backupName }).lean();
        currentAssignee = backupName;
        recipientEmail = backupEmp ? backupEmp.email : '';
        delegated = true; delegatedTo = backupName;
        delegationReason = `${assignee} is on leave — task routed to backup ${backupName}`;
      }
    }

    const task = await WorkflowTask.create({
      userId: req.userId,
      title: b.title.trim(),
      description: b.description || '',
      dueDate: b.dueDate ? new Date(b.dueDate) : undefined,
      assignedToName: assignee,
      assignedToRef: (emp && emp.employeeId) || '',
      currentAssignee,
      notifiedEmail: recipientEmail || '',
      delegated, delegatedTo, delegationReason,
      status: 'open'
    });

    // Send the notification email to whoever it landed with
    let emailed = false, mock = false;
    if (recipientEmail) {
      try {
        const r = await emailService.sendEmail({
          to: recipientEmail,
          subject: `New Task: ${task.title}`,
          html: taskHtml(task, currentAssignee, delegated, assignee)
        });
        emailed = !!(r && r.success && !r.mock); mock = !!(r && r.mock);
        task.emailSent = true; await task.save();
      } catch (e) { console.error('Task email failed:', e.message); }
    }

    res.status(201).json({ status: 'success', task, emailed, mock, noEmail: !recipientEmail });
  } catch (error) {
    console.error('Workflow task create error:', error);
    res.status(500).json({ error: 'Failed to assign task', message: error.message });
  }
});

// GET /api/workflow-tasks — list / search
router.get('/', async (req, res) => {
  try {
    const query = { userId: req.userId };
    if (req.query.status) query.status = req.query.status;
    const search = (req.query.search || '').trim();
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ title: rx }, { assignedToName: rx }, { currentAssignee: rx }, { taskId: rx }];
    }
    const tasks = await WorkflowTask.find(query).sort({ createdAt: -1 }).limit(300).lean();
    const counts = {
      total: tasks.length,
      open: tasks.filter(t => t.status === 'open').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      done: tasks.filter(t => t.status === 'done').length,
      delegated: tasks.filter(t => t.delegated).length
    };
    res.json({ status: 'success', counts, tasks });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list tasks', message: error.message });
  }
});

// PATCH /api/workflow-tasks/:taskId/status
router.patch('/:taskId/status', async (req, res) => {
  const { status } = req.body || {};
  if (!['open', 'in-progress', 'done'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const t = await WorkflowTask.findOneAndUpdate({ userId: req.userId, taskId: req.params.taskId }, { status }, { new: true });
  if (!t) return res.status(404).json({ error: 'Task not found' });
  res.json({ status: 'success', task: t });
});

// DELETE
router.delete('/:taskId', async (req, res) => {
  const t = await WorkflowTask.findOneAndDelete({ userId: req.userId, taskId: req.params.taskId });
  if (!t) return res.status(404).json({ error: 'Task not found' });
  res.json({ status: 'success', message: 'Task deleted' });
});

module.exports = router;
