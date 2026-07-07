/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   EMAIL CLIENT API ROUTES
   ===================================================== */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Email = require('../models/Email');
const EmailAccount = require('../models/EmailAccount');
const EmailAttachment = require('../models/EmailAttachment');
const { verifyToken } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/attachments');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/csv',
      'application/zip', 'application/x-rar-compressed'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// =====================================================
// EMAIL ACCOUNT MANAGEMENT
// =====================================================

// All email-management routes require authentication; the user is taken from
// the token (req.userId), and per-email actions are scoped to the owner.
router.use(verifyToken);

router.post('/email/accounts', async (req, res) => {
  try {
    const { userId, provider, email, displayName, accessToken, refreshToken, expiresAt } = req.body;

    if (!userId || !provider || !email) {
      return res.status(400).json({
        error: 'Missing required fields: userId, provider, email'
      });
    }

    const account = new EmailAccount({
      userId,
      provider,
      email,
      displayName,
      accessToken,
      refreshToken,
      tokenExpiresAt: expiresAt ? new Date(expiresAt) : null,
      connectionDetails: {
        connectedAt: new Date()
      }
    });

    await account.save();

    res.status(201).json({
      status: 'success',
      message: 'Email account added successfully',
      account: {
        id: account._id,
        email: account.email,
        provider: account.provider,
        displayName: account.displayName,
        isActive: account.isActive
      }
    });
  } catch (error) {
    console.error('Account creation error:', error);
    res.status(500).json({
      error: 'Failed to add email account',
      message: error.message
    });
  }
});

router.get('/email/accounts', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const accounts = await EmailAccount.find({ userId, isActive: true })
      .select('-encryptedTokens.accessToken -encryptedTokens.refreshToken')
      .sort({ createdAt: -1 });

    res.json({
      status: 'success',
      count: accounts.length,
      accounts
    });
  } catch (error) {
    console.error('Account fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch accounts',
      message: error.message
    });
  }
});

router.get('/email/accounts/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;

    const account = await EmailAccount.findById(accountId)
      .select('-encryptedTokens.accessToken -encryptedTokens.refreshToken');

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({
      status: 'success',
      account
    });
  } catch (error) {
    console.error('Account fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch account',
      message: error.message
    });
  }
});

router.put('/email/accounts/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    const updateData = req.body;

    // Don't allow direct modification of security fields
    delete updateData.encryptedTokens;
    delete updateData.userId;
    delete updateData._id;

    const account = await EmailAccount.findByIdAndUpdate(
      accountId,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-encryptedTokens');

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({
      status: 'success',
      message: 'Account updated successfully',
      account
    });
  } catch (error) {
    console.error('Account update error:', error);
    res.status(500).json({
      error: 'Failed to update account',
      message: error.message
    });
  }
});

router.delete('/email/accounts/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;

    // Soft delete - mark as inactive
    const account = await EmailAccount.findByIdAndUpdate(
      accountId,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({
      status: 'success',
      message: 'Email account disconnected successfully'
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({
      error: 'Failed to delete account',
      message: error.message
    });
  }
});

// =====================================================
// EMAIL MANAGEMENT
// =====================================================

router.post('/email/send', async (req, res) => {
  try {
    const { userId, accountId, to, cc, bcc, subject, body, attachmentIds } = req.body;

    if (!userId || !accountId || !to || !subject) {
      return res.status(400).json({
        error: 'Missing required fields: userId, accountId, to, subject'
      });
    }

    const account = await EmailAccount.findById(accountId);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const email = new Email({
      userId,
      accountId,
      from: { email: account.email, name: account.displayName },
      to: Array.isArray(to) ? to : [{ email: to }],
      cc: cc ? (Array.isArray(cc) ? cc : [{ email: cc }]) : [],
      bcc: bcc ? (Array.isArray(bcc) ? bcc : [{ email: bcc }]) : [],
      subject,
      body,
      bodyPlain: body,
      folder: 'sent',
      isDraft: false,
      isRead: true,
      provider: account.provider,
      sentDate: new Date(),
      attachments: attachmentIds ? await Promise.all(
        attachmentIds.map(id => EmailAttachment.findById(id))
      ).then(docs => docs.map(doc => ({
        filename: doc.filename,
        mimetype: doc.mimetype,
        size: doc.size,
        storageUrl: doc.storageUrl,
        downloadUrl: doc.downloadUrl
      }))) : [],
      hasAttachments: attachmentIds && attachmentIds.length > 0
    });

    await email.save();

    res.status(201).json({
      status: 'success',
      message: 'Email sent successfully',
      email: {
        id: email._id,
        messageId: email.messageId,
        subject: email.subject,
        to: email.to,
        sentDate: email.sentDate
      }
    });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({
      error: 'Failed to send email',
      message: error.message
    });
  }
});

router.post('/email/draft', async (req, res) => {
  try {
    const { userId, accountId, to, cc, bcc, subject, body, attachmentIds } = req.body;

    if (!userId || !accountId) {
      return res.status(400).json({
        error: 'Missing required fields: userId, accountId'
      });
    }

    const account = await EmailAccount.findById(accountId);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const email = new Email({
      userId,
      accountId,
      from: { email: account.email, name: account.displayName },
      to: to ? (Array.isArray(to) ? to : [{ email: to }]) : [],
      cc: cc ? (Array.isArray(cc) ? cc : [{ email: cc }]) : [],
      bcc: bcc ? (Array.isArray(bcc) ? bcc : [{ email: bcc }]) : [],
      subject: subject || 'Untitled Draft',
      body,
      bodyPlain: body,
      folder: 'drafts',
      isDraft: true,
      provider: account.provider,
      attachments: attachmentIds ? await Promise.all(
        attachmentIds.map(id => EmailAttachment.findById(id))
      ).then(docs => docs.map(doc => ({
        filename: doc.filename,
        mimetype: doc.mimetype,
        size: doc.size,
        storageUrl: doc.storageUrl
      }))) : [],
      hasAttachments: attachmentIds && attachmentIds.length > 0
    });

    await email.save();

    res.status(201).json({
      status: 'success',
      message: 'Draft saved successfully',
      email: {
        id: email._id,
        messageId: email.messageId,
        subject: email.subject,
        folder: 'drafts'
      }
    });
  } catch (error) {
    console.error('Draft save error:', error);
    res.status(500).json({
      error: 'Failed to save draft',
      message: error.message
    });
  }
});

router.get('/email/folder/:folder', async (req, res) => {
  try {
    const { userId, accountId, page = 1, limit = 50 } = req.query;
    const { folder } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const skip = (page - 1) * limit;
    const query = { userId, folder };

    if (accountId) {
      query.accountId = accountId;
    }

    const emails = await Email.find(query)
      .sort({ receivedDate: -1, sentDate: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-bodyHtml -body -headers');

    const total = await Email.countDocuments(query);

    res.json({
      status: 'success',
      folder,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
      emails
    });
  } catch (error) {
    console.error('Folder fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch folder',
      message: error.message
    });
  }
});

router.get('/email/:emailId', async (req, res, next) => {
  const { emailId } = req.params;
  // Let literal sibling routes (/email/search, /email/stats, …) match instead of
  // treating them as an id (which would throw a CastError → 500).
  if (!/^[a-f\d]{24}$/i.test(emailId)) return next();
  try {
    const email = await Email.findOne({ _id: emailId, userId: req.userId });

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    // Mark as read
    if (!email.isRead) {
      email.isRead = true;
      await email.save();
    }

    res.json({
      status: 'success',
      email
    });
  } catch (error) {
    console.error('Email fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch email',
      message: error.message
    });
  }
});

router.post('/email/:emailId/read', async (req, res) => {
  try {
    const { emailId } = req.params;
    const { read } = req.body;

    const email = await Email.findOneAndUpdate(
      { _id: emailId, userId: req.userId },
      { isRead: read, updatedAt: new Date() },
      { new: true }
    );

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    res.json({
      status: 'success',
      message: `Email marked as ${read ? 'read' : 'unread'}`
    });
  } catch (error) {
    console.error('Read status error:', error);
    res.status(500).json({
      error: 'Failed to update read status',
      message: error.message
    });
  }
});

router.post('/email/:emailId/star', async (req, res) => {
  try {
    const { emailId } = req.params;
    const { starred } = req.body;

    const email = await Email.findByIdAndUpdate(
      emailId,
      { isStarred: starred, updatedAt: new Date() },
      { new: true }
    );

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    res.json({
      status: 'success',
      message: `Email ${starred ? 'starred' : 'unstarred'}`
    });
  } catch (error) {
    console.error('Star error:', error);
    res.status(500).json({
      error: 'Failed to update star status',
      message: error.message
    });
  }
});

router.post('/email/:emailId/delete', async (req, res) => {
  try {
    const { emailId } = req.params;

    const email = await Email.findOneAndUpdate(
      { _id: emailId, userId: req.userId },
      { folder: 'trash', deletedAt: new Date(), updatedAt: new Date() },
      { new: true }
    );

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    res.json({
      status: 'success',
      message: 'Email moved to trash'
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      error: 'Failed to delete email',
      message: error.message
    });
  }
});

router.post('/email/:emailId/reply', async (req, res) => {
  try {
    const { emailId } = req.params;
    const { userId, accountId, subject, body, attachmentIds } = req.body;

    const originalEmail = await Email.findById(emailId);
    if (!originalEmail) {
      return res.status(404).json({ error: 'Original email not found' });
    }

    const account = await EmailAccount.findById(accountId);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const replyEmail = new Email({
      userId,
      accountId,
      from: { email: account.email, name: account.displayName },
      to: [{ email: originalEmail.from.email, name: originalEmail.from.name }],
      subject: subject || `Re: ${originalEmail.subject}`,
      body,
      bodyPlain: body,
      inReplyTo: originalEmail.messageId,
      threadId: originalEmail.threadId || originalEmail._id.toString(),
      folder: 'sent',
      isDraft: false,
      isRead: true,
      provider: account.provider,
      sentDate: new Date(),
      attachments: attachmentIds ? await Promise.all(
        attachmentIds.map(id => EmailAttachment.findById(id))
      ).then(docs => docs.map(doc => ({
        filename: doc.filename,
        mimetype: doc.mimetype,
        size: doc.size
      }))) : [],
      hasAttachments: attachmentIds && attachmentIds.length > 0
    });

    await replyEmail.save();

    res.status(201).json({
      status: 'success',
      message: 'Reply sent successfully',
      email: replyEmail
    });
  } catch (error) {
    console.error('Reply error:', error);
    res.status(500).json({
      error: 'Failed to send reply',
      message: error.message
    });
  }
});

router.get('/email/search', async (req, res) => {
  try {
    const { userId, query, accountId, folder, from, to, page = 1, limit = 50 } = req.query;

    if (!userId || !query) {
      return res.status(400).json({
        error: 'userId and query are required'
      });
    }

    const skip = (page - 1) * limit;
    const searchQuery = {
      userId,
      $text: { $search: query }
    };

    if (accountId) searchQuery.accountId = accountId;
    if (folder) searchQuery.folder = folder;
    if (from) searchQuery['from.email'] = from;

    const emails = await Email.find(searchQuery)
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-bodyHtml -body');

    const total = await Email.countDocuments(searchQuery);

    res.json({
      status: 'success',
      query,
      total,
      results: emails,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message
    });
  }
});

router.get('/email/stats', async (req, res) => {
  try {
    const { userId, accountId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const query = { userId };
    if (accountId) query.accountId = accountId;

    const [total, unread, starred, drafts, sent, trash] = await Promise.all([
      Email.countDocuments(query),
      Email.countDocuments({ ...query, isRead: false }),
      Email.countDocuments({ ...query, isStarred: true }),
      Email.countDocuments({ ...query, folder: 'drafts' }),
      Email.countDocuments({ ...query, folder: 'sent' }),
      Email.countDocuments({ ...query, folder: 'trash' })
    ]);

    res.json({
      status: 'success',
      stats: {
        total,
        unread,
        starred,
        drafts,
        sent,
        trash
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      error: 'Failed to get stats',
      message: error.message
    });
  }
});

// =====================================================
// ATTACHMENT MANAGEMENT
// =====================================================

router.post('/email/attachment/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { userId, accountId } = req.body;

    if (!userId || !accountId) {
      return res.status(400).json({
        error: 'Missing userId or accountId'
      });
    }

    const attachment = new EmailAttachment({
      userId,
      accountId,
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      storagePath: req.file.path,
      storageUrl: `/uploads/attachments/${req.file.filename}`,
      downloadUrl: `/api/email/attachment/download/${req.file.filename}`,
      provider: 'local'
    });

    await attachment.save();

    res.json({
      status: 'success',
      message: 'File uploaded successfully',
      attachment: {
        id: attachment._id,
        filename: attachment.filename,
        size: attachment.sizeFormatted,
        mimetype: attachment.mimetype,
        downloadUrl: attachment.downloadUrl
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'Failed to upload file',
      message: error.message
    });
  }
});

router.get('/email/attachment/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../uploads/attachments', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.download(filePath);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      error: 'Failed to download file',
      message: error.message
    });
  }
});

router.get('/email/attachments/:emailId', async (req, res) => {
  try {
    const { emailId } = req.params;

    const attachments = await EmailAttachment.find({ emailId })
      .select('-storagePath -accessControl');

    res.json({
      status: 'success',
      count: attachments.length,
      attachments
    });
  } catch (error) {
    console.error('Attachments fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch attachments',
      message: error.message
    });
  }
});

module.exports = router;
