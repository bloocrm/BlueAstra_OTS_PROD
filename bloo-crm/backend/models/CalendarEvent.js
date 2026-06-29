const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    allDay: {
      type: Boolean,
      default: false
    },
    location: {
      type: String,
      trim: true
    },
    attendees: [{
      email: String,
      name: String,
      status: {
        type: String,
        enum: ['accepted', 'declined', 'tentative', 'noResponse'],
        default: 'noResponse'
      }
    }],
    color: {
      type: String,
      default: '#667eea'
    },
    recurrence: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly'],
      default: 'none'
    },
    recurrenceEnd: Date,
    reminder: {
      type: String,
      enum: ['none', '0', '5', '15', '30', '60', '1440'],
      default: 'none'
    },
    calendarId: {
      type: String,
      required: true
    },
    connectionId: {
      type: String,
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    provider: {
      type: String,
      enum: [
        'calendly', 'google-calendar', 'outlook-calendar', 'apple-calendar',
        'zoom', 'monday', 'asana', 'trello', 'microsoft-teams', 'slack', 'notion'
      ],
      required: true
    },
    externalId: {
      type: String,
      trim: true
    },
    externalUrl: {
      type: String,
      trim: true
    },
    isRecurringInstance: {
      type: Boolean,
      default: false
    },
    parentEventId: mongoose.Schema.Types.ObjectId,
    status: {
      type: String,
      enum: ['confirmed', 'tentative', 'cancelled'],
      default: 'confirmed'
    },
    syncedAt: Date,
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Index for efficient queries
calendarEventSchema.index({ userId: 1, startDate: 1, endDate: 1 });
calendarEventSchema.index({ userId: 1, provider: 1, connectionId: 1 });
calendarEventSchema.index({ externalId: 1, provider: 1 });
calendarEventSchema.index({ userId: 1, createdAt: -1 });

// Virtual for duration in minutes
calendarEventSchema.virtual('durationMinutes').get(function() {
  return Math.round((this.endDate - this.startDate) / (1000 * 60));
});

module.exports = mongoose.model('CalendarEvent', calendarEventSchema);
