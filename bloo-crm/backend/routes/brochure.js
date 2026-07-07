/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  Proprietary software. Unauthorized copying or use by any means or technology
  (including AI tools) is strictly prohibited.
*/
/* =====================================================
   BROCHURE PAPA — AI brochure/deck generation via Beautiful.ai
   Uses Beautiful.ai's generatePresentation API. Requires BEAUTIFULAI_API_KEY
   on the server; returns 503 (not configured) gracefully when absent.
   ===================================================== */
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

const BEAUTIFULAI_BASE = (process.env.BEAUTIFULAI_API_URL || 'https://www.beautiful.ai/api/v1').replace(/\/+$/, '');

router.use(verifyToken);

function buildPrompt(b) {
  let p = `Create a polished, professional marketing brochure about: ${b.topic}.`;
  if (b.audience) p += ` Target audience: ${b.audience}.`;
  if (b.tone) p += ` Tone: ${b.tone}.`;
  if (b.details) p += ` Additional details to include: ${b.details}.`;
  p += ' Include a strong headline, key benefits, features, social proof and a clear call to action.';
  return p;
}

// Availability / config check for the UI
router.get('/status', (req, res) => {
  res.json({ configured: !!process.env.BEAUTIFULAI_API_KEY, provider: 'Beautiful.ai', name: 'Brochure Papa' });
});

// Kick off a brochure generation. Beautiful.ai returns a fully designed deck
// (playerUrl) synchronously — no polling required.
router.post('/generate', async (req, res) => {
  const key = process.env.BEAUTIFULAI_API_KEY;
  if (!key) {
    return res.status(503).json({
      error: 'Brochure Papa not configured',
      message: 'Brochure Papa uses Beautiful.ai. Add a BEAUTIFULAI_API_KEY on the server (from your Beautiful.ai account) to enable brochure generation.'
    });
  }
  try {
    const b = req.body || {};
    const topic = String(b.topic || '').trim();
    if (!topic) return res.status(400).json({ error: 'Please describe what the brochure is about.' });

    const payload = {
      prompt: buildPrompt(b).slice(0, 10000),   // API caps prompt at 10,000 chars
      imageSource: 'ai'
    };
    if (b.theme) payload.themeId = b.theme;
    if (b.language) payload.language = b.language;

    const resp = await fetch(`${BEAUTIFULAI_BASE}/generatePresentation`, {
      method: 'POST',
      headers: { 'X-Api-Key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return res.status(502).json({ error: 'Beautiful.ai generation failed', message: data.message || `Beautiful.ai responded ${resp.status}` });

    if (data.status === 'failed') return res.status(502).json({ error: 'Beautiful.ai generation failed', message: (data.warnings && data.warnings.join('; ')) || 'The deck could not be generated.' });

    return res.json({
      status: data.status || 'completed',
      pending: false,
      url: data.playerUrl || data.url || null,
      presentationId: data.presentationId || null,
      title: data.title || null
    });
  } catch (e) {
    return res.status(502).json({ error: 'Brochure generation error', message: e.message });
  }
});

module.exports = router;
