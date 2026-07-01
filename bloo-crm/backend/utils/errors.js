/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
// Custom application error classes

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp
    };
  }
}

// Authentication errors
class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

// Authorization errors
class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

// Validation errors
class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      details: this.details
    };
  }
}

// Not found errors
class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

// Conflict errors (e.g., duplicate)
class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

// Rate limit errors
class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

// Database errors
class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, 500, 'DATABASE_ERROR');
  }
}

// Payment errors
class PaymentError extends AppError {
  constructor(message = 'Payment processing failed') {
    super(message, 402, 'PAYMENT_FAILED');
  }
}

module.exports = {
  AppError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  PaymentError
};
