/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  Region-aware feature-walkthrough video for the Enroll page.
  Detects the visitor's region (server-side geo via /api/visitors/geo) and shows
  the UK-narrated video for EMEA (Europe / Africa / Middle East) or the
  US-narrated video for everyone else (Americas, India, APAC, Australia, ...).
  Autoplays muted; a speaker toggle (top-right) lets the visitor hear the narration.
*/
(function () {
  'use strict';

  var UK_SRC = 'https://zxqrgrantzbxfoqklbnf.supabase.co/storage/v1/object/public/BLOOCRM/BlooCRM_Feature_Walkthrough_UK.mp4';
  var UK_TYPE = 'video/mp4';
  var US_SRC = 'https://zxqrgrantzbxfoqklbnf.supabase.co/storage/v1/object/public/BLOOCRM/BlooCRM_Feature_Walkthrough_US.mp4';
  var US_TYPE = 'video/mp4';

  // Middle-East countries sit in continent "AS" but belong to EMEA -> UK video.
  var MIDDLE_EAST = ['AE','SA','QA','KW','BH','OM','JO','LB','IL','IQ','IR','SY','YE','PS','TR'];

  function isEMEA(continentCode, countryCode) {
    if (continentCode === 'EU' || continentCode === 'AF') return true;
    return MIDDLE_EAST.indexOf((countryCode || '').toUpperCase()) !== -1;
  }

  var SPEAKER_ON =
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">' +
    '<path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2a4.5 4.5 0 0 0-2.5-4.03v8.06A4.5 4.5 0 0 0 16.5 12zM14 3.23v2.06a7 7 0 0 1 0 13.42v2.06a9 9 0 0 0 0-17.54z"/></svg>';
  var SPEAKER_OFF =
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">' +
    '<path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.42.05-.63zM19 12c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.94 8.94 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.9 8.9 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z"/></svg>';

  function injectStyles() {
    if (document.getElementById('region-video-styles')) return;
    var css =
      '.rv-wrap{max-width:1000px;margin:6px auto 8px;padding:0 20px;}' +
      '.rv-head{text-align:center;margin-bottom:14px;}' +
      '.rv-head .eyebrow{display:inline-block;font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:.72rem;color:#2E86FF;}' +
      '.rv-head h2{margin:6px 0 4px;font-size:1.5rem;color:#16233a;}' +
      '.rv-head p{color:#4a5568;margin:0;}' +
      '.rv-frame{position:relative;border-radius:16px;overflow:hidden;background:#0b1220;box-shadow:0 18px 45px rgba(16,35,58,.22);border:1px solid rgba(46,134,255,.18);}' +
      '.rv-frame video{display:block;width:100%;height:auto;background:#0b1220;}' +
      '.rv-sound{position:absolute;top:12px;right:12px;display:inline-flex;align-items:center;gap:7px;' +
        'background:rgba(11,18,32,.62);color:#fff;border:1px solid rgba(255,255,255,.28);border-radius:999px;' +
        'padding:8px 13px;font-weight:600;font-size:.82rem;cursor:pointer;backdrop-filter:blur(4px);transition:.2s;}' +
      '.rv-sound:hover{background:rgba(46,134,255,.9);border-color:transparent;}' +
      '.rv-sound svg{display:block;}' +
      '.rv-badge{position:absolute;left:12px;bottom:12px;background:rgba(11,18,32,.6);color:#cfe0ff;' +
        'border-radius:999px;padding:5px 12px;font-size:.72rem;font-weight:600;letter-spacing:.04em;}' +
      '@media(max-width:600px){.rv-sound span{display:none;}.rv-head h2{font-size:1.25rem;}}';
    var s = document.createElement('style');
    s.id = 'region-video-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function render(mount, useUK) {
    injectStyles();
    var src = useUK ? UK_SRC : US_SRC;
    var type = useUK ? UK_TYPE : US_TYPE;
    var accent = useUK ? 'UK English narration' : 'US English narration';

    var wrap = document.createElement('div');
    wrap.className = 'rv-wrap';
    wrap.innerHTML =
      '<div class="rv-head">' +
        '<span class="eyebrow">See it in action</span>' +
        '<h2>A guided tour of Bloo CRM</h2>' +
        '<p>Playing silently — tap the speaker to hear the walkthrough.</p>' +
      '</div>' +
      '<div class="rv-frame">' +
        '<video id="rv-video" autoplay muted loop playsinline preload="auto" ' +
              'poster="https://zxqrgrantzbxfoqklbnf.supabase.co/storage/v1/object/public/BLOOCRM/woman-presents-financial-data-flowing-from-coffee-2026-03-26-01-26-39-utc.jpg">' +
          '<source src="' + src + '" type="' + type + '">' +
        '</video>' +
        '<button type="button" class="rv-sound" id="rv-sound" aria-label="Unmute video">' +
          SPEAKER_OFF + '<span>Tap for sound</span>' +
        '</button>' +
        '<div class="rv-badge">' + accent + '</div>' +
      '</div>';

    mount.innerHTML = '';
    mount.appendChild(wrap);

    var video = wrap.querySelector('#rv-video');
    var btn = wrap.querySelector('#rv-sound');

    function paint() {
      if (video.muted) {
        btn.innerHTML = SPEAKER_OFF + '<span>Tap for sound</span>';
        btn.setAttribute('aria-label', 'Unmute video');
      } else {
        btn.innerHTML = SPEAKER_ON + '<span>Sound on</span>';
        btn.setAttribute('aria-label', 'Mute video');
      }
    }

    btn.addEventListener('click', function () {
      video.muted = !video.muted;
      if (!video.muted) {
        video.loop = false;      // don't loop the 8-min narration once they're listening
        video.volume = 1;
        var p = video.play();
        if (p && p.catch) p.catch(function () {});
      }
      paint();
    });

    // Kick off muted autoplay (allowed by browsers when muted).
    var pp = video.play();
    if (pp && pp.catch) pp.catch(function () {});
    paint();
  }

  function boot() {
    var mount = document.getElementById('region-video-mount');
    if (!mount) return;
    fetch('/api/visitors/geo', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var useUK = false;
        if (d && d.status === 'success') useUK = isEMEA(d.continentCode, d.countryCode);
        render(mount, useUK);
      })
      .catch(function () { render(mount, false); }); // default: US narration
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
