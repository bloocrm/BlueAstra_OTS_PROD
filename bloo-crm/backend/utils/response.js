/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
const { v4: uuidv4 } = require('uuid');

// Standardized API response formatter
class ApiResponse {
  constructor(data = null, message = '', statusCode = 200) {
    this.success = statusCode < 400;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.requestId = uuidv4();
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      success: this.success,
      message: this.message,
      data: this.data,
      requestId: this.requestId,
      timestamp: this.timestamp,
      statusCode: this.statusCode
    };
  }
}

// Success response
const successResponse = (res, data, message = 'Operation successful', statusCode = 200) => {
  const response = new ApiResponse(data, message, statusCode);
  return res.status(statusCode).json(response);
};

// Error response
const errorResponse = (res, error, statusCode = 500, message = 'An error occurred') => {
  // Don't expose internal error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';

  const response = new ApiResponse(
    null,
    isDevelopment ? error.message : message,
    statusCode
  );

  // Log full error for debugging but don't send to client
  if (isDevelopment) {
    console.error('Error:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      requestId: response.requestId
    });
  }

  return res.status(statusCode).json(response);
};

// Paginated response
const paginatedResponse = (res, data, page = 1, limit = 10, total = 0, message = 'Retrieved successfully') => {
  const response = new ApiResponse(data, message, 200);
  response.pagination = {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    pages: Math.ceil(total / limit)
  };
  return res.status(200).json(response);
};

module.exports = {
  ApiResponse,
  successResponse,
  errorResponse,
  paginatedResponse
};
