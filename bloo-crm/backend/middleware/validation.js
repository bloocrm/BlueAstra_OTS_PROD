/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
const { body, query, param, validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');

// Validation result handler middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }
  next();
};

// Common field validators
const validators = {
  // Client validators
  client: {
    create: [
      body('name').optional().isString().withMessage('Name must be a string').trim().escape(),
      body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
      body('phone').isMobilePhone().withMessage('Valid phone number is required'),
      body('company').optional().trim().escape(),
      body('jobTitle').optional().trim().escape(),
      body('ssn').optional().trim().matches(/^\d{3}-\d{2}-\d{4}$/).withMessage('SSN format: XXX-XX-XXXX'),
      body('spouseName').optional().trim().escape(),
      body('childrenNames').optional().trim().escape(),
      body('beneficiaries').optional().isArray().withMessage('Beneficiaries must be an array'),
      body('insuranceDetails').optional().trim().escape(),
      body('investmentAccounts').optional().isArray().withMessage('Investment accounts must be an array'),
      body('officeAddress').optional().trim().escape(),
      body('homeAddress').optional().trim().escape(),
      body('accountants').optional().isArray().withMessage('Accountants must be an array'),
      body('attorneys').optional().isArray().withMessage('Attorneys must be an array')
    ],
    update: [
      body('subject').optional().isString().withMessage('Subject must be a string').trim().escape(),
      body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
      body('phone').optional().isMobilePhone().withMessage('Valid phone number is required'),
      body('company').optional().trim().escape(),
      body('jobTitle').optional().trim().escape(),
      body('ssn').optional().trim().matches(/^\d{3}-\d{2}-\d{4}$/).withMessage('SSN format: XXX-XX-XXXX'),
      body('spouseName').optional().trim().escape(),
      body('childrenNames').optional().trim().escape(),
      body('beneficiaries').optional().isArray().withMessage('Beneficiaries must be an array'),
      body('insuranceDetails').optional().trim().escape(),
      body('investmentAccounts').optional().isArray().withMessage('Investment accounts must be an array'),
      body('officeAddress').optional().trim().escape(),
      body('homeAddress').optional().trim().escape(),
      body('accountants').optional().isArray().withMessage('Accountants must be an array'),
      body('attorneys').optional().isArray().withMessage('Attorneys must be an array')
    ]
  },

  // Lead validators
  lead: {
    create: [
      body('name').notEmpty().trim().escape().withMessage('Name is required'),
      body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
      body('phone').isMobilePhone().withMessage('Valid phone number is required'),
      body('company').optional().trim().escape(),
      body('status').isIn(['new', 'qualified', 'interested', 'negotiating', 'converted', 'lost']).withMessage('Invalid status'),
      body('source').optional().trim().escape(),
      body('investmentAmount').optional().isFloat({ min: 0 }).withMessage('Investment amount must be positive')
    ],
    update: [
      body('name').optional().isString().withMessage('Name must be a string').trim().escape(),
      body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
      body('phone').optional().isMobilePhone().withMessage('Valid phone number is required'),
      body('company').optional().trim().escape(),
      body('status').optional().isIn(['new', 'qualified', 'interested', 'negotiating', 'converted', 'lost']).withMessage('Invalid status'),
      body('source').optional().trim().escape(),
      body('investmentAmount').optional().isFloat({ min: 0 }).withMessage('Investment amount must be positive')
    ]
  },

  // Communication validators
  communication: {
    create: [
      body('type').isIn(['email', 'phone', 'meeting', 'message']).withMessage('Valid type is required'),
      body('subject').notEmpty().trim().escape().withMessage('Subject is required'),
      body('content').notEmpty().trim().escape().withMessage('Content is required'),
      body('clientId').notEmpty().isMongoId().withMessage('Valid client ID is required'),
      body('status').optional().isIn(['draft', 'sent', 'scheduled', 'completed']).withMessage('Invalid status')
    ],
    update: [
      body('type').optional().isIn(['email', 'phone', 'meeting', 'message']).withMessage('Valid type is required'),
      body('subject').optional().isString().withMessage('Subject must be a string').trim().escape(),
      body('content').optional().isString().withMessage('Content must be a string').trim().escape(),
      body('status').optional().isIn(['draft', 'sent', 'scheduled', 'completed']).withMessage('Invalid status')
    ]
  },

  // Pagination validators
  pagination: [
    query('page').optional().isInt({ min: 1 }).toInt().withMessage('Page must be >= 1'),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt().withMessage('Limit must be 1-100'),
    query('sort').optional().trim().escape()
  ],

  // Search validators
  search: [
    query('q').optional().trim().escape().isLength({ min: 1, max: 100 }).withMessage('Search must be 1-100 chars'),
    query('page').optional().isInt({ min: 1 }).toInt().withMessage('Page must be >= 1'),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt().withMessage('Limit must be 1-50')
  ],

  // ID validators
  idParam: [
    param('id').isMongoId().withMessage('Invalid resource ID')
  ]
};

module.exports = {
  handleValidationErrors,
  validators
};
