const rateLimit = require('express-rate-limit');

// Auth limiter: 5 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: {
    error: 'TOO_MANY_LOGIN_ATTEMPTS',
    message: 'Too many login attempts. Please try again in 15 minutes.'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: (req) => {
    // Skip if user is already authenticated
    return req.user ? true : false;
  },
  keyGenerator: (req) => {
    // Use IP as key for login attempts
    return req.ip || req.connection.remoteAddress;
  },
  handler: (req, res) => {
    return res.status(429).json({
      error: 'TOO_MANY_LOGIN_ATTEMPTS',
      message: 'Too many login attempts. Please try again in 15 minutes.',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

// General API rate limiter: 100 requests per minute per user
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests. Please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.userId || req.ip || req.connection.remoteAddress;
  },
  skip: (req) => {
    // Skip rate limiting for health check
    return req.path === '/health';
  },
  handler: (req, res) => {
    return res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please slow down.',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

// Payment limiter: 10 requests per minute per user (strict)
const paymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 attempts
  message: {
    error: 'PAYMENT_RATE_LIMIT_EXCEEDED',
    message: 'Too many payment attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.userId || req.ip || req.connection.remoteAddress;
  },
  handler: (req, res) => {
    return res.status(429).json({
      error: 'PAYMENT_RATE_LIMIT_EXCEEDED',
      message: 'Too many payment attempts. Please try again later.',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

// Search limiter: 30 requests per minute per user
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 searches
  message: {
    error: 'SEARCH_RATE_LIMIT_EXCEEDED',
    message: 'Too many search requests. Please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.userId || req.ip || req.connection.remoteAddress;
  },
  handler: (req, res) => {
    return res.status(429).json({
      error: 'SEARCH_RATE_LIMIT_EXCEEDED',
      message: 'Too many search requests. Please slow down.',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

// File upload limiter: 20 uploads per hour per user
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads
  message: {
    error: 'UPLOAD_RATE_LIMIT_EXCEEDED',
    message: 'Too many file uploads. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.userId || req.ip || req.connection.remoteAddress;
  },
  handler: (req, res) => {
    return res.status(429).json({
      error: 'UPLOAD_RATE_LIMIT_EXCEEDED',
      message: 'Too many file uploads. Please try again later.',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

module.exports = {
  authLimiter,
  apiLimiter,
  paymentLimiter,
  searchLimiter,
  uploadLimiter
};
