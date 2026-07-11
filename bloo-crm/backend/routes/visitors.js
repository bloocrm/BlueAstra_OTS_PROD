/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  Proprietary software. Unauthorized copying or use by any means or technology
  (including AI tools) is strictly prohibited.
*/
/* =====================================================
   VISITORS API — consent capture + first-party analytics
   Public (no auth): the marketing site posts the visitor's consent choice.
   The SERVER derives the IP and approximate geolocation; the client supplies
   device/browser/campaign context. On "Necessary Only" we persist only the
   security-essential minimum (IP + anonymous id).
   ===================================================== */
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Visitor = require('../models/Visitor');

const clip = (s, n = 300) => (typeof s === 'string' ? s.slice(0, n) : undefined);
const newVisitorId = () => 'anon_' + crypto.randomBytes(12).toString('hex');

function clientIp(req) {
  let ip = req.ip || (req.connection && req.connection.remoteAddress) || '';
  return ip.replace(/^::ffff:/, '');
}
const isPrivate = ip => !ip || /^(127\.|10\.|192\.168\.|::1$|fe80:|172\.(1[6-9]|2\d|3[01])\.)/.test(ip);

// Approximate geolocation from IP (free ip-api.com; graceful + time-boxed).
async function geoLookup(ip) {
  if (isPrivate(ip)) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const r = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,regionName,city`, { signal: ctrl.signal });
    clearTimeout(t);
    const d = await r.json();
    if (d && d.status === 'success') return { city: d.city, region: d.regionName, country: d.country, countryCode: d.countryCode };
  } catch (e) { /* geo is best-effort */ }
  return null;
}

// POST /api/visitors/consent — record the consent choice + context
router.post('/consent', async (req, res) => {
  try {
    const b = req.body || {};
    const consent = ['all', 'necessary', 'custom'].includes(b.consent) ? b.consent : 'necessary';
    const cats = b.categories || {};
    const analyticsOk = consent === 'all' || (consent === 'custom' && !!cats.analytics);
    const ip = clientIp(req);
    const ua = clip(req.get('user-agent'), 400);

    let visitorId = (typeof b.visitorId === 'string' && /^anon_[a-f0-9]{6,}$/.test(b.visitorId)) ? b.visitorId : null;
    let visitor = visitorId ? await Visitor.findOne({ visitorId }) : null;
    if (!visitor) { visitorId = visitorId || newVisitorId(); visitor = new Visitor({ visitorId, firstVisit: new Date() }); }
    else { visitor.returningVisitor = true; visitor.visitCount = (visitor.visitCount || 1) + 1; }

    // Always (security-essential)
    visitor.consent = consent;
    visitor.consentCategories = {
      necessary: true,
      analytics: !!analyticsOk,
      personalization: consent === 'all' || (consent === 'custom' && !!cats.personalization),
      marketing: consent === 'all' || (consent === 'custom' && !!cats.marketing)
    };
    visitor.consentAt = new Date();
    visitor.ipAddress = ip;
    visitor.userAgent = ua;
    visitor.lastVisit = new Date();

    // Optional rich profile — only when analytics is consented
    if (analyticsOk) {
      visitor.location = (await geoLookup(ip)) || visitor.location || undefined;
      visitor.device = clip(b.device, 40);
      visitor.browser = clip(b.browser, 60);
      visitor.os = clip(b.os, 60);
      visitor.referralSource = clip(b.referralSource, 120);
      visitor.landingPage = clip(b.landingPage, 300);
      if (Number.isFinite(b.pagesViewed)) visitor.pagesViewed = Math.max(visitor.pagesViewed || 0, Math.min(b.pagesViewed, 100000));
      if (Number.isFinite(b.sessionDurationSeconds)) visitor.sessionDurationSeconds = Math.max(visitor.sessionDurationSeconds || 0, Math.min(b.sessionDurationSeconds, 86400));
      const u = b.utm || {};
      visitor.utmSource = clip(u.source, 120); visitor.utmMedium = clip(u.medium, 120);
      visitor.utmCampaign = clip(u.campaign, 160); visitor.utmTerm = clip(u.term, 160); visitor.utmContent = clip(u.content, 160);
    }

    await visitor.save();
    return res.json({
      status: 'success',
      visitorId: visitor.visitorId,
      consent: visitor.consent,
      returningVisitor: visitor.returningVisitor,
      location: analyticsOk ? (visitor.location || null) : null
    });
  } catch (e) {
    console.error('visitor consent error:', e.message);
    return res.status(500).json({ error: 'Could not record consent' });
  }
});

// POST /api/visitors/activity — beacon: update pages/duration for consented visitors
router.post('/activity', async (req, res) => {
  try {
    const b = req.body || {};
    if (!/^anon_[a-f0-9]{6,}$/.test(b.visitorId || '')) return res.status(204).end();
    const v = await Visitor.findOne({ visitorId: b.visitorId });
    if (!v || !(v.consentCategories && v.consentCategories.analytics)) return res.status(204).end();
    if (Number.isFinite(b.pagesViewed)) v.pagesViewed = Math.max(v.pagesViewed || 0, Math.min(b.pagesViewed, 100000));
    if (Number.isFinite(b.sessionDurationSeconds)) v.sessionDurationSeconds = Math.max(v.sessionDurationSeconds || 0, Math.min(b.sessionDurationSeconds, 86400));
    v.lastVisit = new Date();
    await v.save();
    return res.status(204).end();
  } catch (e) { return res.status(204).end(); }
});

// GET /api/visitors/geo — functional geolocation for regional content (e.g. which
// walkthrough video to show). Best-effort, stores nothing. Defined BEFORE the
// '/:visitorId' route so 'geo' is not captured as an id.
router.get('/geo', async (req, res) => {
  const ip = clientIp(req);
  if (isPrivate(ip)) return res.json({ status: 'private', continentCode: null, countryCode: null });
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const r = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,continentCode,countryCode,country`, { signal: ctrl.signal });
    clearTimeout(t);
    const d = await r.json();
    if (d && d.status === 'success') {
      return res.json({ status: 'success', continentCode: d.continentCode, countryCode: d.countryCode, country: d.country });
    }
  } catch (e) { /* best-effort */ }
  return res.json({ status: 'unknown', continentCode: null, countryCode: null });
});

// GET /api/visitors/:visitorId — transparency: return what we hold for this visitor
router.get('/:visitorId', async (req, res) => {
  if (!/^anon_[a-f0-9]{6,}$/.test(req.params.visitorId)) return res.status(400).json({ error: 'Invalid id' });
  const v = await Visitor.findOne({ visitorId: req.params.visitorId }).lean();
  if (!v) return res.status(404).json({ error: 'Not found' });
  delete v._id; delete v.__v;
  return res.json({ status: 'success', visitor: v });
});

module.exports = router;
