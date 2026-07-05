/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  Proprietary software. Unauthorized copying or use by any means or technology
  (including AI tools) is strictly prohibited.
*/
/* =====================================================
   BROCHURE PAPA — AI brochure generation via Gamma (gamma.app)
   Uses Gamma's Generations API. Requires GAMMA_API_KEY on the server;
   returns 503 (not configured) gracefully when the key is absent.
   ===================================================== */
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

const GAMMA_BASE = (process.env.GAMMA_API_URL || 'https://public-api.gamma.app/v0.2').replace(/\/+$/, '');

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
  res.json({ configured: !!process.env.GAMMA_API_KEY, provider: 'Gamma', name: 'Brochure Papa' });
});

// Kick off a brochure generation
router.post('/generate', async (req, res) => {
  const key = process.env.GAMMA_API_KEY;
  if (!key) {
    return res.status(503).json({
      error: 'Brochure Papa not configured',
      message: 'Brochure Papa uses Gamma. Add a GAMMA_API_KEY on the server (from your Gamma Pro/Business account) to enable brochure generation.'
    });
  }
  try {
    const b = req.body || {};
    const topic = String(b.topic || '').trim();
    if (!topic) return res.status(400).json({ error: 'Please describe what the brochure is about.' });

    const payload = {
      inputText: buildPrompt(b),
      textMode: 'generate',
      format: b.format || 'document',        // document | presentation | social
      numCards: Math.min(Math.max(parseInt(b.cards, 10) || 6, 1), 20),
      exportAs: 'pdf'
    };
    if (b.theme) payload.themeName = b.theme;

    const resp = await fetch(`${GAMMA_BASE}/generations`, {
      method: 'POST',
      headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return res.status(502).json({ error: 'Gamma generation failed', message: data.message || `Gamma responded ${resp.status}` });

    const generationId = data.generationId || data.id;
    if (!generationId) return res.status(502).json({ error: 'Gamma did not return a generation id' });

    // Return immediately; the client polls /status/:id for the finished brochure.
    return res.json({ status: data.status || 'pending', generationId, pending: (data.status !== 'completed'), url: data.gammaUrl || data.url || null });
  } catch (e) {
    return res.status(502).json({ error: 'Brochure generation error', message: e.message });
  }
});

// Poll a generation's status -> returns the brochure URL when ready
router.get('/status/:id', async (req, res) => {
  const key = process.env.GAMMA_API_KEY;
  if (!key) return res.status(503).json({ error: 'Brochure Papa not configured' });
  try {
    const resp = await fetch(`${GAMMA_BASE}/generations/${encodeURIComponent(req.params.id)}`, {
      headers: { 'X-API-KEY': key }
    });
    const d = await resp.json().catch(() => ({}));
    if (!resp.ok) return res.status(502).json({ error: 'Status check failed', message: d.message || `Gamma responded ${resp.status}` });
    res.json({
      status: d.status || 'pending',
      pending: d.status !== 'completed' && d.status !== 'failed',
      url: d.gammaUrl || d.url || null,
      pdfUrl: d.pdfUrl || (d.exportUrls && d.exportUrls.pdf) || null
    });
  } catch (e) {
    res.status(502).json({ error: 'Status check error', message: e.message });
  }
});

module.exports = router;
