/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  Proprietary software. Unauthorized copying or use by any means or technology
  (including AI tools) is strictly prohibited.
*/
/* =====================================================
   CLEAN URLs + CANONICAL REDIRECTS
   - /page.html            -> 301 /page   (extensionless, lowercased)
   - /dir/index.html       -> 301 /dir/   -> /dir
   - /page/  (trailing /)  -> 301 /page
   - extensionless /page   -> serves the matching page.html
   OAuth callback pages (*-callback.html) are left untouched — their exact URLs
   are registered as provider redirect URIs. Only GET/HEAD are rewritten, so
   POSTs and API calls are never affected; query strings are always preserved.
   ===================================================== */
const fs = require('fs');
const path = require('path');

// Build a { lowercase-relative-path -> absolute file } map for extensionless
// serving. Walks subdirectories so nested pages (e.g. pages/payment.html) get a
// clean-URL entry keyed by their path from the base ("pages/payment"), matching
// what serveClean() looks up. First dir wins on key conflicts.
function buildMap(dirs) {
  const map = {};
  const walk = (base, rel) => {
    let entries = [];
    try { entries = fs.readdirSync(path.join(base, rel), { withFileTypes: true }); } catch (e) { return; }
    for (const ent of entries) {
      const name = ent.name;
      if (ent.isDirectory()) {
        if (name === 'node_modules' || name.startsWith('.')) continue;
        walk(base, rel ? rel + '/' + name : name);
      } else if (/\.html$/i.test(name) && !/-callback\.html$/i.test(name) && name.toLowerCase() !== 'index.html') {
        const relPath = rel ? rel + '/' + name : name;
        const key = relPath.replace(/\.html$/i, '').toLowerCase();
        if (!map[key]) map[key] = path.join(base, relPath); // first dir wins on conflict
      }
    }
  };
  for (const base of dirs) walk(base, '');
  return map;
}

function queryOf(req) { const i = req.originalUrl.indexOf('?'); return i >= 0 ? req.originalUrl.slice(i) : ''; }
function bypass(p) { return p.startsWith('/api') || p === '/health'; }

// 301 canonicalizer — run this early (before static/routes).
function canonicalRedirect(req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();

  // Canonical host: drop a leading "www." (nginx forwards the real Host header)
  const host = req.headers.host || '';
  if (/^www\./i.test(host)) {
    return res.redirect(301, 'https://' + host.replace(/^www\./i, '') + req.originalUrl);
  }

  const p = req.path;
  if (bypass(p)) return next();
  if (/-callback\.html$/i.test(p)) return next(); // OAuth callbacks: leave exactly as-is

  if (/\/index\.html$/i.test(p)) {
    const dir = p.replace(/\/index\.html$/i, '/') || '/';
    return res.redirect(301, dir + queryOf(req));
  }
  if (/\.html$/i.test(p)) {
    const clean = '/' + p.replace(/^\/+/, '').replace(/\.html$/i, '').toLowerCase();
    return res.redirect(301, clean + queryOf(req));
  }
  if (p.length > 1 && p.endsWith('/')) {
    return res.redirect(301, p.replace(/\/+$/, '') + queryOf(req));
  }
  return next();
}

// Serve extensionless clean URLs from the map — place just before the SPA fallback.
function serveClean(map) {
  return (req, res, next) => {
    if (bypass(req.path) || path.extname(req.path)) return next();
    const key = req.path.replace(/^\/+/, '').toLowerCase();
    if (map[key]) return res.sendFile(map[key]);
    return next();
  };
}

module.exports = { buildMap, canonicalRedirect, serveClean };
