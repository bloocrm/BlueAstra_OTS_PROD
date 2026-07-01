/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   API CONFIGURATION
   Central place to resolve the backend base URL.
   ===================================================== */

(function () {
    // Allow runtime override (e.g. localStorage.setItem('bloo_api_base', 'https://api.example.com/api'))
    const override = (typeof localStorage !== 'undefined') && localStorage.getItem('bloo_api_base');

    let base;
    if (override) {
        base = override;
    } else if (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http')) {
        // Served over http(s): use a SAME-ORIGIN relative path. A reverse proxy
        // (e.g. nginx) must forward /api to the backend on localhost:5000.
        // This avoids cross-origin/mixed-content/port-exposure failures.
        base = '/api';
    } else {
        // Opened via file:// (no origin) — fall back to localhost backend
        base = 'http://localhost:5000/api';
    }

    window.API_BASE_URL = base.replace(/\/+$/, '');
})();
