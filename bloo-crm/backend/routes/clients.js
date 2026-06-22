const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const { verifyToken, verifyOwnership } = require('../middleware/auth');
const { validators, handleValidationErrors } = require('../middleware/validation');
const { successResponse, paginatedResponse } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');
const { NotFoundError, ValidationError } = require('../utils/errors');

// All routes require authentication
router.use(verifyToken);

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
