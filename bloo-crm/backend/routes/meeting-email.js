/* =====================================================
   MEETING EMAIL API ROUTES
   Send meeting invitations via email
   ===================================================== */

const express = require('express');
const router = express.Router();
const emailService = require('../utils/email-service');

/**
 * POST /api/meeting/send-invite
 * Send meeting invitation email
 */
router.post('/meeting/send-invite', async (req, res) => {
    try {
        const { meetingTitle, providerName, clientName, clientEmail, agenda, senderEmail, senderName } = req.body;

        // Validate required fields
        if (!meetingTitle || !providerName || !clientName || !clientEmail || !agenda) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: meetingTitle, providerName, clientName, clientEmail, agenda'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(clientEmail)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email address format'
            });
        }

        // Validate agenda length
        if (agenda.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Agenda cannot be empty'
            });
        }

        // Send email
        const result = await emailService.sendMeetingInvite({
            meetingTitle: meetingTitle.trim(),
            providerName: providerName.trim(),
            clientName: clientName.trim(),
            clientEmail: clientEmail.trim(),
            agenda: agenda.trim(),
            senderEmail: senderEmail || null,
            senderName: senderName || 'Bloo CRM',
            meetingTime: new Date().toLocaleString()
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

module.exports = router;
