const winston = require('winston');
const path = require('path');

// Create custom logger
const createLogger = () => {
  const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  );

  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'bloo-crm-backend' },
    transports: [
      // Console transport
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level}]: ${message}`;
          })
        )
      }),

      // File transports
      new winston.transports.File({
        filename: path.join('logs', 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }),
      new winston.transports.File({
        filename: path.join('logs', 'combined.log'),
        maxsize: 5242880,
        maxFiles: 10
      }),
      new winston.transports.File({
        filename: path.join('logs', 'security.log'),
        level: 'warn'
      })
    ]
  });

  return logger;
};

const logger = createLogger();

// Monitoring service
class MonitoringService {
  constructor() {
    this.metrics = {
      startTime: Date.now(),
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        averageTime: 0
      },
      security: {
        authAttempts: 0,
        authFailures: 0,
        xssAttempts: 0,
        sqlInjectionAttempts: 0,
        rateLimitExceeded: 0
      },
      database: {
        connections: 0,
        queries: 0,
        errors: 0,
        averageQueryTime: 0
      },
      errors: {
        total: 0,
        byType: {},
        recentErrors: []
      },
      performance: {
        memoryUsage: 0,
        cpuUsage: 0,
        uptime: 0
      }
    };

    this.alerts = [];
    this.healthCheckInterval = setInterval(() => this.performHealthCheck(), 60000);
  }

  // Log request
  logRequest(req, res, duration) {
    this.metrics.requests.total += 1;

    const logEntry = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      userId: req.userId || 'anonymous',
      ip: req.ip,
      timestamp: new Date()
    };

    if (res.statusCode < 400) {
      this.metrics.requests.successful += 1;
    } else {
      this.metrics.requests.failed += 1;
    }

    logger.info(`${req.method} ${req.path}`, logEntry);
  }

  // Log security event
  logSecurityEvent(type, details) {
    this.metrics.security[type] = (this.metrics.security[type] || 0) + 1;

    const logEntry = {
      type,
      ...details,
      timestamp: new Date()
    };

    logger.warn(`Security Event: ${type}`, logEntry);

    // Create alert if severity is high
    if (details.severity === 'critical') {
      this.createAlert(type, `Critical security event: ${type}`, details);
    }
  }

  // Log database operation
  logDatabaseOperation(operation, duration, success) {
    this.metrics.database.queries += 1;

    if (!success) {
      this.metrics.database.errors += 1;
    }

    const logEntry = {
      operation,
      duration: `${duration}ms`,
      success,
      timestamp: new Date()
    };

    if (!success) {
      logger.error(`Database error: ${operation}`, logEntry);
    }
  }

  // Log error
  logError(error, context) {
    this.metrics.errors.total += 1;

    const errorType = error.name || 'UnknownError';
    this.metrics.errors.byType[errorType] = (this.metrics.errors.byType[errorType] || 0) + 1;

    // Keep last 100 errors
    this.metrics.errors.recentErrors.unshift({
      type: errorType,
      message: error.message,
      context,
      timestamp: new Date()
    });

    if (this.metrics.errors.recentErrors.length > 100) {
      this.metrics.errors.recentErrors.pop();
    }

    logger.error(`Error: ${errorType}`, {
      error: error.message,
      stack: error.stack,
      context
    });
  }

  // Perform health check
  performHealthCheck() {
    const uptime = (Date.now() - this.metrics.startTime) / 1000 / 60; // minutes
    const memUsage = process.memoryUsage();

    this.metrics.performance.uptime = uptime;
    this.metrics.performance.memoryUsage = Math.round(memUsage.heapUsed / 1024 / 1024); // MB
    this.metrics.performance.cpuUsage = process.cpuUsage();

    // Check thresholds
    if (this.metrics.performance.memoryUsage > 500) {
      this.createAlert('high_memory', 'Memory usage exceeds 500MB', {
        current: this.metrics.performance.memoryUsage
      });
    }

    if (this.metrics.requests.failed > this.metrics.requests.successful) {
      this.createAlert('high_error_rate', 'Error rate exceeds success rate', {
        successful: this.metrics.requests.successful,
        failed: this.metrics.requests.failed
      });
    }

    if (this.metrics.security.rateLimitExceeded > 10) {
      this.createAlert('rate_limit_abuse', 'Excessive rate limit violations detected', {
        count: this.metrics.security.rateLimitExceeded
      });
    }

    logger.info('Health check completed', this.metrics);
  }

  // Create alert
  createAlert(type, message, details) {
    const alert = {
      id: Date.now(),
      type,
      message,
      severity: details.severity || 'warning',
      details,
      timestamp: new Date(),
      resolved: false
    };

    this.alerts.push(alert);

    // Remove alerts older than 24 hours
    this.alerts = this.alerts.filter(
      a => Date.now() - a.timestamp < 24 * 60 * 60 * 1000
    );

    logger.warn(`Alert: ${type}`, alert);

    // Emit event for subscribers
    if (global.alertEmitter) {
      global.alertEmitter.emit('alert', alert);
    }
  }

  // Get current metrics
  getMetrics() {
    return {
      ...this.metrics,
      alerts: this.alerts.filter(a => !a.resolved)
    };
  }

  // Get performance report
  getPerformanceReport(hours = 24) {
    return {
      period: `Last ${hours} hours`,
      metrics: this.metrics,
      alerts: this.alerts.slice(-50)
    };
  }

  // Reset alerts
  resolveAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
    }
  }

  // Cleanup
  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

// Create singleton instance
const monitoringService = new MonitoringService();

// Request middleware
const requestMonitoring = (req, res, next) => {
  const startTime = Date.now();

  // Wrap res.send to track response
  const originalSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - startTime;
    monitoringService.logRequest(req, res, duration);
    return originalSend.call(this, data);
  };

  next();
};

// Security event middleware
const securityMonitoring = (req, res, next) => {
  // Log failed auth attempts
  if (res.statusCode === 401) {
    monitoringService.logSecurityEvent('authFailures', {
      path: req.path,
      userId: req.userId || req.ip,
      severity: 'warning'
    });
  }

  // Log potential XSS attempts
  if (req.body && JSON.stringify(req.body).includes('<script')) {
    monitoringService.logSecurityEvent('xssAttempts', {
      path: req.path,
      userId: req.userId || req.ip,
      severity: 'critical'
    });
  }

  next();
};

// Error monitoring middleware
const errorMonitoring = (err, req, res, next) => {
  monitoringService.logError(err, {
    path: req.path,
    method: req.method,
    userId: req.userId
  });

  next(err);
};

module.exports = {
  logger,
  monitoringService,
  requestMonitoring,
  securityMonitoring,
  errorMonitoring
};
