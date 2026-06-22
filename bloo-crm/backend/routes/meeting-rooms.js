const express = require('express');
const router = express.Router();
const MeetingRoomSession = require('../models/MeetingRoomSession');
const User = require('../models/User');
const { verifyToken, verifyOwnership } = require('../middleware/auth');
const { successResponse, paginatedResponse } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');
const { ValidationError, NotFoundError } = require('../utils/errors');
const crypto = require('crypto');

router.use(verifyToken);

// POST /api/meeting-rooms/session - Create new meeting room session
router.post('/session', asyncHandler(async (req, res) => {
  const { provider, meetingTitle, providerApiKey, clientId, leadId, maxParticipants } = req.body;

  if (!provider || !['zoom', 'teams', 'google_meet', 'jitsi', 'webex', 'custom'].includes(provider)) {
    throw new ValidationError('Valid provider is required');
  }

  if (!meetingTitle) {
    throw new ValidationError('Meeting title is required');
  }

  // Check for existing active session
  const existingSession = await MeetingRoomSession.findActiveSession(req.userId);
  if (existingSession) {
    return successResponse(
      res,
      existingSession,
      'Active session already exists. Returning existing session.'
    );
  }

  const sessionId = crypto.randomBytes(16).toString('hex');
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const sessionPassword = Math.random().toString(36).slice(-10);

  const sessionData = {
    userId: req.userId,
    sessionId,
    sessionToken,
    sessionSecret: crypto.randomBytes(32).toString('hex'),
    provider,
    meetingTitle,
    meetingDescription: req.body.meetingDescription,
    status: 'initializing',
    encryptionEnabled: true,
    encryptionLevel: 'enterprise',
    sessionPassword,
    requiresPassword: true,
    maxParticipants: maxParticipants || 100,
    recordingEnabled: req.body.recordingEnabled !== false,
    waitingRoomEnabled: req.body.waitingRoomEnabled !== false,
    clientId,
    leadId,
    createdBy: req.userId
  };

  if (providerApiKey) {
    sessionData.providerApiKey = providerApiKey;
  }

  const session = new MeetingRoomSession(sessionData);
  await session.save();

  // Generate connection details
  const connectionUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/meeting-room?sessionId=${sessionId}&token=${sessionToken}`;

  await session.updateOne({ connectionUrl, joinUrl: connectionUrl });

  return successResponse(
    res,
    {
      sessionId: session.sessionId,
      joinUrl: connectionUrl,
      sessionPassword: sessionPassword,
      encryptionLevel: session.encryptionLevel,
      provider: session.provider,
      status: 'active'
    },
    'Meeting room session created successfully',
    201
  );
}));

// GET /api/meeting-rooms/active - Get active session
router.get('/active', asyncHandler(async (req, res) => {
  const session = await MeetingRoomSession.findActiveSession(req.userId);

  if (!session) {
    throw new NotFoundError('Active meeting room session');
  }

  // Record heartbeat
  await session.recordHeartbeat();

  return successResponse(
    res,
    session,
    'Active meeting room session retrieved'
  );
}));

// GET /api/meeting-rooms/sessions - Get all sessions for user
router.get('/sessions', asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;

  const filter = { userId: req.userId };

  if (status && ['scheduled', 'active', 'ended', 'failed'].includes(status)) {
    filter.status = status;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const sessions = await MeetingRoomSession.findUserSessions(req.userId, filter)
    .skip(skip)
    .limit(parseInt(limit));

  const total = await MeetingRoomSession.countDocuments(filter);

  return paginatedResponse(
    res,
    sessions,
    page,
    limit,
    total,
    'Meeting room sessions retrieved successfully'
  );
}));

// POST /api/meeting-rooms/:sessionId/join - Join meeting room
router.post('/:sessionId/join', asyncHandler(async (req, res) => {
  const { sessionToken, sessionPassword } = req.body;

  const session = await MeetingRoomSession.findOne({
    sessionId: req.params.sessionId,
    userId: req.userId
  });

  if (!session) {
    throw new NotFoundError('Meeting room session');
  }

  if (!session.isSessionActive()) {
    throw new ValidationError('Meeting room session is not active');
  }

  if (session.requiresPassword && session.sessionPassword !== sessionPassword) {
    throw new ValidationError('Invalid session password');
  }

  const user = await User.findById(req.userId);

  await session.addParticipant({
    userId: req.userId,
    email: user.email,
    name: user.name,
    role: 'participant',
    videoEnabled: true,
    audioEnabled: true
  });

  return successResponse(
    res,
    {
      sessionId: session.sessionId,
      provider: session.provider,
      status: 'connected',
      encryptionLevel: session.encryptionLevel,
      metrics: session.metrics,
      participants: session.participants
    },
    'Successfully joined meeting room'
  );
}));

// POST /api/meeting-rooms/:sessionId/heartbeat - Send heartbeat
router.post('/:sessionId/heartbeat', asyncHandler(async (req, res) => {
  const session = await MeetingRoomSession.findOne({
    sessionId: req.params.sessionId,
    userId: req.userId
  });

  if (!session) {
    throw new NotFoundError('Meeting room session');
  }

  const { metrics } = req.body;

  if (metrics) {
    await session.updateMetrics(metrics);
  } else {
    await session.recordHeartbeat();
  }

  return successResponse(
    res,
    { status: 'heartbeat_received', sessionActive: session.isSessionActive() },
    'Heartbeat recorded successfully'
  );
}));

// POST /api/meeting-rooms/:sessionId/leave - Leave meeting room
router.post('/:sessionId/leave', asyncHandler(async (req, res) => {
  const session = await MeetingRoomSession.findOne({
    sessionId: req.params.sessionId,
    userId: req.userId
  });

  if (!session) {
    throw new NotFoundError('Meeting room session');
  }

  await session.removeParticipant(req.userId);

  return successResponse(
    res,
    { status: 'left_meeting', sessionId: session.sessionId },
    'Successfully left meeting room'
  );
}));

// POST /api/meeting-rooms/:sessionId/end - End meeting room session
router.post('/:sessionId/end', asyncHandler(async (req, res) => {
  const session = await MeetingRoomSession.findOne({
    sessionId: req.params.sessionId,
    userId: req.userId
  });

  if (!session) {
    throw new NotFoundError('Meeting room session');
  }

  await session.endSession(req.userId);

  return successResponse(
    res,
    {
      sessionId: session.sessionId,
      status: 'ended',
      duration: session.duration,
      participants: session.participants.length
    },
    'Meeting room session ended successfully'
  );
}));

// POST /api/meeting-rooms/:sessionId/lock - Lock/unlock session
router.post('/:sessionId/lock', asyncHandler(async (req, res) => {
  const { shouldLock, reason } = req.body;

  const session = await MeetingRoomSession.findOne({
    sessionId: req.params.sessionId,
    userId: req.userId
  });

  if (!session) {
    throw new NotFoundError('Meeting room session');
  }

  await session.toggleSessionLock(shouldLock, reason);

  return successResponse(
    res,
    { isLocked: session.isLocked, reason: session.lockReason },
    `Meeting room ${shouldLock ? 'locked' : 'unlocked'} successfully`
  );
}));

// POST /api/meeting-rooms/:sessionId/warn-logout - Warn user about logout
router.post('/:sessionId/warn-logout', asyncHandler(async (req, res) => {
  const session = await MeetingRoomSession.findOne({
    sessionId: req.params.sessionId,
    userId: req.userId
  });

  if (!session) {
    throw new NotFoundError('Meeting room session');
  }

  await session.updateOne({
    logoutWarningShown: true,
    logoutWarningTimestamp: new Date()
  });

  return successResponse(
    res,
    { warningShown: true, message: 'You are about to log out. This will terminate your meeting session.' },
    'Logout warning shown'
  );
}));

// GET /api/meeting-rooms/:sessionId/recording - Get recording status
router.get('/:sessionId/recording', asyncHandler(async (req, res) => {
  const session = await MeetingRoomSession.findOne({
    sessionId: req.params.sessionId,
    userId: req.userId
  });

  if (!session) {
    throw new NotFoundError('Meeting room session');
  }

  return successResponse(
    res,
    {
      recordingEnabled: session.recordingEnabled,
      recordingStatus: session.metrics.recordingStatus,
      fileSize: session.metrics.recordingFileSize
    },
    'Recording status retrieved successfully'
  );
}));

// GET /api/meeting-rooms/:sessionId/participants - Get participants
router.get('/:sessionId/participants', asyncHandler(async (req, res) => {
  const session = await MeetingRoomSession.findOne({
    sessionId: req.params.sessionId,
    userId: req.userId
  });

  if (!session) {
    throw new NotFoundError('Meeting room session');
  }

  return successResponse(
    res,
    session.participants,
    'Participants retrieved successfully'
  );
}));

module.exports = router;
