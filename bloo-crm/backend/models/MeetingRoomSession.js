const mongoose = require('mongoose');

const meetingRoomSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // Session Information
    sessionId: {
      type: String,
      unique: true,
      required: true
    },
    sessionToken: {
      type: String,
      required: true,
      select: false
    },
    sessionSecret: {
      type: String,
      select: false
    },

    // Meeting Provider Details
    provider: {
      type: String,
      enum: ['zoom', 'teams', 'google_meet', 'jitsi', 'webex', 'custom'],
      required: true
    },
    providerMeetingId: String,
    providerApiKey: {
      type: String,
      select: false
    },
    providerApiSecret: {
      type: String,
      select: false
    },

    // Meeting Configuration
    meetingTitle: String,
    meetingDescription: String,
    scheduledStartTime: Date,
    actualStartTime: Date,
    scheduledEndTime: Date,
    actualEndTime: Date,
    duration: Number, // in minutes
    maxParticipants: Number,
    recordingEnabled: Boolean,
    waitingRoomEnabled: Boolean,

    // Session Security
    encryptionEnabled: {
      type: Boolean,
      default: true
    },
    encryptionLevel: {
      type: String,
      enum: ['basic', 'standard', 'enterprise'],
      default: 'enterprise'
    },
    accessCode: String,
    requiresPassword: {
      type: Boolean,
      default: true
    },
    sessionPassword: {
      type: String,
      select: false
    },

    // Connection Details
    connectionUrl: String,
    joinUrl: String,
    webrtcConfig: {
      iceServers: [
        {
          urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302']
        }
      ],
      sdpTransform: String
    },

    // Participants
    participants: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        email: String,
        name: String,
        joinedAt: Date,
        leftAt: Date,
        role: {
          type: String,
          enum: ['host', 'presenter', 'guest'],
          default: 'guest'
        },
        isActive: Boolean,
        videoEnabled: Boolean,
        audioEnabled: Boolean,
        screenShareActive: Boolean,
        duration: Number
      }
    ],

    // Session State
    status: {
      type: String,
      enum: ['scheduled', 'initializing', 'active', 'on_hold', 'ending', 'ended', 'failed'],
      default: 'scheduled',
      index: true
    },
    isLocked: Boolean,
    lockReason: String,

    // Monitoring & Metrics
    metrics: {
      totalConnections: { type: Number, default: 0 },
      totalDisconnections: { type: Number, default: 0 },
      averageLatency: Number,
      packetLoss: Number,
      bandwidth: {
        upload: Number,
        download: Number
      },
      recordingStatus: String,
      recordingFileSize: Number
    },

    // Session Persistence (keeping alive between interactions)
    keepAliveInterval: { type: Number, default: 30 },
    lastHeartbeat: Date,
    reconnectAttempts: { type: Number, default: 0 },
    maxReconnectAttempts: { type: Number, default: 5 },

    // Client Details
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      index: true
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      index: true
    },

    // Audit Fields
    createdBy: mongoose.Schema.Types.ObjectId,
    modifiedBy: mongoose.Schema.Types.ObjectId,
    endedBy: mongoose.Schema.Types.ObjectId,
    logoutWarningShown: Boolean,
    logoutWarningTimestamp: Date,

    // Notes & Metadata
    notes: String,
    tags: [String],
    customFields: mongoose.Schema.Types.Mixed
  },
  {
    timestamps: true,
    collection: 'meeting_room_sessions'
  }
);

// Indexes
meetingRoomSessionSchema.index({ userId: 1, status: 1 });
meetingRoomSessionSchema.index({ sessionId: 1 });
meetingRoomSessionSchema.index({ provider: 1 });
meetingRoomSessionSchema.index({ actualStartTime: -1 });
meetingRoomSessionSchema.index({ 'participants.userId': 1 });

// Methods
meetingRoomSessionSchema.methods.addParticipant = function (participantData) {
  const participant = {
    userId: participantData.userId,
    email: participantData.email,
    name: participantData.name,
    joinedAt: new Date(),
    role: participantData.role || 'guest',
    isActive: true,
    videoEnabled: participantData.videoEnabled !== false,
    audioEnabled: participantData.audioEnabled !== false
  };

  this.participants.push(participant);
  this.metrics.totalConnections += 1;
  this.lastHeartbeat = new Date();

  return this.save();
};

meetingRoomSessionSchema.methods.removeParticipant = function (userId) {
  const participant = this.participants.find(p => p.userId.toString() === userId.toString());

  if (participant) {
    participant.leftAt = new Date();
    participant.isActive = false;
    participant.duration = Math.floor((participant.leftAt - participant.joinedAt) / 1000 / 60);
    this.metrics.totalDisconnections += 1;
  }

  return this.save();
};

meetingRoomSessionSchema.methods.updateMetrics = function (newMetrics) {
  Object.assign(this.metrics, newMetrics);
  this.lastHeartbeat = new Date();
  return this.save();
};

meetingRoomSessionSchema.methods.toggleSessionLock = function (shouldLock, reason = null) {
  this.isLocked = shouldLock;
  this.lockReason = reason;
  return this.save();
};

meetingRoomSessionSchema.methods.endSession = function (endedBy) {
  this.actualEndTime = new Date();
  this.status = 'ended';
  this.endedBy = endedBy;

  // Mark all active participants as left
  this.participants.forEach(participant => {
    if (participant.isActive) {
      participant.leftAt = new Date();
      participant.isActive = false;
      participant.duration = Math.floor((participant.leftAt - participant.joinedAt) / 1000 / 60);
    }
  });

  return this.save();
};

meetingRoomSessionSchema.methods.recordHeartbeat = function () {
  this.lastHeartbeat = new Date();
  return this.save();
};

meetingRoomSessionSchema.methods.isSessionActive = function () {
  return this.status === 'active' && !this.isLocked;
};

meetingRoomSessionSchema.methods.canReconnect = function () {
  return this.reconnectAttempts < this.maxReconnectAttempts;
};

// Statics
meetingRoomSessionSchema.statics.findActiveSession = function (userId) {
  return this.findOne({
    userId,
    status: 'active',
    isLocked: { $ne: true }
  });
};

meetingRoomSessionSchema.statics.findUserSessions = function (userId, filters = {}) {
  return this.find({ userId, ...filters }).sort({ actualStartTime: -1 });
};

meetingRoomSessionSchema.statics.findSessionsByProvider = function (provider, filters = {}) {
  return this.find({ provider, ...filters }).sort({ createdAt: -1 });
};

meetingRoomSessionSchema.statics.cleanupExpiredSessions = function (hoursOld = 24) {
  const cutoffTime = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
  return this.updateMany(
    { actualEndTime: { $lt: cutoffTime }, status: 'ended' },
    { archived: true }
  );
};

module.exports = mongoose.model('MeetingRoomSession', meetingRoomSessionSchema);
