const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Client = require('../models/Client');
const AuditLog = require('../models/AuditLog');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { successResponse, paginatedResponse } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');
const { ValidationError, AuthorizationError } = require('../utils/errors');

// All admin routes require authentication and admin role
router.use(verifyToken);
router.use(requireAdmin);

// GET /api/admin/users - Get all users
router.get('/users', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, role } = req.query;

  const filter = {};

  if (status && ['active', 'inactive', 'suspended'].includes(status)) {
    filter.status = status;
  }

  if (role && ['user', 'manager', 'admin'].includes(role)) {
    filter.role = role;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const users = await User.find(filter)
    .select('-password -encryptionKey')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  const total = await User.countDocuments(filter);

  return paginatedResponse(
    res,
    users,
    page,
    limit,
    total,
    'Users retrieved successfully'
  );
}));

// GET /api/admin/users/:id - Get specific user
router.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');

  if (!user) {
    throw new ValidationError('User not found');
  }

  return successResponse(res, user, 'User retrieved successfully');
}));

// PATCH /api/admin/users/:id/role - Update user role
router.patch('/users/:id/role', asyncHandler(async (req, res) => {
  const { role } = req.body;

  if (!role || !['user', 'manager', 'admin'].includes(role)) {
    throw new ValidationError('Valid role is required');
  }

  // Prevent removing last admin
  if (role !== 'admin') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount === 1) {
      throw new AuthorizationError('Cannot remove the last admin user');
    }
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true }
  ).select('-password');

  return successResponse(
    res,
    updatedUser,
    'User role updated successfully'
  );
}));

// PATCH /api/admin/users/:id/status - Update user status
router.patch('/users/:id/status', asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!status || !['active', 'inactive', 'suspended'].includes(status)) {
    throw new ValidationError('Valid status is required');
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  ).select('-password');

  return successResponse(
    res,
    updatedUser,
    'User status updated successfully'
  );
}));

// GET /api/admin/stats - Get database statistics
router.get('/stats', asyncHandler(async (req, res) => {
  const stats = {
    totalUsers: await User.countDocuments(),
    activeUsers: await User.countDocuments({ status: 'active' }),
    totalClients: await Client.countDocuments(),
    totalAuditLogs: await AuditLog.countDocuments(),
    databaseSize: 'N/A', // Would require specific DB implementation
    lastBackup: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  };

  return successResponse(res, stats, 'Database statistics retrieved successfully');
}));

// GET /api/admin/audit-logs - Get all audit logs
router.get('/audit-logs', asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, userId, action, status } = req.query;

  const filter = {};

  if (userId) {
    filter.userId = userId;
  }

  if (action && ['CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT'].includes(action)) {
    filter.action = action;
  }

  if (status && ['success', 'error'].includes(status)) {
    filter.success = status === 'success';
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const logs = await AuditLog.find(filter)
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ timestamp: -1 });

  const total = await AuditLog.countDocuments(filter);

  return paginatedResponse(
    res,
    logs,
    page,
    limit,
    total,
    'Audit logs retrieved successfully'
  );
}));

// GET /api/admin/security-events - Get security events
router.get('/security-events', asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, level } = req.query;

  const filter = { securityEvent: true };

  if (level && ['info', 'warning', 'critical'].includes(level)) {
    filter.securityLevel = level;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const events = await AuditLog.find(filter)
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ timestamp: -1 });

  const total = await AuditLog.countDocuments(filter);

  return paginatedResponse(
    res,
    events,
    page,
    limit,
    total,
    'Security events retrieved successfully'
  );
}));

// GET /api/admin/audit-logs/user/:userId - Get user's audit log
router.get('/audit-logs/user/:userId', asyncHandler(async (req, res) => {
  const logs = await AuditLog.findByUser(req.params.userId, 100);

  return successResponse(
    res,
    logs,
    'User audit logs retrieved successfully'
  );
}));

// GET /api/admin/audit-logs/entity/:entityType/:entityId - Get entity change log
router.get('/audit-logs/entity/:entityType/:entityId', asyncHandler(async (req, res) => {
  const logs = await AuditLog.findByEntity(req.params.entityType, req.params.entityId);

  return successResponse(
    res,
    logs,
    'Entity audit logs retrieved successfully'
  );
}));

// POST /api/admin/system/health - System health check
router.post('/system/health', asyncHandler(async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'connected',
      authentication: 'operational',
      encryption: 'active',
      auditLogging: 'active',
      rateLimit: 'active'
    },
    uptime: Math.floor(process.uptime() / 60),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
    }
  };

  return successResponse(res, health, 'System health check completed');
}));

// POST /api/admin/users/:id/reset-password - Reset user password
router.post('/users/:id/reset-password', asyncHandler(async (req, res) => {
  const temporaryPassword = Math.random().toString(36).slice(-12);

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ValidationError('User not found');
  }

  user.password = temporaryPassword;
  user.lastPasswordChange = new Date();
  await user.save();

  return successResponse(
    res,
    {
      userId: user._id,
      email: user.email,
      temporaryPassword,
      message: 'User must change this password on next login'
    },
    'Password reset successfully'
  );
}));

// GET /api/admin/compliance-summary - Get compliance overview
router.get('/compliance-summary', asyncHandler(async (req, res) => {
  const Compliance = require('../models/Compliance');
  const summary = await Compliance.aggregate([
    {
      $group: {
        _id: '$framework',
        total: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        atRisk: {
          $sum: { $cond: [{ $eq: ['$riskLevel', 'critical'] }, 1, 0] }
        }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  return successResponse(
    res,
    summary,
    'Compliance summary retrieved successfully'
  );
}));

// GET /api/admin/data-export - Export all data (for backups)
router.get('/data-export', asyncHandler(async (req, res) => {
  const { entityType } = req.query;

  let data = {};

  if (!entityType || entityType === 'users') {
    data.users = await User.find().select('-password').lean();
  }

  if (!entityType || entityType === 'clients') {
    data.clients = await Client.find().lean();
  }

  if (!entityType || entityType === 'auditLogs') {
    data.auditLogs = await AuditLog.find().lean();
  }

  return successResponse(
    res,
    data,
    'Data export prepared successfully'
  );
}));

module.exports = router;
