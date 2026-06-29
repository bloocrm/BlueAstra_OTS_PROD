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
