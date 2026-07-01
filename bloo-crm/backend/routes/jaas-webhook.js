/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   JaaS WEBHOOK
   Receives JaaS events. On a recording-ready event, saves the recording
   link to the matching meeting and transcribes it with Whisper.
   Configure this URL in the JaaS console (Webhooks):
     https://bloocrm.com/api/jaas/webhook
   ===================================================== */

const express = require('express');
const router = express.Router();
const Meeting = require('../models/Meeting');
const { transcribeUrl } = require('../services/transcription-service');

router.post('/jaas/webhook', async (req, res) => {
  // Acknowledge immediately; process asynchronously
  res.json({ received: true });

  try {
    const evt = req.body || {};
    const type = (evt.eventType || evt.type || '').toString();
    const data = evt.data || {};
    const fqn = evt.fqn || data.fqn || '';
    const room = fqn ? String(fqn).split('/').pop() : (evt.room || data.room || '');
    const url =
      data.preAuthenticatedLink ||
      (data.recording && data.recording.url) ||
      data.url ||
      evt.preAuthenticatedLink ||
      '';

    if (!/RECORDING/i.test(type) || !url || !room) return;

    const meeting = await Meeting.findOne({ room });
    if (!meeting) {
      console.warn('JaaS webhook: no meeting found for room', room);
      return;
    }

    meeting.recordingUrl = url;
    await meeting.save();

    try {
      const transcript = await transcribeUrl(url);
      meeting.transcript = transcript;
      meeting.summary = (transcript || '').replace(/\s+/g, ' ').slice(0, 600);
      await meeting.save();
      console.log('JaaS webhook: transcribed meeting', meeting.meetingId);
    } catch (e) {
      console.error('JaaS webhook transcription failed:', e.message);
    }
  } catch (e) {
    console.error('JaaS webhook error:', e.message);
  }
});

module.exports = router;
