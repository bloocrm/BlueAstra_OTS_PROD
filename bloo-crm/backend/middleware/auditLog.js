/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
const { v4: uuidv4 } = require('uuid');

// Audit logging middleware - captures all requests
const auditLogger = (Model) => {
  return async (req, res, next) => {
    // Assign request ID; capture start time and the FULL path up front, since
    // req.path mutates as the request descends into mounted routers.
    req.requestId = uuidv4();
    req._startTime = Date.now();
    const fullPath = (req.originalUrl || req.url || req.path || '').split('?')[0];

    // Store original send function
    const originalSend = res.send;

    // Override send to capture response
    res.send = function (data) {
      // Prepare audit log entry
      const auditEntry = {
        requestId: req.requestId,
        userId: req.userId || null,
        userEmail: req.userEmail || null,
        method: req.method,
        path: fullPath,
        query: (req.query && Object.keys(req.query).length > 0) ? req.query : null,
        statusCode: res.statusCode,
        ipAddress: req.ip || (req.connection && req.connection.remoteAddress) || null,
        userAgent: req.get('user-agent'),
        timestamp: new Date(),
        responseTime: Date.now() - req._startTime,
        success: res.statusCode < 400
      };

      // Persist mutating requests only (enum-valid methods; skips GET/HEAD/OPTIONS)
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && Model) {
        Model.create(auditEntry).catch(err => {
          console.error('[AUDIT LOG ERROR]', {
            requestId: req.requestId,
            error: err.message,
            timestamp: new Date().toISOString()
          });
        });
      }

      // Log to console in development
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[${auditEntry.method}] ${auditEntry.path} - ${auditEntry.statusCode}`, {
          user: auditEntry.userEmail,
          duration: `${auditEntry.duration}ms`,
          requestId: auditEntry.requestId
        });
      }

      // Call original send
      res.send = originalSend;
      return res.send(data);
    };

    next();
  };
};

// Simple request logger middleware (pairs with winston in production)
const simpleRequestLogger = (req, res, next) => {
  req.requestId = req.requestId || uuidv4();

  const originalSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - req._startTime;
    const log = {
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.userId || 'anonymous',
      ip: req.ip
    };

    // Log to stdout (captured by pm2/systemd)
    if (res.statusCode >= 400) {
      console.error('[REQUEST]', log);
    } else if (process.env.NODE_ENV === 'development') {
      console.log('[REQUEST]', log);
    }

    res.send = originalSend;
    return res.send(data);
  };

  req._startTime = Date.now();
  next();
};

module.exports = {
  auditLogger,
  simpleRequestLogger
};
