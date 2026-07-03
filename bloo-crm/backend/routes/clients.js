/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const { verifyToken, verifyOwnership, requirePermission } = require('../middleware/auth');
const { validators, handleValidationErrors } = require('../middleware/validation');
const { successResponse, paginatedResponse } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');
const { NotFoundError, ValidationError } = require('../utils/errors');
const mongoose = require('mongoose');
const Email = require('../models/Email');
const Communication = require('../models/Communication');
const MeetingRoomSession = require('../models/MeetingRoomSession');

// All routes require authentication
router.use(verifyToken);
router.use(requirePermission('clients'));

// GET /api/clients - Get all clients for the user
router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, search } = req.query;

  const filter = { userId: req.userId, deletedAt: null };

  if (status && ['active', 'inactive', 'prospect', 'archived'].includes(status)) {
    filter.status = status;
  }

  if (search) {
    filter.$text = { $search: search };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const clients = await Client.find(filter)
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  const total = await Client.countDocuments(filter);

  return paginatedResponse(
    res,
    clients,
    page,
    limit,
    total,
    'Clients retrieved successfully'
  );
}));

// GET /api/clients/:id - Get specific client
router.get('/:id', validators.idParam, handleValidationErrors, asyncHandler(async (req, res) => {
  const client = await Client.findOne({
    _id: req.params.id,
    userId: req.userId,
    deletedAt: null
  });

  if (!client) {
    throw new NotFoundError('Client');
  }

  return successResponse(res, client, 'Client retrieved successfully');
}));

// =====================================================
// PER-CLIENT CONSOLIDATION (emails + meetings)
// =====================================================

async function resolveClientContext(req) {
  let client = null;
  if (mongoose.Types.ObjectId.isValid(req.params.id)) {
    client = await Client.findOne({
      _id: req.params.id,
      userId: req.userId,
      deletedAt: null
    });
  }
  const email = ((client && client.email) || req.query.email || '').toString().toLowerCase().trim();
  const name = ((client && client.name) || req.query.name || '').toString().trim();
  return { client, email, name };
}

function prettyProvider(p) {
  const map = { zoom: 'Zoom', teams: 'Microsoft Teams', google_meet: 'Google Meet', jitsi: 'Jitsi', webex: 'Webex', custom: 'Meeting' };
  return map[p] || (p ? p.charAt(0).toUpperCase() + p.slice(1) : 'Meeting');
}

// GET /api/clients/:id/emails - consolidated emails for a client
router.get('/:id/emails', asyncHandler(async (req, res) => {
  const { client, email } = await resolveClientContext(req);
  if (!client && !email) throw new NotFoundError('Client');

  const results = [];

  if (email) {
    const emails = await Email.find({
      userId: req.userId,
      deletedAt: null,
      $or: [
        { 'from.email': email },
        { 'to.email': email },
        { 'cc.email': email }
      ]
    }).sort({ receivedDate: -1, createdAt: -1 }).limit(500).lean();

    emails.forEach(e => results.push({
      id: String(e._id),
      source: 'mailbox',
      clientId: client ? String(client._id) : null,
      subject: e.subject || '(no subject)',
      from: (e.from && e.from.email) || '',
      to: (e.to && e.to[0] && e.to[0].email) || '',
      cc: (e.cc || []).map(c => c.email).filter(Boolean).join(', '),
      date: e.receivedDate || e.sentDate || e.createdAt,
      folder: e.folder || 'inbox',
      body: e.bodyPlain || e.body || ''
    }));
  }

  if (client) {
    const comms = await Communication.find({
      userId: req.userId,
      clientId: client._id,
      type: 'email'
    }).sort({ sentAt: -1, createdAt: -1 }).limit(500).lean();

    comms.forEach(c => results.push({
      id: String(c._id),
      source: 'logged',
      clientId: String(client._id),
      subject: c.subject || 'Logged email',
      from: c.fromEmail || '',
      to: c.toEmail || email || '',
      cc: (c.ccEmail || []).join(', '),
      date: c.sentAt || c.createdAt,
      folder: 'logged',
      body: c.content || ''
    }));
  }

  results.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  return successResponse(res, {
    clientId: client ? String(client._id) : req.params.id,
    matchedEmail: email || null,
    count: results.length,
    emails: results
  }, 'Client emails retrieved successfully');
}));

// GET /api/clients/:id/meetings - consolidated meetings for a client
router.get('/:id/meetings', asyncHandler(async (req, res) => {
  const { client, email, name } = await resolveClientContext(req);
  if (!client && !email && !name) throw new NotFoundError('Client');

  const results = [];

  const sessionOr = [];
  if (client) sessionOr.push({ clientId: client._id });
  if (email) {
    sessionOr.push({ linkedClientEmail: email });
    sessionOr.push({ organizerEmail: email });
    sessionOr.push({ participantEmails: email });
  }
  if (sessionOr.length) {
    const sessions = await MeetingRoomSession.find({
      userId: req.userId,
      $or: sessionOr
    }).sort({ scheduledStartTime: -1, createdAt: -1 }).limit(500).lean();

    sessions.forEach(m => results.push({
      id: String(m._id),
      source: 'session',
      clientId: client ? String(client._id) : null,
      title: m.meetingTitle || 'Meeting',
      clientName: name || m.organizerName || '',
      clientEmail: m.linkedClientEmail || m.organizerEmail || '',
      provider: m.provider,
      providerName: prettyProvider(m.provider),
      startTime: m.scheduledStartTime || m.actualStartTime || m.createdAt,
      status: m.status || 'ended',
      meetingUrl: m.meetingUrl || '',
      record: !!m.recordingUrl
    }));
  }

  if (client) {
    const comms = await Communication.find({
      userId: req.userId,
      clientId: client._id,
      type: 'meeting'
    }).sort({ meetingDate: -1, createdAt: -1 }).limit(500).lean();

    comms.forEach(c => results.push({
      id: String(c._id),
      source: 'logged',
      clientId: String(client._id),
      title: c.subject || 'Meeting',
      clientName: name || '',
      clientEmail: c.toEmail || email || '',
      provider: 'logged',
      providerName: 'Logged',
      startTime: c.meetingDate || c.createdAt,
      status: c.status || 'completed',
      meetingUrl: c.meetingLocation || '',
      record: false
    }));
  }

  results.sort((a, b) => new Date(b.startTime || 0) - new Date(a.startTime || 0));

  return successResponse(res, {
    clientId: client ? String(client._id) : req.params.id,
    matchedEmail: email || null,
    count: results.length,
    meetings: results
  }, 'Client meetings retrieved successfully');
}));


// POST /api/clients - Create new client
router.post(
  '/',
  validators.client.create,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const allowedFields = [
      'name', 'email', 'phone', 'company', 'jobTitle',
      'ssn', 'driverLicense', 'passport',
      'spouseName', 'childrenNames', 'beneficiaries', 'insuranceDetails',
      'investmentAccounts', 'homeAddress', 'officeAddress',
      'accountants', 'attorneys', 'documents',
      'annualIncome', 'netWorth', 'investmentPreference',
      'status', 'riskProfile', 'communicationPreference',
      'notes', 'tags', 'customFields'
    ];

    const clientData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        clientData[field] = req.body[field];
      }
    });

    clientData.userId = req.userId;
    clientData.createdBy = req.userId;

    const client = new Client(clientData);
    await client.save();

    return successResponse(
      res,
      client,
      'Client created successfully',
      201
    );
  })
);

// PUT /api/clients/:id - Update client
router.put(
  '/:id',
  validators.idParam,
  validators.client.update,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    await verifyOwnership(Client, req.params.id, req.userId);

    const allowedFields = [
      'name', 'email', 'phone', 'company', 'jobTitle',
      'ssn', 'driverLicense', 'passport',
      'spouseName', 'childrenNames', 'beneficiaries', 'insuranceDetails',
      'investmentAccounts', 'homeAddress', 'officeAddress',
      'accountants', 'attorneys', 'documents',
      'annualIncome', 'netWorth', 'investmentPreference',
      'status', 'riskProfile', 'communicationPreference',
      'notes', 'tags', 'customFields'
    ];

    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    updateData.modifiedBy = req.userId;

    const updatedClient = await Client.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    return successResponse(
      res,
      updatedClient,
      'Client updated successfully'
    );
  })
);

// DELETE /api/clients/:id - Soft delete client
router.delete('/:id', validators.idParam, handleValidationErrors, asyncHandler(async (req, res) => {
  await verifyOwnership(Client, req.params.id, req.userId);

  const deletedClient = await Client.findByIdAndUpdate(
    req.params.id,
    {
      deletedAt: new Date(),
      deletedBy: req.userId
    },
    { new: true }
  );

  return successResponse(
    res,
    deletedClient,
    'Client deleted successfully'
  );
}));

// POST /api/clients/:id/documents - Add document to client
router.post('/:id/documents', validators.idParam, handleValidationErrors, asyncHandler(async (req, res) => {
  await verifyOwnership(Client, req.params.id, req.userId);

  const { name, type, fileUrl, description } = req.body;

  if (!name || !type || !fileUrl) {
    throw new ValidationError('Document name, type, and fileUrl are required');
  }

  if (!['pdf', 'word', 'image', 'excel', 'text'].includes(type)) {
    throw new ValidationError('Invalid document type');
  }

  const client = await Client.findById(req.params.id);
  const document = {
    name,
    type,
    fileUrl,
    description,
    uploadedAt: new Date()
  };

  client.documents.push(document);
  await client.save();

  return successResponse(
    res,
    document,
    'Document added successfully',
    201
  );
}));

// DELETE /api/clients/:clientId/documents/:docIndex - Remove document
router.delete('/:clientId/documents/:docIndex', asyncHandler(async (req, res) => {
  await verifyOwnership(Client, req.params.clientId, req.userId);

  const client = await Client.findById(req.params.clientId);
  const docIndex = parseInt(req.params.docIndex);

  if (isNaN(docIndex) || docIndex < 0 || docIndex >= client.documents.length) {
    throw new ValidationError('Invalid document index');
  }

  client.documents.splice(docIndex, 1);
  await client.save();

  return successResponse(res, null, 'Document removed successfully');
}));

module.exports = router;
