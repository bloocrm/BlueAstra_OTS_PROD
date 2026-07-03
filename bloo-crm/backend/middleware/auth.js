/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
const jwt = require('jsonwebtoken');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');
const User = require('../models/User');

// JWT verification middleware.
// Members operate inside their admin's workspace: req.userId is set to the
// admin (parent) for data scoping, while req.actualUserId is the member's own id.
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new AuthenticationError('No authentication token provided');
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, jwtSecret);

    // Load access-control fields (member resolution + live permission/status)
    let account = null;
    try {
      account = await User.findById(decoded.id).select('role parentUserId permissions isActive').lean();
    } catch (e) { /* fall back to token below */ }

    if (account && account.isActive === false) {
      return res.status(403).json({ error: 'ACCOUNT_INACTIVE', message: 'Your access has been suspended by your administrator.' });
    }

    const role = (account && account.role) || 'admin';
    req.actualUserId = decoded.id;                       // the logged-in user
    req.role = role;
    req.permissions = (account && account.permissions) || [];
    // Data scoping: members share their admin's workspace
    req.userId = (role === 'member' && account && account.parentUserId) ? String(account.parentUserId) : decoded.id;
    req.userEmail = decoded.email;
    req.userName = decoded.name;
    req.user = decoded;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'TOKEN_EXPIRED',
        message: 'Authentication token has expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(401).json({
      error: 'AUTHENTICATION_FAILED',
      message: 'Invalid or malformed token'
    });
  }
};

// Optional token verification (doesn't fail if no token)
const optionalToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
      const jwtSecret = process.env.JWT_SECRET;
      const decoded = jwt.verify(token, jwtSecret);
      req.userId = decoded.id;
      req.userEmail = decoded.email;
      req.user = decoded;
    }

    next();
  } catch (error) {
    // Silently fail - continue without user context
    next();
  }
};

// Resource ownership verification
const verifyOwnership = async (Model, resourceId, userId, resourceField = '_id') => {
  const resource = await Model.findById(resourceId);

  if (!resource) {
    throw new NotFoundError(`${Model.modelName} not found`);
  }

  // Check ownership
  if (resource.userId && resource.userId.toString() !== userId) {
    throw new AuthorizationError('You do not have access to this resource');
  }

  return resource;
};

// Admin check middleware
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Admin access required'
    });
  }
  next();
};

// User self-check (can only access own data)
const requireSelfOrAdmin = (req, res, next) => {
  const requestedUserId = req.params.userId || req.query.userId;

  if (req.user.role !== 'admin' && req.user.id !== requestedUserId) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'You can only access your own data'
    });
  }

  next();
};

// Restrict a route to admins or members granted the given section permission.
// Use AFTER verifyToken. Admins always pass.
const requirePermission = (section) => (req, res, next) => {
  if (req.role !== 'member') return next();               // admin (or unknown) -> full access
  if ((req.permissions || []).includes(section)) return next();
  return res.status(403).json({ error: 'PERMISSION_DENIED', message: `You do not have access to "${section}". Ask your administrator to grant it.` });
};

// Restrict a route to the workspace admin only (members blocked).
const requireWorkspaceAdmin = (req, res, next) => {
  if (req.role === 'member') return res.status(403).json({ error: 'ADMIN_ONLY', message: 'Only the account administrator can manage this.' });
  next();
};

module.exports = {
  verifyToken,
  optionalToken,
  verifyOwnership,
  requireAdmin,
  requireSelfOrAdmin,
  requirePermission,
  requireWorkspaceAdmin
};
