/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
const express = require('express');
const router = express.Router();
const Communication = require('../models/Communication');
const Client = require('../models/Client');
const Lead = require('../models/Lead');
const { verifyToken, verifyOwnership } = require('../middleware/auth');
const { validators, handleValidationErrors } = require('../middleware/validation');
const { successResponse, paginatedResponse } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');
const { NotFoundError, ValidationError } = require('../utils/errors');

router.use(verifyToken);

// GET /api/communications - Get all communications for the user
router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, type, status, clientId, leadId } = req.query;

  const filter = { userId: req.userId, deletedAt: null };

  if (type && ['email', 'phone', 'meeting', 'message', 'sms'].includes(type)) {
    filter.type = type;
  }

  if (status && ['draft', 'scheduled', 'sent', 'failed', 'completed'].includes(status)) {
    filter.status = status;
  }

  if (clientId) {
    filter.clientId = clientId;
  }

  if (leadId) {
    filter.leadId = leadId;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const communications = await Communication.find(filter)
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  const total = await Communication.countDocuments(filter);

  return paginatedResponse(
    res,
    communications,
    page,
    limit,
    total,
    'Communications retrieved successfully'
  );
}));

// GET /api/communications/:id - Get specific communication
router.get('/:id', validators.idParam, handleValidationErrors, asyncHandler(async (req, res) => {
  const communication = await Communication.findOne({
    _id: req.params.id,
    userId: req.userId,
    deletedAt: null
  });

  if (!communication) {
    throw new NotFoundError('Communication');
  }

  return successResponse(res, communication, 'Communication retrieved successfully');
}));

// POST /api/communications - Create new communication
router.post(
  '/',
  validators.communication.create,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const allowedFields = [
      'type', 'subject', 'content', 'clientId', 'leadId',
      'fromEmail', 'toEmail', 'ccEmail', 'bccEmail',
      'fromPhone', 'toPhone', 'meetingDate', 'meetingDuration',
      'meetingLocation', 'status', 'priority', 'outcome',
      'followUpRequired', 'followUpDate', 'attachments',
      'tags', 'notes', 'customFields'
    ];

    const commData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        commData[field] = req.body[field];
      }
    });

    commData.userId = req.userId;
    commData.createdBy = req.userId;
    commData.status = commData.status || 'draft';

    const communication = new Communication(commData);
    await communication.save();

    return successResponse(
      res,
      communication,
      'Communication created successfully',
      201
    );
  })
);

// PUT /api/communications/:id - Update communication
router.put(
  '/:id',
  validators.idParam,
  validators.communication.update,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    await verifyOwnership(Communication, req.params.id, req.userId);

    const allowedFields = [
      'type', 'subject', 'content', 'status', 'priority',
      'fromEmail', 'toEmail', 'ccEmail', 'bccEmail',
      'fromPhone', 'toPhone', 'meetingDate', 'meetingDuration',
      'meetingLocation', 'outcome', 'followUpRequired', 'followUpDate',
      'attachments', 'tags', 'notes', 'customFields'
    ];

    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    if (req.body.status === 'sent' && !updateData.sentAt) {
      updateData.sentAt = new Date();
    }

    if (req.body.status === 'completed' && !updateData.respondedAt) {
      updateData.respondedAt = new Date();
    }

    const updatedCommunication = await Communication.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    return successResponse(
      res,
      updatedCommunication,
      'Communication updated successfully'
    );
  })
);

// PATCH /api/communications/:id/send - Send/schedule communication
router.patch('/:id/send', validators.idParam, handleValidationErrors, asyncHandler(async (req, res) => {
  await verifyOwnership(Communication, req.params.id, req.userId);

  const communication = await Communication.findById(req.params.id);

  if (!communication.subject || !communication.content) {
    throw new ValidationError('Subject and content are required to send');
  }

  if (communication.type === 'email' && !communication.toEmail) {
    throw new ValidationError('Recipient email is required');
  }

  if (communication.type === 'phone' && !communication.toPhone) {
    throw new ValidationError('Recipient phone is required');
  }

  const updateData = {
    status: 'sent',
    sentAt: new Date()
  };

  const updatedCommunication = await Communication.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true }
  );

  return successResponse(
    res,
    updatedCommunication,
    `Communication sent successfully`
  );
}));

// DELETE /api/communications/:id - Soft delete communication
router.delete('/:id', validators.idParam, handleValidationErrors, asyncHandler(async (req, res) => {
  await verifyOwnership(Communication, req.params.id, req.userId);

  const deletedCommunication = await Communication.findByIdAndUpdate(
    req.params.id,
    { deletedAt: new Date() },
    { new: true }
  );

  return successResponse(
    res,
    deletedCommunication,
    'Communication deleted successfully'
  );
}));

// GET /api/communications/client/:clientId - Get all communications for a client
router.get('/client/:clientId', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  await verifyOwnership(Client, req.params.clientId, req.userId);

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const communications = await Communication.findByClient(req.userId, req.params.clientId);

  return paginatedResponse(
    res,
    communications.slice(skip, skip + parseInt(limit)),
    page,
    limit,
    communications.length,
    'Client communications retrieved successfully'
  );
}));

// GET /api/communications/lead/:leadId - Get all communications for a lead
router.get('/lead/:leadId', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  await verifyOwnership(Lead, req.params.leadId, req.userId);

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const communications = await Communication.findByLead(req.userId, req.params.leadId);

  return paginatedResponse(
    res,
    communications.slice(skip, skip + parseInt(limit)),
    page,
    limit,
    communications.length,
    'Lead communications retrieved successfully'
  );
}));

module.exports = router;
