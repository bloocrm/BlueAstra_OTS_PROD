/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const { verifyToken, verifyOwnership } = require('../middleware/auth');
const { validators, handleValidationErrors } = require('../middleware/validation');
const { successResponse, paginatedResponse } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');
const { NotFoundError, ValidationError } = require('../utils/errors');

router.use(verifyToken);

// GET /api/leads - Get all leads for the user
router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, search } = req.query;

  const filter = { userId: req.userId, deletedAt: null };

  if (status && ['new', 'qualified', 'interested', 'negotiating', 'converted', 'lost'].includes(status)) {
    filter.status = status;
  }

  if (search) {
    filter.$text = { $search: search };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const leads = await Lead.find(filter)
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  const total = await Lead.countDocuments(filter);

  return paginatedResponse(
    res,
    leads,
    page,
    limit,
    total,
    'Leads retrieved successfully'
  );
}));

// GET /api/leads/:id - Get specific lead
router.get('/:id', validators.idParam, handleValidationErrors, asyncHandler(async (req, res) => {
  const lead = await Lead.findOne({
    _id: req.params.id,
    userId: req.userId,
    deletedAt: null
  });

  if (!lead) {
    throw new NotFoundError('Lead');
  }

  return successResponse(res, lead, 'Lead retrieved successfully');
}));

// POST /api/leads - Create new lead (validations removed for free-form upload)
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const allowedFields = [
      'name', 'email', 'phone', 'company', 'jobTitle',
      'status', 'source', 'score', 'investmentAmount', 'budget',
      'estimatedValue', 'currency', 'description', 'industry',
      'businessType', 'companySize', 'location',
      'relatedClientId', 'tags', 'notes', 'customFields'
    ];

    const leadData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        leadData[field] = req.body[field];
      }
    });

    leadData.userId = req.userId;
    leadData.createdBy = req.userId;

    const lead = new Lead(leadData);
    await lead.save();

    return successResponse(
      res,
      lead,
      'Lead created successfully',
      201
    );
  })
);

// PUT /api/leads/:id - Update lead (validations removed for free-form upload)
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    await verifyOwnership(Lead, req.params.id, req.userId);

    const allowedFields = [
      'name', 'email', 'phone', 'company', 'jobTitle',
      'status', 'source', 'score', 'investmentAmount', 'budget',
      'estimatedValue', 'currency', 'description', 'industry',
      'businessType', 'companySize', 'location',
      'lastContactedAt', 'nextFollowUpAt', 'followUpNotes', 'conversationHistory',
      'relatedClientId', 'convertedAt', 'convertedToClientId',
      'tags', 'notes', 'customFields'
    ];

    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    updateData.modifiedBy = req.userId;

    const updatedLead = await Lead.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    return successResponse(
      res,
      updatedLead,
      'Lead updated successfully'
    );
  })
);

// PATCH /api/leads/:id/status - Update lead status
router.patch('/:id/status', validators.idParam, handleValidationErrors, asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!status || !['new', 'qualified', 'interested', 'negotiating', 'converted', 'lost'].includes(status)) {
    throw new ValidationError('Valid status is required');
  }

  await verifyOwnership(Lead, req.params.id, req.userId);

  const updateData = {
    status,
    modifiedBy: req.userId
  };

  if (status === 'converted') {
    updateData.convertedAt = new Date();
  }

  const updatedLead = await Lead.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true }
  );

  return successResponse(
    res,
    updatedLead,
    `Lead status updated to ${status}`
  );
}));

// DELETE /api/leads/:id - Soft delete lead
router.delete('/:id', validators.idParam, handleValidationErrors, asyncHandler(async (req, res) => {
  await verifyOwnership(Lead, req.params.id, req.userId);

  const deletedLead = await Lead.findByIdAndUpdate(
    req.params.id,
    {
      deletedAt: new Date(),
      deletedBy: req.userId
    },
    { new: true }
  );

  return successResponse(
    res,
    deletedLead,
    'Lead deleted successfully'
  );
}));

// POST /api/leads/:id/conversation - Add conversation to lead
router.post('/:id/conversation', validators.idParam, handleValidationErrors, asyncHandler(async (req, res) => {
  await verifyOwnership(Lead, req.params.id, req.userId);

  const { type, message, outcome } = req.body;

  if (!type || !message) {
    throw new ValidationError('Type and message are required');
  }

  const lead = await Lead.findById(req.params.id);
  lead.conversationHistory.push({
    date: new Date(),
    type,
    message,
    outcome
  });

  lead.lastContactedAt = new Date();
  if (req.body.nextFollowUpAt) {
    lead.nextFollowUpAt = new Date(req.body.nextFollowUpAt);
  }

  await lead.save();

  return successResponse(
    res,
    lead.conversationHistory[lead.conversationHistory.length - 1],
    'Conversation logged successfully',
    201
  );
}));

// GET /api/leads/by-status/:status - Get leads by status
router.get('/by-status/:status', asyncHandler(async (req, res) => {
  const validStatuses = ['new', 'qualified', 'interested', 'negotiating', 'converted', 'lost'];
  if (!validStatuses.includes(req.params.status)) {
    throw new ValidationError('Invalid status');
  }

  const leads = await Lead.findByStatus(req.userId, req.params.status).sort({ score: -1 });

  return successResponse(
    res,
    leads,
    `Leads with status "${req.params.status}" retrieved successfully`
  );
}));

module.exports = router;
