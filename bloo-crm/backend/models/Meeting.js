/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
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
    advisorName: String,
    agenda: String,
    provider: String,
    providerName: String,
    clientName: String,
    clientEmail: { type: String, index: true },
    attendees: [String],
    startTime: { type: Date, index: true },
    endTime: Date,
    durationMinutes: Number,
    status: { type: String, default: 'active' },
    room: { type: String, index: true },  // meeting room slug (matches JaaS webhook fqn)
    meetingUrl: String,   // host (moderator) link
    guestUrl: String,     // guest (lobby) link
    minutes: String,      // meeting minutes text
    transcript: String,   // written transcript (speech-to-text)
    summary: String,      // short summary of the transcript
    recordingUrl: String  // link to the compressed recording (S3/GridFS) once available
  },
  { timestamps: true }
);

meetingSchema.index({ userId: 1, startTime: -1 });

module.exports = mongoose.model('Meeting', meetingSchema);
