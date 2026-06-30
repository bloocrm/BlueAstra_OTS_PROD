/* =====================================================
   EMAIL CLIENT API ROUTES
   ===================================================== */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Email = require('../models/Email');
const { verifyToken } = require('../middleware/auth');

// File upload configuration
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

// Email storage (in production, use database)
let emailStorage = new Map();
let sentEmails = new Map();

// Send Email Route
router.post('/email/send', upload.array('attachments', 5), async (req, res) => {
    try {
        const { connectionId, to, cc, bcc, subject, body } = req.body;

        // Validate required fields
        if (!connectionId || !to || !subject || !body) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Parse recipients
        const toList = to.split(/[,;]/).map(e => e.trim()).filter(e => e);
        const ccList = cc ? cc.split(/[,;]/).map(e => e.trim()).filter(e => e) : [];
        const bccList = bcc ? bcc.split(/[,;]/).map(e => e.trim()).filter(e => e) : [];

        // Prepare attachments
        const attachments = (req.files || []).map(file => ({
            filename: file.originalname,
            data: file.buffer,
            size: file.size,
            mimetype: file.mimetype
        }));

        const emailId = 'email_' + Date.now() + '_' + Math.random().toString(36).substring(7);
        const emailData = {
            id: emailId,
            connectionId,
            from: req.user?.email || 'sender@example.com',
            to: toList,
            cc: ccList,
            bcc: bccList,
            subject,
            body,
            attachments,
            date: new Date().toISOString(),
            status: 'sent',
            folder: 'sent',
            read: true
        };

        // Store sent email
        sentEmails.set(emailId, emailData);

        // Send through provider API (simplified - in production, integrate with actual provider APIs)
        const result = await sendEmailThroughProvider(connectionId, emailData);

        res.json({
            status: 'success',
            message: 'Email sent successfully',
            emailId,
            result
        });
    } catch (error) {
        console.error('Email send error:', error);
        res.status(500).json({ error: 'Failed to send email', message: error.message });
    }
});

// Save Draft Route
router.post('/email/draft', upload.array('attachments', 5), async (req, res) => {
    try {
        const { connectionId, to, cc, subject, body } = req.body;

        const draftId = 'draft_' + Date.now();
        const attachments = (req.files || []).map(file => ({
            filename: file.originalname,
            size: file.size
        }));

        const draft = {
            id: draftId,
            connectionId,
            to,
            cc,
            subject,
            body,
            attachments,
            date: new Date().toISOString(),
            status: 'draft',
            folder: 'drafts'
        };

        emailStorage.set(draftId, draft);

        res.json({
            status: 'success',
            message: 'Draft saved',
            draftId,
            draft
        });
    } catch (error) {
        console.error('Draft save error:', error);
        res.status(500).json({ error: 'Failed to save draft', message: error.message });
    }
});

// Get Emails by Folder
router.get('/email/folder/:folder', async (req, res) => {
    try {
        const { folder } = req.params;
        const connectionId = req.query.connectionId;

        // In production, fetch from database
        const emails = Array.from(emailStorage.values())
            .filter(email => email.folder === folder && email.connectionId === connectionId)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json({
            status: 'success',
            folder,
            emails,
            count: emails.length
        });
    } catch (error) {
        console.error('Folder fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch emails', message: error.message });
    }
});

// Get Single Email
router.get('/email/:emailId', async (req, res) => {
    try {
        const { emailId } = req.params;

        const email = emailStorage.get(emailId) || sentEmails.get(emailId);
        if (!email) {
            return res.status(404).json({ error: 'Email not found' });
        }

        res.json({
            status: 'success',
            email
        });
    } catch (error) {
        console.error('Email fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch email', message: error.message });
    }
});

// Delete Email
router.post('/email/delete/:emailId', async (req, res) => {
    try {
        const { emailId } = req.params;

        if (emailStorage.has(emailId)) {
            emailStorage.delete(emailId);
        } else if (sentEmails.has(emailId)) {
            sentEmails.delete(emailId);
        } else {
            return res.status(404).json({ error: 'Email not found' });
        }

        res.json({
            status: 'success',
            message: 'Email deleted'
        });
    } catch (error) {
        console.error('Email delete error:', error);
        res.status(500).json({ error: 'Failed to delete email', message: error.message });
    }
});

// Mark Email as Read
router.post('/email/:emailId/read', async (req, res) => {
    try {
        const { emailId } = req.params;
        const { read } = req.body;

        const email = emailStorage.get(emailId) || sentEmails.get(emailId);
        if (!email) {
            return res.status(404).json({ error: 'Email not found' });
        }

        email.read = read;

        res.json({
            status: 'success',
            message: 'Email status updated'
        });
    } catch (error) {
        console.error('Email status update error:', error);
        res.status(500).json({ error: 'Failed to update email', message: error.message });
    }
});

// Reply to Email
router.post('/email/reply/:emailId', async (req, res) => {
    try {
        const { emailId } = req.params;
        const { subject, body, to, cc } = req.body;

        const originalEmail = emailStorage.get(emailId) || sentEmails.get(emailId);
        if (!originalEmail) {
            return res.status(404).json({ error: 'Original email not found' });
        }

        const replyId = 'email_' + Date.now();
        const reply = {
            id: replyId,
            connectionId: originalEmail.connectionId,
            from: originalEmail.to[0] || 'reply@example.com',
            to: originalEmail.from,
            cc: cc || '',
            subject: subject || `Re: ${originalEmail.subject}`,
            body,
            inReplyTo: emailId,
            date: new Date().toISOString(),
            status: 'sent',
            folder: 'sent',
            read: true
        };

        sentEmails.set(replyId, reply);

        res.json({
            status: 'success',
            message: 'Reply sent',
            replyId,
            reply
        });
    } catch (error) {
        console.error('Reply send error:', error);
        res.status(500).json({ error: 'Failed to send reply', message: error.message });
    }
});

// Forward Email
router.post('/email/forward/:emailId', upload.array('attachments', 5), async (req, res) => {
    try {
        const { emailId } = req.params;
        const { to, subject, body } = req.body;

        const originalEmail = emailStorage.get(emailId) || sentEmails.get(emailId);
        if (!originalEmail) {
            return res.status(404).json({ error: 'Original email not found' });
        }

        const forwardId = 'email_' + Date.now();
        const forward = {
            id: forwardId,
            connectionId: originalEmail.connectionId,
            from: originalEmail.to[0] || 'sender@example.com',
            to: to.split(/[,;]/).map(e => e.trim()).filter(e => e),
            subject: subject || `Fw: ${originalEmail.subject}`,
            body: body + '\n\n---------- Forwarded message ----------\n' +
                  `From: ${originalEmail.from}\n` +
                  `Date: ${originalEmail.date}\n` +
                  `Subject: ${originalEmail.subject}\n\n` +
                  originalEmail.body,
            forwardedFrom: emailId,
            date: new Date().toISOString(),
            status: 'sent',
            folder: 'sent',
            read: true
        };

        sentEmails.set(forwardId, forward);

        res.json({
            status: 'success',
            message: 'Email forwarded',
            forwardId,
            forward
        });
    } catch (error) {
        console.error('Forward error:', error);
        res.status(500).json({ error: 'Failed to forward email', message: error.message });
    }
});

// Search Emails
router.get('/email/search', async (req, res) => {
    try {
        const { query, connectionId } = req.query;

        const allEmails = Array.from(emailStorage.values()).concat(Array.from(sentEmails.values()));
        const results = allEmails.filter(email => {
            const matchConnection = !connectionId || email.connectionId === connectionId;
            const matchQuery = !query ||
                email.from.toLowerCase().includes(query.toLowerCase()) ||
                email.subject.toLowerCase().includes(query.toLowerCase()) ||
                email.body.toLowerCase().includes(query.toLowerCase());
            return matchConnection && matchQuery;
        });

        res.json({
            status: 'success',
            query,
            results,
            count: results.length
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed', message: error.message });
    }
});

// Download Attachment
router.get('/email/attachment/:emailId/:attachmentId', async (req, res) => {
    try {
        const { emailId, attachmentId } = req.params;

        const email = emailStorage.get(emailId) || sentEmails.get(emailId);
        if (!email || !email.attachments) {
            return res.status(404).json({ error: 'Attachment not found' });
        }

        const attachment = email.attachments[attachmentId];
        if (!attachment) {
            return res.status(404).json({ error: 'Attachment not found' });
        }

        res.setHeader('Content-Type', attachment.mimetype || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${attachment.filename}"`);
        res.send(attachment.data);
    } catch (error) {
        console.error('Attachment download error:', error);
        res.status(500).json({ error: 'Failed to download attachment', message: error.message });
    }
});

// Get Email Statistics
router.get('/email/stats', async (req, res) => {
    try {
        const { connectionId } = req.query;

        const allEmails = Array.from(emailStorage.values()).concat(Array.from(sentEmails.values()))
            .filter(e => !connectionId || e.connectionId === connectionId);

        const stats = {
            total: allEmails.length,
            inbox: allEmails.filter(e => e.folder === 'inbox').length,
            sent: allEmails.filter(e => e.folder === 'sent').length,
            drafts: allEmails.filter(e => e.folder === 'drafts').length,
            trash: allEmails.filter(e => e.folder === 'trash').length,
            spam: allEmails.filter(e => e.folder === 'spam').length,
            unread: allEmails.filter(e => !e.read && e.folder === 'inbox').length
        };

        res.json({
            status: 'success',
            stats
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Failed to get statistics', message: error.message });
    }
});

// =====================================================
// MONGODB-BACKED EMAIL STORE (authenticated, per user)
// Downloads from the provider (sent by the frontend after OAuth) are
// persisted here, and the client reads its inbox from MongoDB.
// =====================================================

// Store/sync a batch of downloaded emails into MongoDB for the logged-in user
router.post('/email/store', verifyToken, async (req, res) => {
    try {
        const provider = (req.body.provider || 'outlook').toLowerCase();
        const emails = Array.isArray(req.body.emails) ? req.body.emails : [];
        let stored = 0;

        for (const e of emails) {
            if (!e || !e.externalId) continue;
            try {
                await Email.findOneAndUpdate(
                    { userId: req.userId, provider, externalId: String(e.externalId) },
                    {
                        userId: req.userId,
                        provider,
                        externalId: String(e.externalId),
                        messageId: `${provider}:${e.externalId}`,
                        from: { email: e.from || '', name: e.fromName || '' },
                        to: e.to ? [{ email: e.to }] : [],
                        subject: e.subject || '(No subject)',
                        body: e.body || '',
                        bodyPlain: e.body || '',
                        receivedDate: e.date ? new Date(e.date) : new Date(),
                        isRead: !!e.isRead,
                        folder: 'inbox',
                        syncedAt: new Date()
                    },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
                stored++;
            } catch (err) {
                console.error('Email upsert error:', err.message);
            }
        }

        res.json({ status: 'success', stored });
    } catch (error) {
        console.error('Email store error:', error);
        res.status(500).json({ error: 'Failed to store emails', message: error.message });
    }
});

// List the logged-in user's emails from MongoDB
router.get('/email/list', verifyToken, async (req, res) => {
    try {
        const query = { userId: req.userId, deletedAt: null };
        if (req.query.provider) query.provider = String(req.query.provider).toLowerCase();
        if (req.query.folder) query.folder = req.query.folder;

        const emails = await Email.find(query)
            .sort({ receivedDate: -1 })
            .limit(200)
            .lean();

        res.json({ status: 'success', count: emails.length, emails });
    } catch (error) {
        console.error('Email list error:', error);
        res.status(500).json({ error: 'Failed to list emails', message: error.message });
    }
});

// Helper function to send email through provider
async function sendEmailThroughProvider(connectionId, emailData) {
    // This function would integrate with specific provider APIs
    // For now, we'll simulate successful sending
    console.log(`Sending email through provider for connection ${connectionId}`);

    // In production:
    // 1. Look up the connection to get the provider and access token
    // 2. Call the appropriate provider API (Gmail, Outlook, etc.)
    // 3. Handle provider-specific requirements and formatting

    return {
        provider: 'generic',
        messageId: 'msg_' + Date.now(),
        sent: true
    };
}

module.exports = router;
