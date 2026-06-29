const { errorResponse } = require('../utils/response');
const { AppError } = require('../utils/errors');

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  // Attach request ID to error for logging
  err.requestId = req.requestId;

  // Log error details (except in tests)
  if (process.env.NODE_ENV !== 'test') {
    console.error('[ERROR]', {
      requestId: req.requestId,
      statusCode: err.statusCode || 500,
      message: err.message,
      code: err.code,
      path: req.path,
      method: req.method,
      userId: req.userId || 'anonymous',
      timestamp: new Date().toISOString(),
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }

  // Handle custom application errors
  if (err instanceof AppError) {
    return errorResponse(
      res,
      err,
      err.statusCode,
      err.message
    );
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors)
      .map(e => e.message)
      .join(', ');
    return errorResponse(
      res,
      new Error(message),
      400,
      'Validation failed'
    );
  }

  // Handle Mongoose duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return errorResponse(
      res,
      new Error(`${field} already exists`),
      409,
      'Resource already exists'
    );
  }

  // Handle Mongoose cast errors
  if (err.name === 'CastError') {
    return errorResponse(
      res,
      new Error('Invalid resource ID'),
      400,
      'Invalid resource ID'
    );
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(
      res,
      new Error('Invalid authentication token'),
      401,
      'Invalid authentication token'
    );
  }

  if (err.name === 'TokenExpiredError') {
    return errorResponse(
      res,
      new Error('Authentication token has expired'),
      401,
      'Authentication token has expired'
    );
  }

  // Handle multer file upload errors
  if (err.name === 'MulterError') {
    let message = 'File upload failed';
    if (err.code === 'FILE_TOO_LARGE') {
      message = 'File size exceeds maximum allowed';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files uploaded';
    }
    return errorResponse(
      res,
      new Error(message),
      400,
      message
    );
  }

  // Handle generic errors
  const statusCode = err.statusCode || 500;
  const isDevelopment = process.env.NODE_ENV === 'development';
  const message = isDevelopment
    ? err.message
    : 'An internal error occurred. Please try again later.';

  return errorResponse(
    res,
    new Error(message),
    statusCode,
    message
  );
};

// 404 Not Found handler
const notFoundHandler = (req, res) => {
  return res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: 'The requested resource was not found',
    path: req.path,
    method: req.method,
    statusCode: 404,
    timestamp: new Date().toISOString()
  });
};

// Async error wrapper for route handlers
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler
};
