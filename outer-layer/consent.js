/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  Bloo CRM — Privacy & Website Experience Consent banner (first-party).
*/
(function () {
  'use strict';
  var API = (window.API_BASE_URL || '/api');
  var COOKIE = 'bloocrm_consent';
  var VID_KEY = 'bloocrm_vid';
  var CONSENT_VERSION = '1.0';
  var COOKIE_DAYS = 180;

  // ---------- small utils ----------
  function setCookie(name, val, days) {
    var d = new Date(); d.setTime(d.getTime() + days * 864e5);
    document.cookie = name + '=' + encodeURIComponent(val) + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax';
  }
  function getCookie(name) {
    var m = document.cookie.match('(?:^|; )' + name + '=([^;]*)');
    return m ? decodeURIComponent(m[1]) : null;
  }
  function ls(k, v) { try { return v === undefined ? localStorage.getItem(k) : localStorage.setItem(k, v); } catch (e) { return null; } }
  function ss(k, v) { try { return v === undefined ? sessionStorage.getItem(k) : sessionStorage.setItem(k, v); } catch (e) { return null; } }

  function visitorId() {
    var id = ls(VID_KEY);
    if (!id || !/^anon_[a-f0-9]{6,}$/.test(id)) {
      var rnd = ''; try { var a = new Uint8Array(12); crypto.getRandomValues(a); rnd = Array.from(a).map(function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
      catch (e) { rnd = (Date.now().toString(16) + Math.random().toString(16).slice(2)).slice(0, 24); }
      id = 'anon_' + rnd; ls(VID_KEY, id);
    }
    return id;
  }

  // ---------- session context ----------
  function initSession() {
    if (!ss('bloocrm_sstart')) {
      ss('bloocrm_sstart', String(Date.now()));
      ss('bloocrm_landing', location.pathname);
      ss('bloocrm_referrer', document.referrer || '');
      var p = new URLSearchParams(location.search);
      ss('bloocrm_utm', JSON.stringify({
        source: p.get('utm_source') || '', medium: p.get('utm_medium') || '',
        campaign: p.get('utm_campaign') || '', term: p.get('utm_term') || '', content: p.get('utm_content') || ''
      }));
    }
    var n = parseInt(ss('bloocrm_pages') || '0', 10) + 1; ss('bloocrm_pages', String(n));
  }
  function referralSource() {
    var r = ss('bloocrm_referrer') || '';
    if (!r) return 'Direct';
    try {
      var h = new URL(r).hostname.replace(/^www\./, '');
      if (h.indexOf(location.hostname) === 0) return 'Internal';
      if (/google\./.test(h)) return 'Google';
      if (/bing\./.test(h)) return 'Bing';
      if (/linkedin\./.test(h)) return 'LinkedIn';
      if (/facebook\.|fb\./.test(h)) return 'Facebook';
      if (/t\.co|twitter\.|x\.com/.test(h)) return 'Twitter/X';
      if (/instagram\./.test(h)) return 'Instagram';
      if (/youtube\./.test(h)) return 'YouTube';
      return h;
    } catch (e) { return 'Referral'; }
  }
  function sessionSeconds() { var s = parseInt(ss('bloocrm_sstart') || '0', 10); return s ? Math.round((Date.now() - s) / 1000) : 0; }
  function pagesViewed() { return parseInt(ss('bloocrm_pages') || '1', 10); }

  // ---------- device / browser / os ----------
  function parseUA() {
    var ua = navigator.userAgent || '';
    var browser = 'Unknown';
    if (/Edg\//.test(ua)) browser = 'Edge';
    else if (/OPR\/|Opera/.test(ua)) browser = 'Opera';
    else if (/Chrome\//.test(ua)) browser = 'Chrome';
    else if (/Firefox\//.test(ua)) browser = 'Firefox';
    else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';
    var os = 'Unknown';
    if (/Windows NT/.test(ua)) os = 'Windows';
    else if (/Mac OS X/.test(ua)) os = 'macOS';
    else if (/Android/.test(ua)) os = 'Android';
    else if (/(iPhone|iPad|iPod)/.test(ua)) os = 'iOS';
    else if (/Linux/.test(ua)) os = 'Linux';
    var device = /Mobi|Android/.test(ua) ? 'Mobile' : (/Tablet|iPad/.test(ua) ? 'Tablet' : 'Desktop');
    return { browser: browser, os: os, device: device };
  }
  function enrich(info) {
    // Use high-entropy UA client hints to distinguish Windows 11 and touch/mobile.
    if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
      return navigator.userAgentData.getHighEntropyValues(['platformVersion', 'platform']).then(function (h) {
        if (h.platform === 'Windows') {
          var major = parseInt((h.platformVersion || '0').split('.')[0], 10);
          info.os = major >= 13 ? 'Windows 11' : (major > 0 ? 'Windows 10' : info.os);
        }
        if (navigator.userAgentData.mobile) info.device = 'Mobile';
        return info;
      }).catch(function () { return info; });
    }
    return Promise.resolve(info);
  }

  // ---------- send consent ----------
  function post(path, payload, beacon) {
    var url = API + path;
    var body = JSON.stringify(payload);
    if (beacon && navigator.sendBeacon) { try { navigator.sendBeacon(url, new Blob([body], { type: 'application/json' })); return; } catch (e) {} }
    try { fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true }); } catch (e) {}
  }

  function recordConsent(consent, cats) {
    var analytics = consent === 'all' || (consent === 'custom' && cats.analytics);
    var base = { visitorId: visitorId(), consent: consent, categories: cats };
    if (!analytics) { post('/visitors/consent', base); return; }
    parseUA(); // warm
    enrich(parseUA()).then(function (info) {
      var utm; try { utm = JSON.parse(ss('bloocrm_utm') || '{}'); } catch (e) { utm = {}; }
      post('/visitors/consent', Object.assign(base, {
        device: info.device, browser: info.browser, os: info.os,
        referralSource: referralSource(), landingPage: ss('bloocrm_landing') || location.pathname,
        pagesViewed: pagesViewed(), sessionDurationSeconds: sessionSeconds(), utm: utm
      }));
      startActivityBeacon();
    });
  }

  var beaconStarted = false;
  function startActivityBeacon() {
    if (beaconStarted) return; beaconStarted = true;
    var send = function () { post('/visitors/activity', { visitorId: visitorId(), pagesViewed: pagesViewed(), sessionDurationSeconds: sessionSeconds() }, true); };
    window.addEventListener('pagehide', send);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') send(); });
  }

  function saveChoice(consent, cats) {
    setCookie(COOKIE, JSON.stringify({ consent: consent, categories: cats, ts: Date.now(), v: CONSENT_VERSION }), COOKIE_DAYS);
    recordConsent(consent, cats);
    hideBanner();
  }

  // ---------- UI ----------
  function css() {
    var s = document.createElement('style');
    s.textContent = [
      '#bcConsent{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;}',
      '#bcConsent .bc-card{max-width:1180px;margin:0 auto 16px;background:#fff;color:#1f2733;border:1px solid #eadfe0;border-radius:16px;box-shadow:0 18px 50px rgba(120,10,10,.20);padding:20px 22px;}',
      '#bcConsent h3{margin:0 0 6px;font-size:1.12rem;color:#c62828;font-weight:800;letter-spacing:.2px;}',
      '#bcConsent p{margin:0;font-size:.9rem;line-height:1.55;color:#455;}',
      '#bcConsent .bc-row{display:flex;gap:18px;align-items:flex-start;flex-wrap:wrap;}',
      '#bcConsent .bc-text{flex:1;min-width:280px;}',
      '#bcConsent .bc-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center;}',
      '#bcConsent button{cursor:pointer;border-radius:10px;font-weight:700;font-size:.9rem;padding:11px 18px;border:1px solid transparent;transition:.15s;}',
      '#bcConsent .bc-accept{background:linear-gradient(135deg,#e53935,#b71c1c);color:#fff;}',
      '#bcConsent .bc-accept:hover{filter:brightness(1.06);}',
      '#bcConsent .bc-nec{background:#fff;color:#c62828;border-color:#f1c8c8;}',
      '#bcConsent .bc-nec:hover{background:#fdecec;}',
      '#bcConsent .bc-manage{background:transparent;color:#5a6472;border-color:#dfe4ea;}',
      '#bcConsent .bc-manage:hover{background:#f4f6f8;}',
      '#bcConsent a{color:#c62828;text-decoration:underline;}',
      '#bcConsent .bc-prefs{margin-top:16px;border-top:1px dashed #eadfe0;padding-top:14px;display:none;}',
      '#bcConsent .bc-prefs.open{display:block;}',
      '#bcConsent .bc-cat{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;padding:11px 0;border-bottom:1px solid #f1eef0;}',
      '#bcConsent .bc-cat h4{margin:0 0 3px;font-size:.92rem;color:#1f2733;}',
      '#bcConsent .bc-cat small{color:#6b7280;font-size:.8rem;line-height:1.45;display:block;max-width:820px;}',
      '#bcConsent .bc-sw{position:relative;width:46px;height:26px;flex:0 0 auto;}',
      '#bcConsent .bc-sw input{opacity:0;width:0;height:0;position:absolute;}',
      '#bcConsent .bc-sl{position:absolute;inset:0;background:#cfd6dd;border-radius:26px;transition:.2s;}',
      '#bcConsent .bc-sl:before{content:"";position:absolute;height:20px;width:20px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.2s;}',
      '#bcConsent input:checked + .bc-sl{background:#e53935;}',
      '#bcConsent input:checked + .bc-sl:before{transform:translateX(20px);}',
      '#bcConsent input:disabled + .bc-sl{background:#e5989b;opacity:.85;}',
      '#bcConsent .bc-save{margin-top:12px;background:linear-gradient(135deg,#e53935,#b71c1c);color:#fff;}',
      '@media (max-width:640px){#bcConsent .bc-actions{width:100%;}#bcConsent .bc-actions button{flex:1;}}'
    ].join('');
    document.head.appendChild(s);
  }

  function categoryRow(key, title, desc, locked) {
    return '<div class="bc-cat"><div><h4>' + title + '</h4><small>' + desc + '</small></div>' +
      '<label class="bc-sw"><input type="checkbox" data-cat="' + key + '"' + (locked ? ' checked disabled' : '') + '><span class="bc-sl"></span></label></div>';
  }

  function build() {
    css();
    var wrap = document.createElement('div');
    wrap.id = 'bcConsent';
    wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-label', 'Privacy consent');
    wrap.innerHTML =
      '<div class="bc-card"><div class="bc-row"><div class="bc-text">' +
      '<h3>Your Privacy, Your Choice</h3>' +
      '<p>We use essential technologies to operate and secure our website. With your permission, we may also collect information about your device, browsing activity, interactions, referral source, and preferences to understand engagement, personalize your experience, improve our services, and support relevant communications. Where you voluntarily provide contact details, we may associate your website interactions with your CRM profile. See our <a href="/privacy-policy">Privacy Policy</a>. You can accept all optional technologies, continue with necessary technologies only, or manage your preferences at any time.</p>' +
      '</div><div class="bc-actions">' +
      '<button class="bc-manage" id="bcManage">Manage Preferences</button>' +
      '<button class="bc-nec" id="bcNec">Necessary Only</button>' +
      '<button class="bc-accept" id="bcAll">Accept All</button>' +
      '</div></div>' +
      '<div class="bc-prefs" id="bcPrefs">' +
      categoryRow('necessary', 'Strictly Necessary', 'Required for core functionality and security (load balancing, fraud prevention, your consent choice, and your IP address for security). Always on.', true) +
      categoryRow('analytics', 'Analytics', 'Helps us understand engagement — device, browser, approximate location, referral source, pages viewed, and session activity.', false) +
      categoryRow('personalization', 'Personalization', 'Tailors your experience and remembers your preferences across pages and visits.', false) +
      categoryRow('marketing', 'Marketing', 'Supports relevant recommendations and communications, and links your interactions to your CRM profile where you provide contact details.', false) +
      '<button class="bc-save" id="bcSave">Save Preferences</button></div></div>';
    document.body.appendChild(wrap);

    document.getElementById('bcAll').onclick = function () { saveChoice('all', { analytics: true, personalization: true, marketing: true }); };
    document.getElementById('bcNec').onclick = function () { saveChoice('necessary', { analytics: false, personalization: false, marketing: false }); };
    document.getElementById('bcManage').onclick = function () { document.getElementById('bcPrefs').classList.toggle('open'); };
    document.getElementById('bcSave').onclick = function () {
      var cats = {};
      wrap.querySelectorAll('input[data-cat]').forEach(function (i) { if (i.dataset.cat !== 'necessary') cats[i.dataset.cat] = i.checked; });
      saveChoice('custom', cats);
    };
  }
  function hideBanner() { var el = document.getElementById('bcConsent'); if (el) el.remove(); }

  // ---------- boot ----------
  function boot() {
    initSession();
    var stored = getCookie(COOKIE);
    if (stored) {
      try { var c = JSON.parse(stored); if (c.categories && c.categories.analytics) startActivityBeacon(); } catch (e) {}
      return; // already chose
    }
    build();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
