/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   CALENDAR EVENT API ROUTES
   ===================================================== */

const express = require('express');
const router = express.Router();
const CalendarEvent = require('../models/CalendarEvent');

// Create new event
router.post('/calendar/events', async (req, res) => {
  try {
    const { userId, title, description, startDate, endDate, allDay, location, attendees, color, recurrence, recurrenceEnd, reminder, connectionId, provider, calendarId } = req.body;

    if (!userId || !title || !startDate || !endDate || !connectionId || !provider) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['userId', 'title', 'startDate', 'endDate', 'connectionId', 'provider']
      });
    }

    const event = new CalendarEvent({
      title,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      allDay: allDay || false,
      location,
      attendees: attendees || [],
      color: color || '#667eea',
      recurrence: recurrence || 'none',
      recurrenceEnd: recurrenceEnd ? new Date(recurrenceEnd) : null,
      reminder: reminder || 'none',
      connectionId,
      provider,
      userId,
      calendarId,
      status: 'confirmed',
      syncedAt: new Date()
    });

    await event.save();

    res.status(201).json({
      status: 'success',
      message: 'Event created successfully',
      event: event.toJSON()
    });
  } catch (error) {
    console.error('Event creation error:', error);
    res.status(500).json({
      error: 'Failed to create event',
      message: error.message
    });
  }
});

// Get events for user
router.get('/calendar/events', async (req, res) => {
  try {
    const { userId, from, to, connectionId, provider, status } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    let query = { userId };

    if (connectionId) query.connectionId = connectionId;
    if (provider) query.provider = provider;
    if (status) query.status = status;

    if (from || to) {
      query.startDate = {};
      if (from) query.startDate.$gte = new Date(from);
      if (to) query.startDate.$lte = new Date(to);
    }

    const events = await CalendarEvent.find(query)
      .sort({ startDate: 1 })
      .lean();

    res.json({
      status: 'success',
      count: events.length,
      events
    });
  } catch (error) {
    console.error('Failed to fetch events:', error);
    res.status(500).json({
      error: 'Failed to fetch events',
      message: error.message
    });
  }
});

// Get single event
router.get('/calendar/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await CalendarEvent.findById(eventId);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({
      status: 'success',
      event: event.toJSON()
    });
  } catch (error) {
    console.error('Failed to fetch event:', error);
    res.status(500).json({
      error: 'Failed to fetch event',
      message: error.message
    });
  }
});

// Update event
router.put('/calendar/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const updateData = req.body;

    // Don't allow direct modification of certain fields
    delete updateData._id;
    delete updateData.userId;
    delete updateData.createdAt;

    if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
    if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);
    if (updateData.recurrenceEnd) updateData.recurrenceEnd = new Date(updateData.recurrenceEnd);

    updateData.updatedAt = new Date();

    const event = await CalendarEvent.findByIdAndUpdate(
      eventId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({
      status: 'success',
      message: 'Event updated successfully',
      event: event.toJSON()
    });
  } catch (error) {
    console.error('Event update error:', error);
    res.status(500).json({
      error: 'Failed to update event',
      message: error.message
    });
  }
});

// Delete event
router.delete('/calendar/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await CalendarEvent.findByIdAndDelete(eventId);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({
      status: 'success',
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Event deletion error:', error);
    res.status(500).json({
      error: 'Failed to delete event',
      message: error.message
    });
  }
});

// Get events by date range
router.get('/calendar/events-range', async (req, res) => {
  try {
    const { userId, from, to } = req.query;

    if (!userId || !from || !to) {
      return res.status(400).json({
        error: 'userId, from, and to are required'
      });
    }

    const events = await CalendarEvent.find({
      userId,
      startDate: { $gte: new Date(from), $lte: new Date(to) }
    }).sort({ startDate: 1 });

    res.json({
      status: 'success',
      count: events.length,
      events: events.map(e => e.toJSON())
    });
  } catch (error) {
    console.error('Failed to fetch events:', error);
    res.status(500).json({
      error: 'Failed to fetch events',
      message: error.message
    });
  }
});

// Search events
router.get('/calendar/search', async (req, res) => {
  try {
    const { userId, query, connectionId } = req.query;

    if (!userId || !query) {
      return res.status(400).json({
        error: 'userId and query are required'
      });
    }

    let searchQuery = {
      userId,
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { location: { $regex: query, $options: 'i' } },
        { 'attendees.email': { $regex: query, $options: 'i' } }
      ]
    };

    if (connectionId) {
      searchQuery.connectionId = connectionId;
    }

    const events = await CalendarEvent.find(searchQuery)
      .sort({ startDate: -1 })
      .limit(50);

    res.json({
      status: 'success',
      count: events.length,
      results: events.map(e => e.toJSON())
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message
    });
  }
});

// Bulk sync events from external provider
router.post('/calendar/sync-events', async (req, res) => {
  try {
    const { userId, events, connectionId, provider } = req.body;

    if (!userId || !events || !Array.isArray(events)) {
      return res.status(400).json({
        error: 'userId and events array are required'
      });
    }

    const syncedEvents = [];
    const errors = [];

    for (const eventData of events) {
      try {
        let event = await CalendarEvent.findOne({
          externalId: eventData.externalId,
          provider,
          connectionId
        });

        if (event) {
          // Update existing event
          Object.assign(event, {
            title: eventData.title,
            description: eventData.description,
            startDate: new Date(eventData.startDate),
            endDate: new Date(eventData.endDate),
            location: eventData.location,
            attendees: eventData.attendees || [],
            recurrence: eventData.recurrence || 'none',
            status: eventData.status || 'confirmed',
            syncedAt: new Date()
          });
          await event.save();
        } else {
          // Create new event
          event = new CalendarEvent({
            userId,
            title: eventData.title,
            description: eventData.description,
            startDate: new Date(eventData.startDate),
            endDate: new Date(eventData.endDate),
            allDay: eventData.allDay || false,
            location: eventData.location,
            attendees: eventData.attendees || [],
            color: eventData.color || '#667eea',
            recurrence: eventData.recurrence || 'none',
            recurrenceEnd: eventData.recurrenceEnd ? new Date(eventData.recurrenceEnd) : null,
            connectionId,
            provider,
            externalId: eventData.externalId,
            externalUrl: eventData.externalUrl,
            status: eventData.status || 'confirmed',
            syncedAt: new Date()
          });
          await event.save();
        }

        syncedEvents.push(event.toJSON());
      } catch (err) {
        errors.push({ event: eventData.title, error: err.message });
      }
    }

    res.json({
      status: 'success',
      message: `Synced ${syncedEvents.length} events`,
      synced: syncedEvents.length,
      failed: errors.length,
      events: syncedEvents,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Bulk sync error:', error);
    res.status(500).json({
      error: 'Failed to sync events',
      message: error.message
    });
  }
});

// Delete events by connection (when disconnecting a calendar)
router.delete('/calendar/connection/:connectionId', async (req, res) => {
  try {
    const { connectionId } = req.params;

    const result = await CalendarEvent.deleteMany({ connectionId });

    res.json({
      status: 'success',
      message: `Deleted ${result.deletedCount} events`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Deletion error:', error);
    res.status(500).json({
      error: 'Failed to delete events',
      message: error.message
    });
  }
});

module.exports = router;
