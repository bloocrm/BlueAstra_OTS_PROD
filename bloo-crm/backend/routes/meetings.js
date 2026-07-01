/* =====================================================
   MEETING RECORDS API (minutes, transcript, summary, recording)
   All routes are authenticated and scoped to req.userId, so a user
   can only see/extract their OWN meetings.
   ===================================================== */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Meeting = require('../models/Meeting');
const { verifyToken } = require('../middleware/auth');
const { transcribeUrl, transcribeFile } = require('../services/transcription-service');

const RECORDINGS_DIR = path.join(__dirname, '..', 'uploads', 'recordings');
fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
const recordingUpload = multer({ dest: RECORDINGS_DIR, limits: { fileSize: 300 * 1024 * 1024 } });

router.use(verifyToken);

// Extract the room slug from a meeting URL (JaaS or public Jitsi)
function roomFromUrl(url) {
  try {
    const u = new URL(url);
    return u.pathname.split('/').filter(Boolean).pop() || '';
  } catch (_) { return ''; }
}

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

function summarize(transcript) {
  const text = (transcript || '').trim();
  if (!text) return '';
  const clean = text.replace(/\s+/g, ' ');
  return clean.length > 600 ? clean.slice(0, 600) + '…' : clean;
}

// Find a meeting by MTG- id or Mongo _id, scoped to the owner (access control)
async function findOwned(userId, id) {
  if (/^[0-9a-fA-F]{24}$/.test(id)) {
    return Meeting.findOne({ userId, $or: [{ meetingId: id }, { _id: id }] });
  }
  return Meeting.findOne({ userId, meetingId: id });
}

// --- CREATE ---------------------------------------------------------------
async function createMeeting(req, res) {
  try {
    const b = req.body || {};
    const attendees = [];
    if (b.clientEmail) attendees.push(b.clientEmail);
    if (Array.isArray(b.attendees)) attendees.push(...b.attendees);

    const meeting = await Meeting.create({
      userId: req.userId,
      title: b.title || 'Meeting',
      advisorName: b.advisorName || req.userName || req.userEmail,
      agenda: b.agenda || '',
      provider: b.provider,
      providerName: b.providerName,
      clientName: b.clientName,
      clientEmail: b.clientEmail,
      attendees: [...new Set(attendees.filter(Boolean))],
      startTime: b.startTime ? new Date(b.startTime) : new Date(),
      status: b.status || 'active',
      room: b.room || roomFromUrl(b.meetingUrl),
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
}
router.post('/', createMeeting);
router.post('/create', createMeeting);

// --- END (save transcript, duration, summary) -----------------------------
router.post('/end', async (req, res) => {
  try {
    const { meetingId, transcript, durationMinutes, summary, recordingUrl } = req.body || {};
    if (!meetingId) return res.status(400).json({ error: 'meetingId is required' });

    const meeting = await findOwned(req.userId, meetingId);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

    meeting.status = 'ended';
    meeting.endTime = new Date();
    if (typeof transcript === 'string' && transcript.trim()) meeting.transcript = transcript.trim();
    if (recordingUrl) meeting.recordingUrl = recordingUrl;
    meeting.summary = (summary && summary.trim()) || summarize(meeting.transcript);
    if (durationMinutes != null) {
      meeting.durationMinutes = parseInt(durationMinutes) || undefined;
    } else if (meeting.startTime) {
      meeting.durationMinutes = Math.max(1, Math.round((meeting.endTime - meeting.startTime) / 60000));
    }
    await meeting.save();

    res.json({ status: 'success', meeting });
  } catch (error) {
    console.error('Meeting end error:', error);
    res.status(500).json({ error: 'Failed to end meeting', message: error.message });
  }
});

// --- LIST / SEARCH (own meetings only) ------------------------------------
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
    res.status(500).json({ error: 'Failed to list meetings', message: error.message });
  }
});

// --- GET ONE --------------------------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    const meeting = await findOwned(req.userId, req.params.id);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    res.json({ status: 'success', meeting });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get meeting', message: error.message });
  }
});

// --- TRANSCRIPT / SUMMARY / RECORDING -------------------------------------
router.get('/:id/transcript', async (req, res) => {
  const m = await findOwned(req.userId, req.params.id);
  if (!m) return res.status(404).json({ error: 'Meeting not found' });
  res.json({ status: 'success', meetingId: m.meetingId, transcript: m.transcript || '' });
});

router.get('/:id/summary', async (req, res) => {
  const m = await findOwned(req.userId, req.params.id);
  if (!m) return res.status(404).json({ error: 'Meeting not found' });
  res.json({ status: 'success', meetingId: m.meetingId, summary: m.summary || summarize(m.transcript) });
});

router.get('/:id/recording', async (req, res) => {
  const m = await findOwned(req.userId, req.params.id);
  if (!m) return res.status(404).json({ error: 'Meeting not found' });
  if (!m.recordingUrl) return res.status(404).json({ error: 'No recording available for this meeting' });
  res.json({ status: 'success', meetingId: m.meetingId, recordingUrl: m.recordingUrl });
});

// --- UPLOAD a browser recording -> store + transcribe (no JaaS needed) -----
router.post('/:id/recording', recordingUpload.single('recording'), async (req, res) => {
  let tmpPath;
  try {
    const m = await findOwned(req.userId, req.params.id);
    if (!m) return res.status(404).json({ error: 'Meeting not found' });
    if (!req.file) return res.status(400).json({ error: 'No recording uploaded' });

    tmpPath = req.file.path;
    const ext = (req.file.mimetype && req.file.mimetype.includes('mp4')) ? 'mp4' : 'webm';
    const finalName = `${m.meetingId}-${Date.now()}.${ext}`;
    const finalPath = path.join(RECORDINGS_DIR, finalName);
    fs.renameSync(tmpPath, finalPath);
    tmpPath = finalPath;

    m.recordingUrl = `/recordings/${finalName}`;
    if (req.body && req.body.durationMinutes) m.durationMinutes = parseInt(req.body.durationMinutes) || m.durationMinutes;
    m.status = 'ended';
    m.endTime = new Date();
    await m.save();

    // Transcribe with Whisper (best-effort — recording is saved regardless)
    try {
      const transcript = await transcribeFile(finalPath);
      m.transcript = transcript;
      m.summary = summarize(transcript);
      await m.save();
    } catch (e) {
      console.error('Recording transcription failed:', e.message);
    }

    res.json({
      status: 'success',
      meetingId: m.meetingId,
      recordingUrl: m.recordingUrl,
      transcriptLength: (m.transcript || '').length
    });
  } catch (error) {
    if (tmpPath) { try { fs.unlinkSync(tmpPath); } catch (_) {} }
    console.error('Recording upload error:', error);
    res.status(500).json({ error: 'Failed to process recording', message: error.message });
  }
});

// --- TRANSCRIBE a recording with Whisper (manual / on-demand) -------------
router.post('/:id/transcribe', async (req, res) => {
  try {
    const m = await findOwned(req.userId, req.params.id);
    if (!m) return res.status(404).json({ error: 'Meeting not found' });
    const url = (req.body && req.body.recordingUrl) || m.recordingUrl;
    if (!url) return res.status(400).json({ error: 'No recording URL to transcribe' });

    const transcript = await transcribeUrl(url);
    m.transcript = transcript;
    m.summary = summarize(transcript);
    if (req.body && req.body.recordingUrl) m.recordingUrl = req.body.recordingUrl;
    await m.save();

    res.json({ status: 'success', meetingId: m.meetingId, transcriptLength: transcript.length });
  } catch (error) {
    console.error('Transcribe error:', error);
    res.status(500).json({ error: 'Transcription failed', message: error.message });
  }
});

// --- DELETE (own only) ----------------------------------------------------
router.delete('/:id', async (req, res) => {
  try {
    const m = await findOwned(req.userId, req.params.id);
    if (!m) return res.status(404).json({ error: 'Meeting not found' });
    await Meeting.deleteOne({ _id: m._id, userId: req.userId });
    res.json({ status: 'success', message: 'Meeting deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete meeting', message: error.message });
  }
});

module.exports = router;
