const express = require('express');
const router = express.Router();
const Compliance = require('../models/Compliance');
const { verifyToken, verifyOwnership } = require('../middleware/auth');
const { validators, handleValidationErrors } = require('../middleware/validation');
const { successResponse, paginatedResponse } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');
const { NotFoundError, ValidationError } = require('../utils/errors');

router.use(verifyToken);

// GET /api/compliance - Get all compliance records
router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, framework, status, riskLevel } = req.query;

  const filter = { userId: req.userId, deletedAt: null };

  if (framework) {
    filter.framework = framework;
  }

  if (status && ['not_started', 'in_progress', 'completed', 'non_compliant', 'exempt'].includes(status)) {
    filter.status = status;
  }

  if (riskLevel && ['low', 'medium', 'high', 'critical'].includes(riskLevel)) {
    filter.riskLevel = riskLevel;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const compliances = await Compliance.find(filter)
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ nextReviewDate: 1 });

  const total = await Compliance.countDocuments(filter);

  return paginatedResponse(
    res,
    compliances,
    page,
    limit,
    total,
    'Compliance records retrieved successfully'
  );
}));

// GET /api/compliance/:id - Get specific compliance record
router.get('/:id', validators.idParam, handleValidationErrors, asyncHandler(async (req, res) => {
  const compliance = await Compliance.findOne({
    _id: req.params.id,
    userId: req.userId,
    deletedAt: null
  });

  if (!compliance) {
    throw new NotFoundError('Compliance record');
  }

  return successResponse(res, compliance, 'Compliance record retrieved successfully');
}));

// POST /api/compliance - Create new compliance record
router.post('/', asyncHandler(async (req, res) => {
  const { framework, requirement, applicableRegions, applicableCountries } = req.body;

  if (!framework || !requirement) {
    throw new ValidationError('Framework and requirement are required');
  }

  const validFrameworks = [
    'SOC2', 'ISO27001', 'GDPR', 'CCPA', 'HIPAA', 'PCI-DSS',
    'SEC', 'FINRA', 'FATCA', 'CRS', 'SOX', 'MiFID',
    'ASIC', 'RBI', 'AFM', 'FCA', 'BaFin', 'CNB'
  ];

  if (!validFrameworks.includes(framework)) {
    throw new ValidationError(`Invalid framework. Must be one of: ${validFrameworks.join(', ')}`);
  }

  const allowedFields = [
    'framework', 'requirement', 'description', 'applicableRegions', 'applicableCountries',
    'status', 'startDate', 'targetCompletionDate', 'documentationUrl', 'attachments',
    'riskLevel', 'riskMitigation', 'remediationRequired', 'remediationDeadline',
    'clientId', 'relatedCompliances', 'notes', 'tags', 'customFields'
  ];

  const complianceData = {};
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      complianceData[field] = req.body[field];
    }
  });

  complianceData.userId = req.userId;
  complianceData.createdBy = req.userId;
  complianceData.status = complianceData.status || 'not_started';
  complianceData.riskLevel = complianceData.riskLevel || 'medium';

  const compliance = new Compliance(complianceData);
  await compliance.save();

  return successResponse(
    res,
    compliance,
    'Compliance record created successfully',
    201
  );
}));

// PUT /api/compliance/:id - Update compliance record
router.put('/:id', validators.idParam, handleValidationErrors, asyncHandler(async (req, res) => {
  await verifyOwnership(Compliance, req.params.id, req.userId);

  const allowedFields = [
    'requirement', 'description', 'applicableRegions', 'applicableCountries',
    'status', 'complianceLevel', 'targetCompletionDate', 'documentationUrl', 'attachments',
    'riskLevel', 'riskMitigation', 'remediationRequired', 'remediationDeadline',
    'relatedCompliances', 'notes', 'tags', 'customFields'
  ];

  const updateData = {};
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  updateData.modifiedBy = req.userId;

  if (req.body.status === 'completed') {
    updateData.actualCompletionDate = new Date();
    updateData.complianceLevel = 100;
  }

  const updatedCompliance = await Compliance.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  );

  return successResponse(
    res,
    updatedCompliance,
    'Compliance record updated successfully'
  );
}));

// PATCH /api/compliance/:id/status - Update compliance status
router.patch('/:id/status', validators.idParam, handleValidationErrors, asyncHandler(async (req, res) => {
  const { status, notes } = req.body;

  if (!status || !['not_started', 'in_progress', 'completed', 'non_compliant', 'exempt'].includes(status)) {
    throw new ValidationError('Valid status is required');
  }

  await verifyOwnership(Compliance, req.params.id, req.userId);

  const compliance = await Compliance.findById(req.params.id);
  await compliance.updateStatus(status, notes);

  return successResponse(
    res,
    compliance,
    `Compliance status updated to ${status}`
  );
}));

// DELETE /api/compliance/:id - Soft delete compliance record
router.delete('/:id', validators.idParam, handleValidationErrors, asyncHandler(async (req, res) => {
  await verifyOwnership(Compliance, req.params.id, req.userId);

  const deletedCompliance = await Compliance.findByIdAndUpdate(
    req.params.id,
    { deletedAt: new Date() },
    { new: true }
  );

  return successResponse(
    res,
    deletedCompliance,
    'Compliance record deleted successfully'
  );
}));

// GET /api/compliance/at-risk - Get compliance records at risk
router.get('/at-risk/records', asyncHandler(async (req, res) => {
  const atRiskCompliances = await Compliance.findAtRisk(req.userId);

  return successResponse(
    res,
    atRiskCompliances,
    'At-risk compliance records retrieved successfully'
  );
}));

// GET /api/compliance/incomplete - Get incomplete compliance records
router.get('/incomplete/records', asyncHandler(async (req, res) => {
  const incompleteCompliances = await Compliance.findIncomplete(req.userId);

  return successResponse(
    res,
    incompleteCompliances,
    'Incomplete compliance records retrieved successfully'
  );
}));

// GET /api/compliance/summary - Get compliance summary
router.get('/summary/by-status', asyncHandler(async (req, res) => {
  const summary = await Compliance.getComplianceSummary(req.userId);

  const formattedSummary = {
    not_started: 0,
    in_progress: 0,
    completed: 0,
    non_compliant: 0,
    exempt: 0
  };

  summary.forEach(item => {
    if (formattedSummary[item._id] !== undefined) {
      formattedSummary[item._id] = item.count;
    }
  });

  return successResponse(
    res,
    formattedSummary,
    'Compliance summary retrieved successfully'
  );
}));

module.exports = router;
