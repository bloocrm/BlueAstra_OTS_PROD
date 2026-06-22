const { v4: uuidv4 } = require('uuid');

// Audit logging middleware - captures all requests
const auditLogger = (Model) => {
  return async (req, res, next) => {
    // Assign request ID
    req.requestId = uuidv4();

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
        path: req.path,
        query: Object.keys(req.query).length > 0 ? req.query : null,
        statusCode: res.statusCode,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        timestamp: new Date(),
        duration: Date.now() - req._startTime,
        success: res.statusCode < 400
      };

      // Log sensitive operations asynchronously
      if (req.method !== 'GET' && Model) {
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

    // Track request start time
    req._startTime = Date.now();

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
