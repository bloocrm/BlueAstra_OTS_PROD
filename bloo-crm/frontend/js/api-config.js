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
        // Served over http(s): assume the API is reachable on port 5000 of the same host
        base = `${window.location.protocol}//${window.location.hostname}:5000/api`;
    } else {
        // Opened via file:// (no origin) — fall back to localhost backend
        base = 'http://localhost:5000/api';
    }

    window.API_BASE_URL = base.replace(/\/+$/, '');
})();
