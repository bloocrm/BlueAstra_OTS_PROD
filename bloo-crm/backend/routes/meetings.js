/* =====================================================
   MEETING RECORDS API (minutes, transcript, search)
   ===================================================== */

const express = require('express');
const router = express.Router();
const Meeting = require('../models/Meeting');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

function buildMinutes(b, host) {
  const attendees = [];
  if (b.clientEmail) attendees.push(b.clientEmail);
  if (Array.isArray(b.attendees)) attendees.push(...b.attendees);
  const when = b.startTime ? new Date(b.startTime).toLocaleString() : new Date().toLocaleString();
  return [
    `Meeting Minutes — ${b.title || 'Meeting'}`,
    `Date: ${when}`,
    `Host: ${host || 'Host'}`,
    `Attendees: ${[...new Set(attendees)].join(', ') || '—'}`,
    `Provider: ${b.providerName || b.provider || 'Meeting'}`,
    '',
    'Agenda:',
    b.agenda || '(none provided)',
    '',
    'Notes:',
    '(notes / AI summary are added after the meeting)'
  ].join('\n');
}

// POST /api/meetings — create a meeting record
router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    const attendees = [];
    if (b.clientEmail) attendees.push(b.clientEmail);
    if (Array.isArray(b.attendees)) attendees.push(...b.attendees);

    const meeting = await Meeting.create({
      userId: req.userId,
      title: b.title || 'Meeting',
      agenda: b.agenda || '',
      provider: b.provider,
      providerName: b.providerName,
      clientName: b.clientName,
      clientEmail: b.clientEmail,
      attendees: [...new Set(attendees.filter(Boolean))],
      startTime: b.startTime ? new Date(b.startTime) : new Date(),
      status: b.status || 'active',
      meetingUrl: b.meetingUrl,
      guestUrl: b.guestUrl,
      minutes: b.minutes || buildMinutes(b, req.userName || req.userEmail),
      transcript: b.transcript || '',
      recordingUrl: b.recordingUrl || ''
    });

    res.status(201).json({ status: 'success', meeting });
  } catch (error) {
    console.error('Meeting create error:', error);
    res.status(500).json({ error: 'Failed to save meeting', message: error.message });
  }
});

// GET /api/meetings?search=... — list / search meetings (lightweight, no minutes/transcript)
router.get('/', async (req, res) => {
  try {
    const query = { userId: req.userId };
    const search = (req.query.search || '').trim();
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ title: rx }, { agenda: rx }, { clientName: rx }, { clientEmail: rx }, { meetingId: rx }];
    }
    const meetings = await Meeting.find(query)
      .sort({ startTime: -1 })
      .limit(100)
      .select('-minutes -transcript')
      .lean();
    res.json({ status: 'success', count: meetings.length, meetings });
  } catch (error) {
    console.error('Meeting list error:', error);
    res.status(500).json({ error: 'Failed to list meetings', message: error.message });
  }
});

// GET /api/meetings/:meetingId — full meeting (with minutes + transcript)
router.get('/:meetingId', async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ userId: req.userId, meetingId: req.params.meetingId }).lean();
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    res.json({ status: 'success', meeting });
  } catch (error) {
    console.error('Meeting get error:', error);
    res.status(500).json({ error: 'Failed to get meeting', message: error.message });
  }
});

module.exports = router;
