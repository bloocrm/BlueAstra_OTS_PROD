/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
const express = require('express');
const router = express.Router();
const MeetingRoomSession = require('../models/MeetingRoomSession');
const User = require('../models/User');
const { verifyToken, verifyOwnership } = require('../middleware/auth');
const { successResponse, paginatedResponse } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');
const { ValidationError, NotFoundError } = require('../utils/errors');
const crypto = require('crypto');
const WebexMeetingService = require('../services/webexMeetingService');
const emailService = require('../utils/email-service');
const CalendarEvent = require('../models/CalendarEvent');

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
    // No active session is a normal state, not a server error.
    return successResponse(res, null, 'No active meeting room session');
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

// =====================================================
// CISCO WEBEX SPECIFIC ENDPOINTS
// =====================================================

// POST /api/meeting-rooms/create-webex - Create persistent Webex meeting
router.post('/create-webex', asyncHandler(async (req, res) => {
  const {
    meetingTitle,
    meetingDescription,
    startTime,
    duration,
    participantEmails = [],
    clientId,
    leadId,
    clientEmail
  } = req.body;

  if (!meetingTitle) {
    throw new ValidationError('Meeting title is required');
  }

  if (!startTime || !duration) {
    throw new ValidationError('Start time and duration are required');
  }

  try {
    const user = await User.findById(req.userId);

    const sessionId = crypto.randomBytes(16).toString('hex');
    const sessionToken = crypto.randomBytes(32).toString('hex');

    const webexConfig = {
      title: meetingTitle,
      description: meetingDescription || `Meeting created by ${user.name}`,
      startTime,
      duration,
      participantEmails
    };

    // Try the real Webex API; if WEBEX_API_TOKEN isn't configured (the service
    // constructor throws) or the API call fails, fall back to an internal
    // meeting-room link so the flow still works and invites still go out.
    let webexMeeting;
    let webexLive = false;
    try {
      const webexService = new WebexMeetingService();
      webexMeeting = await webexService.createMeeting(webexConfig);
      webexLive = true;
    } catch (webexErr) {
      console.warn('Webex API unavailable, using internal meeting link:', webexErr.message);
      const base = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
      webexMeeting = {
        webexMeetingId: null,
        webexMeetingNumber: null,
        meetingUrl: `${base}/pages/meeting-room.html?sessionId=${sessionId}&token=${sessionToken}`,
        joinPassword: Math.random().toString(36).slice(-8),
        sipAddress: null
      };
    }

    // Create session in MongoDB
    const sessionData = {
      userId: req.userId,
      sessionId,
      sessionToken,
      sessionSecret: crypto.randomBytes(32).toString('hex'),
      provider: 'webex',
      meetingTitle,
      meetingDescription,
      status: 'active',
      webexMeetingId: webexMeeting.webexMeetingId,
      webexMeetingNumber: webexMeeting.webexMeetingNumber,
      webexSipAddress: webexMeeting.sipAddress,
      meetingUrl: webexMeeting.meetingUrl,
      meetingPassword: webexMeeting.joinPassword,
      organizerEmail: user.email,
      organizerName: user.name,
      participantEmails,
      linkedClientEmail: clientEmail,
      scheduledStartTime: new Date(startTime),
      duration,
      recordingEnabled: true,
      encryptionEnabled: true,
      encryptionLevel: 'enterprise',
      clientId,
      leadId,
      createdBy: req.userId,
      lastHeartbeat: new Date()
    };

    const session = new MeetingRoomSession(sessionData);
    await session.save();

    // Email the meeting invite to the client + all participants (non-fatal)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const recipients = [...new Set(
      [clientEmail, ...(participantEmails || [])]
        .filter(e => e && emailRegex.test(String(e).trim()))
        .map(e => String(e).trim().toLowerCase())
    )];

    // Store the meeting as a calendar event so it appears on the calendar (non-fatal)
    try {
      await CalendarEvent.create({
        userId: req.userId,
        title: meetingTitle,
        description: meetingDescription || '',
        startDate: new Date(startTime),
        endDate: new Date(new Date(startTime).getTime() + (parseInt(duration) || 60) * 60000),
        location: webexMeeting.meetingUrl || '',
        attendees: recipients.map(e => ({ email: e })),
        connectionId: 'meeting-room',
        calendarId: 'meeting-room',
        provider: 'webex',
        color: '#00A1F3',
        status: 'confirmed'
      });
    } catch (calErr) {
      console.error('Failed to add Webex meeting to calendar:', calErr.message);
    }

    let invitesSent = 0;
    await Promise.all(recipients.map(async (email) => {
      try {
        const result = await emailService.sendMeetingInvite({
          meetingTitle,
          providerName: 'Cisco Webex',
          clientName: email.split('@')[0],
          clientEmail: email,
          agenda: meetingDescription || `Meeting: ${meetingTitle}`,
          senderEmail: user.email,
          senderName: user.name || 'Bloo CRM',
          meetingTime: new Date(startTime).toLocaleString(),
          meetingUrl: webexMeeting.meetingUrl,
          meetingPassword: webexMeeting.joinPassword || null,
          duration,
          record: true
        });
        if (result && result.success && !result.mock) invitesSent++;
      } catch (mailErr) {
        console.error(`Failed to email invite to ${email}:`, mailErr.message);
      }
    }));

    return successResponse(
      res,
      {
        success: true,
        sessionId: session.sessionId,
        meetingTitle: meetingTitle,
        webexLive,
        webexMeetingId: webexMeeting.webexMeetingId,
        webexMeetingNumber: webexMeeting.webexMeetingNumber,
        meetingUrl: webexMeeting.meetingUrl,
        joinPassword: webexMeeting.joinPassword,
        sipAddress: webexMeeting.sipAddress,
        invitesSent,
        invitesAttempted: recipients.length,
        message: webexLive
          ? 'Webex meeting created successfully'
          : 'Meeting created with an internal link (set WEBEX_API_TOKEN for a real Webex meeting)'
      },
      'Webex meeting created successfully',
      201
    );
  } catch (error) {
    console.error('Error creating Webex meeting:', error);
    throw new Error(`Failed to create Webex meeting: ${error.message}`);
  }
}));

// POST /api/meeting-rooms/:sessionId/end-meeting - End persistent Webex meeting
router.post('/:sessionId/end-meeting', asyncHandler(async (req, res) => {
  const { endReason } = req.body;

  const session = await MeetingRoomSession.findOne({
    sessionId: req.params.sessionId,
    userId: req.userId
  });

  if (!session) {
    throw new NotFoundError('Meeting room session');
  }

  if (session.provider !== 'webex') {
    throw new ValidationError('This endpoint only supports Webex meetings');
  }

  try {
    // End meeting via Webex API
    const webexService = new WebexMeetingService();
    await webexService.endMeeting(session.webexMeetingId);

    // End session in MongoDB
    await session.endSession(req.userId);

    // Calculate actual duration
    const durationMinutes = Math.floor(
      (session.actualEndTime - session.actualStartTime) / 1000 / 60
    );

    // Get recordings if available
    let recordings = [];
    try {
      recordings = await webexService.getMeetingRecordings(session.webexMeetingId);
    } catch (err) {
      console.log('Recording retrieval not available yet');
    }

    return successResponse(
      res,
      {
        success: true,
        sessionId: session.sessionId,
        meetingEnded: true,
        duration: durationMinutes,
        participantCount: session.participants.filter(p => p.isActive === false).length,
        recordings: recordings.length > 0 ? recordings : null,
        message: 'Meeting ended successfully'
      },
      'Meeting ended successfully'
    );
  } catch (error) {
    console.error('Error ending Webex meeting:', error);
    throw new Error(`Failed to end meeting: ${error.message}`);
  }
}));

// GET /api/meeting-rooms/:sessionId/meeting-status - Get current meeting status
router.get('/:sessionId/meeting-status', asyncHandler(async (req, res) => {
  const session = await MeetingRoomSession.findOne({
    sessionId: req.params.sessionId,
    userId: req.userId
  });

  if (!session) {
    throw new NotFoundError('Meeting room session');
  }

  if (session.provider !== 'webex') {
    throw new ValidationError('This endpoint only supports Webex meetings');
  }

  // Calculate current duration if meeting is active
  let currentDuration = 0;
  if (session.status === 'active' && session.actualStartTime) {
    currentDuration = Math.floor((Date.now() - session.actualStartTime) / 1000 / 60);
  }

  return successResponse(
    res,
    {
      sessionId: session.sessionId,
      status: session.status,
      meetingId: session.webexMeetingId,
      meetingNumber: session.webexMeetingNumber,
      participants: session.participants.map(p => ({
        email: p.email,
        name: p.name,
        joinedAt: p.joinedAt,
        isActive: p.isActive,
        role: p.role
      })),
      duration: currentDuration,
      recordingStatus: session.metrics.recordingStatus,
      totalParticipants: session.participants.length,
      activeParticipants: session.participants.filter(p => p.isActive).length
    },
    'Meeting status retrieved successfully'
  );
}));

// POST /api/meeting-rooms/:sessionId/add-participant - Add participant during meeting
router.post('/:sessionId/add-participant', asyncHandler(async (req, res) => {
  const { email, name } = req.body;

  if (!email) {
    throw new ValidationError('Participant email is required');
  }

  const session = await MeetingRoomSession.findOne({
    sessionId: req.params.sessionId,
    userId: req.userId
  });

  if (!session) {
    throw new NotFoundError('Meeting room session');
  }

  if (session.provider !== 'webex') {
    throw new ValidationError('This endpoint only supports Webex meetings');
  }

  try {
    // Add participant via Webex API
    const webexService = new WebexMeetingService();
    const participant = await webexService.addParticipant(
      session.webexMeetingId,
      email,
      name
    );

    // Store in session
    if (!session.participantEmails.includes(email)) {
      session.participantEmails.push(email);
      await session.save();
    }

    return successResponse(
      res,
      {
        success: true,
        email,
        name,
        message: 'Participant invitation sent successfully'
      },
      'Participant added successfully'
    );
  } catch (error) {
    console.error('Error adding participant:', error);
    throw new Error(`Failed to add participant: ${error.message}`);
  }
}));

module.exports = router;
