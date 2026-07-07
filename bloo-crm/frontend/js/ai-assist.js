/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  Proprietary software. Unauthorized copying, modification, or use by any means
  or technology (including AI tools) is strictly prohibited.
*/
/* =====================================================
   AI ASSIST — floating, context-aware co-pilot on every page
   ===================================================== */
(function () {
    function apiBase() { return (window.API_BASE_URL || 'http://localhost:5000/api'); }
    function token() { return localStorage.getItem('authToken'); }
    function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m])); }

    // Determine the current tab/context + any data to send
    function getContext() {
        if (location.pathname.indexOf('email-client') !== -1) {
            const items = [];
            try {
                const ec = window.emailClient;
                if (ec && ec.emails) ec.emails.forEach(e => items.push({ from: e.from, subject: e.subject, snippet: String(e.body || '').slice(0, 200) }));
            } catch (e) {}
            return { context: 'email', label: 'Email Inbox', items: items.slice(0, 25) };
        }
        const view = document.querySelector('.view.active');
        const id = view ? view.id : 'dashboard';
        let label = id;
        try { label = (document.querySelector('.nav-item.active span')?.textContent || id).trim(); } catch (e) {}
        return { context: id, label, items: [] };
    }

    function injectStyles() {
        if (document.getElementById('aiAssistStyles')) return;
        const s = document.createElement('style');
        s.id = 'aiAssistStyles';
        s.textContent = `
        #aiAssistFab{position:fixed;bottom:22px;right:22px;z-index:99998;background:#cc0000;color:#fff;border:none;border-radius:30px;padding:12px 18px;font-weight:700;cursor:grab;box-shadow:0 6px 18px rgba(0,0,0,0.25);display:flex;align-items:center;gap:8px;font-size:0.95rem;touch-action:none;user-select:none;-webkit-user-select:none;}
        #aiAssistFab.aa-dragging{cursor:grabbing;box-shadow:0 12px 28px rgba(0,0,0,0.35);opacity:0.96;}
        #aiAssistFab:hover{background:#a30000;}
        #aiAssistPanel{position:fixed;top:0;right:-420px;width:390px;max-width:92vw;height:100%;background:#fff;z-index:99999;box-shadow:-4px 0 24px rgba(0,0,0,0.2);transition:right .28s ease;display:flex;flex-direction:column;}
        #aiAssistPanel.open{right:0;}
        #aiAssistPanel .aa-head{background:#cc0000;color:#fff;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;}
        #aiAssistPanel .aa-body{padding:14px 16px;overflow:auto;flex:1;font-size:0.9rem;color:#333;}
        #aiAssistPanel .aa-sec{margin-bottom:14px;}
        #aiAssistPanel .aa-sec h4{margin:0 0 6px;font-size:0.9rem;}
        #aiAssistPanel .aa-sec ul{margin:4px 0;padding-left:18px;}
        #aiAssistClose{background:none;border:none;color:#fff;font-size:1.4rem;cursor:pointer;line-height:1;}
        `;
        document.head.appendChild(s);
    }

    function buildUI() {
        if (document.getElementById('aiAssistFab')) return;
        injectStyles();
        const fab = document.createElement('button');
        fab.id = 'aiAssistFab';
        fab.innerHTML = '<i class="fas fa-robot"></i> AI Assist';
        fab.title = 'Drag to move · click to open';
        document.body.appendChild(fab);
        makeFabDraggable(fab);

        const panel = document.createElement('div');
        panel.id = 'aiAssistPanel';
        panel.innerHTML = `
            <div class="aa-head"><span><i class="fas fa-robot"></i> AI Assist</span><button id="aiAssistClose">&times;</button></div>
            <div class="aa-body" id="aiAssistBody"><p style="color:#888;">Click below to analyze this page.</p></div>`;
        document.body.appendChild(panel);
        panel.querySelector('#aiAssistClose').onclick = () => panel.classList.remove('open');

        // Hide the floating Assist on the AI Insights tab (it has its own panels)
        setInterval(function () {
            const ai = document.getElementById('ai-insights');
            const onAiInsights = ai && ai.classList.contains('active');
            fab.style.display = onAiInsights ? 'none' : 'flex';
            if (onAiInsights) panel.classList.remove('open');
        }, 700);
    }

    // Let the user drag the AI Assist button anywhere; remember where they left it.
    function makeFabDraggable(fab) {
        const KEY = 'aiAssistFabPos';
        let dragging = false, moved = false, startX = 0, startY = 0, offX = 0, offY = 0;

        function clampAndPlace(left, top) {
            const r = fab.getBoundingClientRect();
            const maxLeft = window.innerWidth - r.width - 4;
            const maxTop = window.innerHeight - r.height - 4;
            left = Math.max(4, Math.min(left, Math.max(4, maxLeft)));
            top = Math.max(4, Math.min(top, Math.max(4, maxTop)));
            fab.style.left = left + 'px';
            fab.style.top = top + 'px';
            fab.style.right = 'auto';
            fab.style.bottom = 'auto';
            return { left, top };
        }

        // Restore a saved position (once the button has a measurable size)
        try {
            const p = JSON.parse(localStorage.getItem(KEY) || 'null');
            if (p && isFinite(p.left) && isFinite(p.top)) {
                requestAnimationFrame(() => clampAndPlace(p.left, p.top));
            }
        } catch (e) {}

        fab.addEventListener('pointerdown', function (e) {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            dragging = true; moved = false;
            const r = fab.getBoundingClientRect();
            offX = e.clientX - r.left; offY = e.clientY - r.top;
            startX = e.clientX; startY = e.clientY;
            try { fab.setPointerCapture(e.pointerId); } catch (_) {}
        });

        fab.addEventListener('pointermove', function (e) {
            if (!dragging) return;
            if (!moved && (Math.abs(e.clientX - startX) > 4 || Math.abs(e.clientY - startY) > 4)) {
                moved = true; fab.classList.add('aa-dragging');
            }
            if (moved) { e.preventDefault(); clampAndPlace(e.clientX - offX, e.clientY - offY); }
        });

        function endDrag(e) {
            if (!dragging) return;
            dragging = false;
            fab.classList.remove('aa-dragging');
            try { fab.releasePointerCapture(e.pointerId); } catch (_) {}
            if (moved) {
                const r = fab.getBoundingClientRect();
                try { localStorage.setItem(KEY, JSON.stringify({ left: r.left, top: r.top })); } catch (_) {}
            }
        }
        fab.addEventListener('pointerup', endDrag);
        fab.addEventListener('pointercancel', endDrag);

        // A real click (not a drag) opens the assistant
        fab.addEventListener('click', function (e) {
            if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; return; }
            openAssist();
        });

        // Keep it on-screen if the window is resized
        window.addEventListener('resize', function () {
            if (fab.style.left) clampAndPlace(parseFloat(fab.style.left), parseFloat(fab.style.top));
        });
    }

    function section(title, icon, items, color) {
        if (!items || !items.length) return '';
        return `<div class="aa-sec"><h4 style="color:${color};"><i class="fas ${icon}"></i> ${title}</h4><ul>${items.map(x => '<li>' + esc(x) + '</li>').join('')}</ul></div>`;
    }

    async function openAssist() {
        const panel = document.getElementById('aiAssistPanel');
        const body = document.getElementById('aiAssistBody');
        panel.classList.add('open');
        if (!token()) { body.innerHTML = '<p style="color:#e74c3c;">Please log in to use AI Assist.</p>'; return; }
        const ctx = getContext();
        body.innerHTML = `<p style="color:#888;">Analyzing <strong>${esc(ctx.label)}</strong>…</p>`;
        try {
            const resp = await fetch(apiBase() + '/ai/assist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() },
                body: JSON.stringify({ context: ctx.context, items: ctx.items })
            });
            const d = await resp.json();
            if (!resp.ok) throw new Error(d.message || d.error || 'failed');
            const a = d.assist || {};
            body.innerHTML =
                `<div style="font-weight:600;margin-bottom:10px;">Insights for: ${esc(ctx.label)}</div>` +
                section('Insights', 'fa-lightbulb', a.insights, '#2d6cdf') +
                section('Recommendations', 'fa-check', a.recommendations, '#2ecc71') +
                section('Sales Pitches', 'fa-dollar-sign', a.salesPitches, '#8e44ad') +
                section('To-Dos', 'fa-tasks', a.todos, '#e67e22') +
                `<div style="font-size:0.72rem;color:#aaa;margin-top:8px;">${d.source === 'ai' ? 'AI analysis of this page' : 'Rule-based (enable OpenAI billing for deeper AI)'}</div>`;
        } catch (e) {
            body.innerHTML = `<p style="color:#e74c3c;">Could not analyze: ${esc(e.message)}</p>`;
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildUI);
    else buildUI();
})();
