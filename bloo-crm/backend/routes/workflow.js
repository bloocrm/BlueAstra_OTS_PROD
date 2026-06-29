const express = require('express');
const router = express.Router();
const Workflow = require('../models/Workflow');
const { verifyToken, verifyOwnership } = require('../middleware/auth');
const { validators, handleValidationErrors } = require('../middleware/validation');
const { successResponse, paginatedResponse } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');
const { NotFoundError, ValidationError } = require('../utils/errors');

router.use(verifyToken);

// GET /api/workflows - Get all workflows
router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, type, status, search } = req.query;

  const filter = { userId: req.userId, deletedAt: null };

  if (type && ['automated', 'manual', 'email_sequence', 'ai_driven', 'event_triggered'].includes(type)) {
    filter.type = type;
  }

  if (status && ['draft', 'active', 'paused', 'completed', 'archived'].includes(status)) {
    filter.status = status;
  }

  if (search) {
    filter.$text = { $search: search };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const workflows = await Workflow.find(filter)
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  const total = await Workflow.countDocuments(filter);

  return paginatedResponse(
    res,
    workflows,
    page,
    limit,
    total,
    'Workflows retrieved successfully'
  );
}));

// GET /api/workflows/:id - Get specific workflow
router.get('/:id', validators.idParam, handleValidationErrors, asyncHandler(async (req, res) => {
  const workflow = await Workflow.findOne({
    _id: req.params.id,
    userId: req.userId,
    deletedAt: null
  });

  if (!workflow) {
    throw new NotFoundError('Workflow');
  }

  return successResponse(res, workflow, 'Workflow retrieved successfully');
}));

// POST /api/workflows - Create new workflow
router.post('/', asyncHandler(async (req, res) => {
  const { name, type, steps } = req.body;

  if (!name || !type) {
    throw new ValidationError('Name and type are required');
  }

  if (!['automated', 'manual', 'email_sequence', 'ai_driven', 'event_triggered'].includes(type)) {
    throw new ValidationError('Invalid workflow type');
  }

  const allowedFields = [
    'name', 'description', 'type', 'status', 'triggers', 'conditions',
    'steps', 'aiSettings', 'targetEntity', 'targetClients', 'targetLeads',
    'schedule', 'tags', 'notes', 'customFields'
  ];

  const workflowData = {};
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      workflowData[field] = req.body[field];
    }
  });

  workflowData.userId = req.userId;
  workflowData.createdBy = req.userId;
  workflowData.status = workflowData.status || 'draft';

  const workflow = new Workflow(workflowData);
  await workflow.save();

  return successResponse(
    res,
    workflow,
    'Workflow created successfully',
    201
  );
}));

// PUT /api/workflows/:id - Update workflow
router.put('/:id', validators.idParam, handleValidationErrors, asyncHandler(async (req, res) => {
  await verifyOwnership(Workflow, req.params.id, req.userId);

  const allowedFields = [
    'name', 'description', 'status', 'triggers', 'conditions',
    'steps', 'aiSettings', 'targetEntity', 'targetClients', 'targetLeads',
    'schedule', 'tags', 'notes', 'customFields'
  ];

  const updateData = {};
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  updateData.modifiedBy = req.userId;

  const updatedWorkflow = await Workflow.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  );

  return successResponse(
    res,
    updatedWorkflow,
    'Workflow updated successfully'
  );
}));

// PATCH /api/workflows/:id/activate - Activate workflow
router.patch('/:id/activate', validators.idParam, handleValidationErrors, asyncHandler(async (req, res) => {
  await verifyOwnership(Workflow, req.params.id, req.userId);

  const workflow = await Workflow.findById(req.params.id);

  if (!workflow.steps || workflow.steps.length === 0) {
    throw new ValidationError('Workflow must have at least one step before activation');
  }

  const updatedWorkflow = await Workflow.findByIdAndUpdate(
    req.params.id,
    { status: 'active', modifiedBy: req.userId },
    { new: true }
  );

  return successResponse(
    res,
    updatedWorkflow,
    'Workflow activated successfully'
  );
}));

// PATCH /api/workflows/:id/deactivate - Deactivate workflow
router.patch('/:id/deactivate', validators.idParam, handleValidationErrors, asyncHandler(async (req, res) => {
  await verifyOwnership(Workflow, req.params.id, req.userId);

  const updatedWorkflow = await Workflow.findByIdAndUpdate(
    req.params.id,
    { status: 'paused', modifiedBy: req.userId },
    { new: true }
  );

  return successResponse(
    res,
    updatedWorkflow,
    'Workflow deactivated successfully'
  );
}));

// POST /api/workflows/:id/execute - Execute workflow for an entity
router.post('/:id/execute', validators.idParam, handleValidationErrors, asyncHandler(async (req, res) => {
  const { entityId, entityType } = req.body;

  if (!entityId || !entityType) {
    throw new ValidationError('Entity ID and type are required');
  }

  if (!['Client', 'Lead'].includes(entityType)) {
    throw new ValidationError('Invalid entity type. Must be Client or Lead');
  }

  await verifyOwnership(Workflow, req.params.id, req.userId);

  const workflow = await Workflow.findById(req.params.id);

  if (workflow.status !== 'active') {
    throw new ValidationError('Workflow must be active to execute');
  }

  const result = await workflow.recordExecution(
    entityId,
    entityType,
    'in_progress'
  );

  return successResponse(
    res,
    result,
    'Workflow execution started'
  );
}));

// DELETE /api/workflows/:id - Soft delete workflow
router.delete('/:id', validators.idParam, handleValidationErrors, asyncHandler(async (req, res) => {
  await verifyOwnership(Workflow, req.params.id, req.userId);

  const deletedWorkflow = await Workflow.findByIdAndUpdate(
    req.params.id,
    { deletedAt: new Date() },
    { new: true }
  );

  return successResponse(
    res,
    deletedWorkflow,
    'Workflow deleted successfully'
  );
}));

// GET /api/workflows/active/all - Get all active workflows
router.get('/active/all', asyncHandler(async (req, res) => {
  const activeWorkflows = await Workflow.findActive(req.userId);

  return successResponse(
    res,
    activeWorkflows,
    'Active workflows retrieved successfully'
  );
}));

// GET /api/workflows/type/:type - Get workflows by type
router.get('/type/:type', asyncHandler(async (req, res) => {
  const validTypes = ['automated', 'manual', 'email_sequence', 'ai_driven', 'event_triggered'];
  if (!validTypes.includes(req.params.type)) {
    throw new ValidationError(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
  }

  const workflows = await Workflow.findByType(req.userId, req.params.type);

  return successResponse(
    res,
    workflows,
    `${req.params.type} workflows retrieved successfully`
  );
}));

// GET /api/workflows/:id/metrics - Get workflow performance metrics
router.get('/:id/metrics', validators.idParam, handleValidationErrors, asyncHandler(async (req, res) => {
  const workflow = await Workflow.findOne({
    _id: req.params.id,
    userId: req.userId,
    deletedAt: null
  });

  if (!workflow) {
    throw new NotFoundError('Workflow');
  }

  const metrics = {
    totalExecutions: workflow.metrics.totalExecutions,
    successfulExecutions: workflow.metrics.successfulExecutions,
    failedExecutions: workflow.metrics.failedExecutions,
    successRate: workflow.getSuccessRate(),
    lastExecutedAt: workflow.metrics.lastExecutedAt,
    engagementRate: workflow.metrics.engagementRate,
    conversionRate: workflow.metrics.conversionRate
  };

  return successResponse(
    res,
    metrics,
    'Workflow metrics retrieved successfully'
  );
}));

module.exports = router;
