/* =====================================================
   HELP & KNOWLEDGE BASE — troubleshooting articles + FAQ + search
   ===================================================== */

const HELP_ARTICLES = [
    {
        title: 'I logged in but my clients / leads are missing',
        body: `Your clients and leads are stored securely in the cloud (MongoDB), not just your browser.
1. Make sure you are logged in with the same account you created them under.
2. Do a hard refresh: press Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac).
3. Open the Clients or Leads tab — records reload automatically on login.
If they are still missing, contact Customer Care.`
    },
    {
        title: 'Connecting Microsoft Outlook to the Email Client',
        body: `Go to the Email section and click "Connect" under Microsoft Outlook. You'll be taken to Microsoft's secure sign-in page — enter your Outlook credentials and complete any 2-factor / security-key step there. After you consent, you're returned to the Email Client and your inbox downloads automatically.
Tip: emails are stored so they show every time you open the page. Click "Sync" to pull the latest. Attachments only download when you click them.`
    },
    {
        title: 'A meeting invite email did not arrive',
        body: `When you click "Start Meeting" and enter an email, an invite with a join link is emailed to that address.
1. Check the recipient's Spam / Junk folder — first messages from a new sender can land there.
2. Confirm the email address was typed correctly.
3. The invite is sent from the company's verified sender; the join link lets guests join by name or by signing in.
If invites consistently don't arrive, contact Customer Care so we can verify the email configuration.`
    },
    {
        title: 'Meeting recording / transcript is not showing',
        body: `Recording is captured in your browser when you start a meeting — allow the microphone / "share tab audio" prompt so all participants are captured.
The transcript is generated automatically after the meeting ends. If the transcript is blank, the transcription service may need to be enabled by your administrator. The recording and meeting minutes are always saved and searchable in the Meeting Room.`
    },
    {
        title: 'Applying for leave and approvals',
        body: `Open the Employee Dashboard → Leave → "Apply for Leave". The request goes to the employee's Manager for approval.
Backup routing: if the approving manager is themselves on leave, the request automatically routes to that manager's Backup / Alternate employee. Set each employee's Manager and Backup on their record in the Employees section.`
    },
    {
        title: 'Assigning a workflow task to an employee',
        body: `Open the Workflow tab → "Assign Task to Employee". Enter the task and the employee's name (it must match an employee record that has an email).
If the assigned employee is on leave, the notification email is automatically sent to their Backup employee instead, so nothing is missed.`
    },
    {
        title: 'Publishing a company policy to all employees',
        body: `Employee Dashboard → Policies → "Create Policy", then click "Publish to Employees". The policy is emailed to every employee that has an email address on their record. Make sure employees have email addresses saved first.`
    },
    {
        title: 'The page looks broken or a section is empty',
        body: `Almost always fixed by a hard refresh: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac) — this clears the cached version and reloads the latest.
Also make sure you're on https://bloocrm.com. If a specific section stays empty after a hard refresh, note what you clicked and contact Customer Care.`
    }
];

const HELP_FAQS = [
    { q: 'How do I add a new client or lead?', a: 'Go to the Clients or Leads tab and click "Add". Fill in the details and save — the record is stored in the cloud and gets a unique ID.' },
    { q: 'Is my data saved if I log out?', a: 'Yes. Clients, leads, meetings, employees, policies and more are stored in the cloud (MongoDB) and reload when you log back in — on any device.' },
    { q: 'How is sensitive information (like SSN) protected?', a: 'PII fields such as SSN are encrypted at rest with AES-256 and are never shown in normal listings. The site runs entirely over HTTPS.' },
    { q: 'Why do I have to type my Outlook password on a Microsoft page?', a: "Microsoft requires secure OAuth sign-in — your password (and security key) are entered on Microsoft's own page, never stored by Bloo CRM. We only receive a secure access token." },
    { q: 'Can others join my meeting without an account?', a: 'Yes. The meeting link lets people join as a guest (just enter a name) or sign in. As the host you can admit guests from the lobby.' },
    { q: 'How do I file a complaint or grievance?', a: 'Use the Grievance tab → "Add New Complaint". You get a tracking ID and can follow its status.' },
    { q: 'How do I change what shows on the dashboard charts?', a: 'The dashboard charts (conversion donut, employee status, calendar metrics) update automatically from your live data as you add clients, leads, meetings and employees.' },
    { q: 'Who do I contact for urgent help?', a: 'Call Customer Care at 1-800-CALL-BLOO-CRM, or file a Grievance in the app for tracked follow-up.' }
];

function loadHelp() {
    const artEl = document.getElementById('helpArticles');
    const faqEl = document.getElementById('helpFaqs');
    if (artEl) {
        artEl.innerHTML = HELP_ARTICLES.map((a, i) => `
            <div class="help-item" data-text="${escH((a.title + ' ' + a.body).toLowerCase())}" style="border-bottom:1px solid #eee;">
                <div onclick="toggleHelp('art${i}')" style="cursor:pointer;padding:12px 4px;display:flex;justify-content:space-between;align-items:center;font-weight:600;">
                    <span><i class="fas fa-book-open" style="color:#cc0000;"></i> ${escH(a.title)}</span>
                    <i class="fas fa-chevron-down" id="ico-art${i}" style="color:#888;"></i>
                </div>
                <div id="art${i}" style="display:none;padding:0 4px 14px;color:#444;white-space:pre-wrap;line-height:1.55;">${escH(a.body)}</div>
            </div>`).join('');
    }
    if (faqEl) {
        faqEl.innerHTML = HELP_FAQS.map((f, i) => `
            <div class="help-item" data-text="${escH((f.q + ' ' + f.a).toLowerCase())}" style="border-bottom:1px solid #eee;">
                <div onclick="toggleHelp('faq${i}')" style="cursor:pointer;padding:12px 4px;display:flex;justify-content:space-between;align-items:center;font-weight:600;">
                    <span><i class="fas fa-question-circle" style="color:#cc0000;"></i> ${escH(f.q)}</span>
                    <i class="fas fa-chevron-down" id="ico-faq${i}" style="color:#888;"></i>
                </div>
                <div id="faq${i}" style="display:none;padding:0 4px 14px;color:#444;line-height:1.55;">${escH(f.a)}</div>
            </div>`).join('');
    }
}

function toggleHelp(id) {
    const body = document.getElementById(id);
    const ico = document.getElementById('ico-' + id);
    if (!body) return;
    const open = body.style.display === 'block';
    body.style.display = open ? 'none' : 'block';
    if (ico) ico.className = open ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
}

function filterHelp() {
    const q = (document.getElementById('helpSearch')?.value || '').trim().toLowerCase();
    let visible = 0;
    document.querySelectorAll('#help .help-item').forEach(el => {
        const match = !q || (el.getAttribute('data-text') || '').includes(q);
        el.style.display = match ? '' : 'none';
        if (match) visible++;
    });
    const none = document.getElementById('helpNoResults');
    if (none) none.style.display = visible === 0 ? 'block' : 'none';
}

function escH(t) {
    return String(t || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}
