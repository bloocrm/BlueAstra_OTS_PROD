const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const helmet = require('helmet');
const hpp = require('hpp');

// Sanitize all inputs against NoSQL injection
const sanitizeNoSQL = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`[SECURITY] Potential NoSQL injection detected in ${key}`, {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      path: req.path
    });
  }
});

// Sanitize against XSS attacks
const sanitizeXSS = xss();

// Prevent HTTP Parameter Pollution
const preventParameterPollution = hpp({
  whitelist: [
    'page',
    'limit',
    'sort',
    'q',
    'status',
    'type',
    'startDate',
    'endDate'
  ]
});

// Security headers
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

module.exports = {
  sanitizeNoSQL,
  sanitizeXSS,
  preventParameterPollution,
  securityHeaders
};
