/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   MEETING EMAIL API ROUTES
   Send meeting invitations via email
   ===================================================== */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const emailService = require('../utils/email-service');
const { verifyToken } = require('../middleware/auth');
const User = require('../models/User');

const MEETING_PROVIDERS = ['zoom', 'google-meet', 'microsoft-teams', 'webex', 'jitsi', 'whereby'];

// JaaS (Jitsi-as-a-Service) — authenticated meetings with host moderator + guest lobby
function getJaasPrivateKey() {
    if (process.env.JAAS_PRIVATE_KEY_PATH) {
        try { return require('fs').readFileSync(process.env.JAAS_PRIVATE_KEY_PATH, 'utf8'); } catch (e) { return null; }
    }
    return process.env.JAAS_PRIVATE_KEY ? process.env.JAAS_PRIVATE_KEY.replace(/\\n/g, '\n') : null;
}

function jaasConfigured() {
    return !!(process.env.JAAS_APP_ID && process.env.JAAS_KID && getJaasPrivateKey());
}

function signJaasToken({ room, name, email, moderator }) {
    const now = Math.floor(Date.now() / 1000);
    const privateKey = getJaasPrivateKey();
    return jwt.sign(
        {
            aud: 'jitsi',
            iss: 'chat',
            sub: process.env.JAAS_APP_ID,
            room,
            exp: now + 4 * 3600,
            nbf: now - 10,
            context: {
                user: {
                    name: name || 'User',
                    email: email || '',
                    id: email || name || 'user',
                    moderator: moderator ? 'true' : 'false'
                },
                features: { recording: 'true', livestreaming: 'false', transcription: 'false', 'outbound-call': 'false' }
            }
        },
        privateKey,
        { algorithm: 'RS256', header: { kid: process.env.JAAS_KID, typ: 'JWT' } }
    );
}

/**
 * POST /api/meeting/jaas-create
 * Returns an authenticated host link (moderator) + guest link (lobby) for a new
 * meeting. Falls back to a public Jitsi room if JaaS isn't configured.
 */
router.post('/meeting/jaas-create', verifyToken, async (req, res) => {
    try {
        const title = (req.body.title || 'Meeting').toString();
        const slug = `BlooCRM-${title.replace(/[^a-zA-Z0-9]+/g, '-')}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

        if (!jaasConfigured()) {
            const url = `https://meet.jit.si/${slug}`;
            return res.json({ provider: 'jitsi-public', room: slug, hostUrl: url, guestUrl: url, authenticated: false });
        }

        const hostToken = signJaasToken({ room: slug, name: req.body.hostName || req.userName, email: req.body.hostEmail || req.userEmail, moderator: true });
        const guestToken = signJaasToken({ room: slug, name: req.body.guestName || 'Guest', email: '', moderator: false });
        const base = `https://8x8.vc/${process.env.JAAS_APP_ID}/${slug}`;

        return res.json({
            provider: 'jaas',
            room: slug,
            hostUrl: `${base}?jwt=${hostToken}`,
            guestUrl: `${base}?jwt=${guestToken}`,
            authenticated: true
        });
    } catch (error) {
        console.error('JaaS create error:', error);
        res.status(500).json({ error: 'Failed to create meeting', message: error.message });
    }
});

/**
 * POST /api/meeting/send-invite
 * Send meeting invitation email
 */
router.post('/meeting/send-invite', async (req, res) => {
    try {
        let { meetingTitle, providerName, clientName, clientEmail, agenda, senderEmail, senderName, meetingTime, meetingUrl, record, attachment } = req.body;

        // Validate email (only mandatory field)
        if (!clientEmail || clientEmail.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Client email is required'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(clientEmail.trim())) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email address format'
            });
        }

        // Set defaults for optional fields
        meetingTitle = meetingTitle?.trim() || 'Meeting';
        providerName = providerName?.trim() || 'Video Conference';
        clientName = clientName?.trim() || 'Client';
        agenda = agenda?.trim() || 'Meeting discussion';

        // Send email
        const result = await emailService.sendMeetingInvite({
            meetingTitle: meetingTitle,
            providerName: providerName,
            clientName: clientName,
            clientEmail: clientEmail.trim(),
            agenda: agenda,
            senderEmail: senderEmail || null,
            senderName: senderName || 'Bloo CRM',
            meetingTime: (meetingTime && String(meetingTime).trim()) || new Date().toLocaleString(),
            meetingUrl: (meetingUrl && String(meetingUrl).trim()) || null,
            record: !!record,
            attachment: (attachment && attachment.data) ? attachment : null
        });

        if (result.success) {
            return res.status(200).json({
                success: true,
                message: `Meeting invitation sent to ${clientEmail}`,
                messageId: result.messageId,
                mock: result.mock || false
            });
        } else {
            return res.status(500).json({
                success: false,
                error: result.error || 'Failed to send email'
            });
        }
    } catch (error) {
        console.error('Error sending meeting invite:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
});

/**
 * GET /api/meeting/email-status
 * Check email service status
 */
router.get('/meeting/email-status', async (req, res) => {
    try {
        const status = await emailService.verifyConnection();
        res.status(status.success ? 200 : 500).json(status);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ---- Connected meeting providers (per user, stored in MongoDB) ----
// Record the meeting service the user connected under the Meeting Room.
router.post('/meeting/providers/connect', verifyToken, async (req, res) => {
  try {
    const provider = String((req.body && req.body.provider) || '');
    if (!MEETING_PROVIDERS.includes(provider)) return res.status(400).json({ error: 'unknown_provider' });
    const name = String((req.body && req.body.name) || provider);
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'user_not_found' });
    if (!Array.isArray(user.connectedVideoProviders)) user.connectedVideoProviders = [];
    user.connectedVideoProviders = user.connectedVideoProviders.filter(p => p.provider !== provider);
    user.connectedVideoProviders.push({ provider, name, connectedAt: new Date() });
    await user.save();
    res.json({ status: 'success', provider, connectedVideoProviders: user.connectedVideoProviders });
  } catch (e) { res.status(500).json({ error: 'Failed to connect provider', message: e.message }); }
});

router.get('/meeting/providers', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('connectedVideoProviders').lean();
    res.json({ status: 'success', connectedVideoProviders: (user && user.connectedVideoProviders) || [] });
  } catch (e) { res.status(500).json({ error: 'Failed to list providers', message: e.message }); }
});

router.delete('/meeting/providers/:provider', verifyToken, async (req, res) => {
  try {
    const provider = req.params.provider;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'user_not_found' });
    user.connectedVideoProviders = (user.connectedVideoProviders || []).filter(p => p.provider !== provider);
    await user.save();
    res.json({ status: 'success', disconnected: provider });
  } catch (e) { res.status(500).json({ error: 'Failed to disconnect provider', message: e.message }); }
});

module.exports = router;
