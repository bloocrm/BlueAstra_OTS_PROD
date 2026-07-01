const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Unique, human-readable meeting id (e.g. MTG-3F9A2B1C)
const generateMeetingId = () => `MTG-${uuidv4().split('-')[0].toUpperCase()}`;

const meetingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    meetingId: {
      type: String,
      unique: true,
      index: true,
      default: generateMeetingId
    },
    title: { type: String, default: 'Meeting', trim: true, index: true },
    agenda: String,
    provider: String,
    providerName: String,
    clientName: String,
    clientEmail: { type: String, index: true },
    attendees: [String],
    startTime: { type: Date, index: true },
    endTime: Date,
    status: { type: String, default: 'active' },
    meetingUrl: String,   // host (moderator) link
    guestUrl: String,     // guest (lobby) link
    minutes: String,      // meeting minutes text
    transcript: String,   // written transcript (populated once the recording pipeline is wired)
    recordingUrl: String  // link to the compressed recording (S3/GridFS) once available
  },
  { timestamps: true }
);

meetingSchema.index({ userId: 1, startTime: -1 });

module.exports = mongoose.model('Meeting', meetingSchema);
