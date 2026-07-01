/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   SMTP PROVIDER API ROUTES
   ===================================================== */

const express = require('express');
const router = express.Router();
const SMTPProvider = require('../models/SMTPProvider');
const nodemailer = require('nodemailer');

// =====================================================
// SMTP PROVIDER SETUP
// =====================================================

router.post('/email/smtp-provider/setup', async (req, res) => {
  try {
    const { userId, accountId, providerType, displayName, email } = req.body;

    if (!userId || !accountId || !providerType || !displayName || !email) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['userId', 'accountId', 'providerType', 'displayName', 'email']
      });
    }

    const provider = new SMTPProvider({
      userId,
      accountId,
      providerType,
      displayName,
      email,
      metadata: {
        setupDate: new Date()
      }
    });

    await provider.save();

    res.status(201).json({
      status: 'success',
      message: 'SMTP provider created successfully',
      provider: {
        id: provider._id,
        providerType: provider.providerType,
        displayName: provider.displayName,
        email: provider.email,
        verified: provider[providerType]?.verified || false
      }
    });
  } catch (error) {
    console.error('Provider setup error:', error);
    res.status(500).json({
      error: 'Failed to setup provider',
      message: error.message
    });
  }
});

// =====================================================
// AMAZON SES
// =====================================================

router.post('/email/smtp-provider/:providerId/amazon', async (req, res) => {
  try {
    const { providerId } = req.params;
    const { accessKey, secretKey, sesRegion, fromEmail } = req.body;

    if (!accessKey || !secretKey || !sesRegion) {
      return res.status(400).json({
        error: 'Missing required fields: accessKey, secretKey, sesRegion'
      });
    }

    const provider = await SMTPProvider.findByIdAndUpdate(
      providerId,
      {
        $set: {
          'amazon.accessKey': accessKey,
          'amazon.secretKey': secretKey,
          'amazon.sesRegion': sesRegion,
          'amazon.fromEmail': fromEmail,
          'metadata.lastModified': new Date()
        }
      },
      { new: true }
    );

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    res.json({
      status: 'success',
      message: 'Amazon SES credentials saved',
      provider: { id: provider._id, providerType: 'amazon-ses' }
    });
  } catch (error) {
    console.error('Amazon setup error:', error);
    res.status(500).json({
      error: 'Failed to save Amazon SES credentials',
      message: error.message
    });
  }
});

// =====================================================
// POSTMARK
// =====================================================

router.post('/email/smtp-provider/:providerId/postmark', async (req, res) => {
  try {
    const { providerId } = req.params;
    const { accountToken, serverToken, serverId } = req.body;

    if (!accountToken || !serverToken) {
      return res.status(400).json({
        error: 'Missing required fields: accountToken, serverToken'
      });
    }

    const provider = await SMTPProvider.findByIdAndUpdate(
      providerId,
      {
        $set: {
          'postmark.accountToken': accountToken,
          'postmark.serverToken': serverToken,
          'postmark.serverId': serverId,
          'metadata.lastModified': new Date()
        }
      },
      { new: true }
    );

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    res.json({
      status: 'success',
      message: 'Postmark credentials saved',
      provider: { id: provider._id, providerType: 'postmark' }
    });
  } catch (error) {
    console.error('Postmark setup error:', error);
    res.status(500).json({
      error: 'Failed to save Postmark credentials',
      message: error.message
    });
  }
});

// =====================================================
// MAILGUN
// =====================================================

router.post('/email/smtp-provider/:providerId/mailgun', async (req, res) => {
  try {
    const { providerId } = req.params;
    const { apiKey, domain, region } = req.body;

    if (!apiKey || !domain) {
      return res.status(400).json({
        error: 'Missing required fields: apiKey, domain'
      });
    }

    const provider = await SMTPProvider.findByIdAndUpdate(
      providerId,
      {
        $set: {
          'mailgun.apiKey': apiKey,
          'mailgun.domain': domain,
          'mailgun.region': region || 'us',
          'metadata.lastModified': new Date()
        }
      },
      { new: true }
    );

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    res.json({
      status: 'success',
      message: 'Mailgun credentials saved',
      provider: { id: provider._id, providerType: 'mailgun' }
    });
  } catch (error) {
    console.error('Mailgun setup error:', error);
    res.status(500).json({
      error: 'Failed to save Mailgun credentials',
      message: error.message
    });
  }
});

// =====================================================
// SMTP2GO
// =====================================================

router.post('/email/smtp-provider/:providerId/smtp2go', async (req, res) => {
  try {
    const { providerId } = req.params;
    const { apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({
        error: 'Missing required field: apiKey'
      });
    }

    const provider = await SMTPProvider.findByIdAndUpdate(
      providerId,
      {
        $set: {
          'smtp2go.apiKey': apiKey,
          'metadata.lastModified': new Date()
        }
      },
      { new: true }
    );

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    res.json({
      status: 'success',
      message: 'SMTP2Go credentials saved',
      provider: { id: provider._id, providerType: 'smtp2go' }
    });
  } catch (error) {
    console.error('SMTP2Go setup error:', error);
    res.status(500).json({
      error: 'Failed to save SMTP2Go credentials',
      message: error.message
    });
  }
});

// =====================================================
// CUSTOM SMTP
// =====================================================

router.post('/email/smtp-provider/:providerId/custom-smtp', async (req, res) => {
  try {
    const { providerId } = req.params;
    const { host, port, secure, username, password, fromEmail, fromName } = req.body;

    if (!host || !port || username === undefined || password === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: host, port, username, password'
      });
    }

    const provider = await SMTPProvider.findByIdAndUpdate(
      providerId,
      {
        $set: {
          'customSmtp.host': host,
          'customSmtp.port': port,
          'customSmtp.secure': secure || false,
          'customSmtp.username': username,
          'customSmtp.password': password,
          'customSmtp.fromEmail': fromEmail,
          'customSmtp.fromName': fromName,
          'metadata.lastModified': new Date()
        }
      },
      { new: true }
    );

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    res.json({
      status: 'success',
      message: 'Custom SMTP credentials saved',
      provider: { id: provider._id, providerType: 'custom-smtp' }
    });
  } catch (error) {
    console.error('Custom SMTP setup error:', error);
    res.status(500).json({
      error: 'Failed to save Custom SMTP credentials',
      message: error.message
    });
  }
});

// =====================================================
// SINGLE SIGN-ON (SSO)
// =====================================================

router.post('/email/smtp-provider/:providerId/sso', async (req, res) => {
  try {
    const { providerId } = req.params;
    const { provider, username, password, clientId, clientSecret, redirectUri } = req.body;

    if (!provider || (!username && !password && !clientId && !clientSecret)) {
      return res.status(400).json({
        error: 'Missing required fields for SSO'
      });
    }

    const updateData = {
      $set: {
        'sso.enabled': true,
        'sso.provider': provider,
        'metadata.lastModified': new Date()
      }
    };

    // For OAuth2 providers
    if (clientId && clientSecret) {
      updateData.$set['sso.clientId'] = clientId;
      updateData.$set['sso.clientSecret'] = clientSecret;
      updateData.$set['sso.redirectUri'] = redirectUri;
    }

    // For username/password authentication
    if (username && password) {
      updateData.$set['sso.userId'] = username;
      updateData.$set['sso.userEmail'] = username;
    }

    const smtpProvider = await SMTPProvider.findByIdAndUpdate(
      providerId,
      updateData,
      { new: true }
    );

    if (!smtpProvider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    res.json({
      status: 'success',
      message: 'SSO configured successfully',
      provider: {
        id: smtpProvider._id,
        ssoEnabled: true,
        ssoProvider: provider
      }
    });
  } catch (error) {
    console.error('SSO setup error:', error);
    res.status(500).json({
      error: 'Failed to configure SSO',
      message: error.message
    });
  }
});

// =====================================================
// GET PROVIDER
// =====================================================

router.get('/email/smtp-provider/:providerId', async (req, res) => {
  try {
    const { providerId } = req.params;

    const provider = await SMTPProvider.findById(providerId)
      .select('-encryptedCredentials');

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    res.json({
      status: 'success',
      provider
    });
  } catch (error) {
    console.error('Provider fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch provider',
      message: error.message
    });
  }
});

// =====================================================
// LIST PROVIDERS
// =====================================================

router.get('/email/smtp-providers', async (req, res) => {
  try {
    const { userId, accountId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const query = { userId, isActive: true };
    if (accountId) query.accountId = accountId;

    const providers = await SMTPProvider.find(query)
      .select('-encryptedCredentials')
      .sort({ createdAt: -1 });

    res.json({
      status: 'success',
      count: providers.length,
      providers
    });
  } catch (error) {
    console.error('Providers list error:', error);
    res.status(500).json({
      error: 'Failed to list providers',
      message: error.message
    });
  }
});

// =====================================================
// TEST PROVIDER
// =====================================================

router.post('/email/smtp-provider/:providerId/test', async (req, res) => {
  try {
    const { providerId } = req.params;
    const { testEmail } = req.body;

    const provider = await SMTPProvider.findById(providerId);
    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    let transporter;
    let success = false;
    let error = null;

    try {
      // Create appropriate transporter based on provider type
      if (provider.providerType === 'amazon-ses') {
        const creds = provider.getAmazonCredentials();
        const AWS = require('aws-sdk');
        AWS.config.update({
          accessKeyId: creds.accessKey,
          secretAccessKey: creds.secretKey,
          region: creds.sesRegion
        });
        transporter = nodemailer.createTransport({
          SES: new AWS.SES()
        });
      } else if (provider.providerType === 'postmark') {
        const creds = provider.getPostmarkCredentials();
        transporter = nodemailer.createTransport({
          host: 'smtp.postmarkapp.com',
          port: 587,
          auth: {
            user: creds.accountToken,
            pass: creds.serverToken
          }
        });
      } else if (provider.providerType === 'mailgun') {
        const creds = provider.getMailgunCredentials();
        const mailgunSmtpHost = creds.region === 'eu' ? 'smtp.eu.mailgun.org' : 'smtp.mailgun.org';
        transporter = nodemailer.createTransport({
          host: mailgunSmtpHost,
          port: 587,
          auth: {
            user: `postmaster@${creds.domain}`,
            pass: creds.apiKey
          }
        });
      } else if (provider.providerType === 'smtp2go') {
        const creds = provider.getSMTP2GoCredentials();
        transporter = nodemailer.createTransport({
          host: 'mail.smtp2go.com',
          port: 2525,
          auth: {
            user: 'apikey',
            pass: creds.apiKey
          }
        });
      } else if (provider.providerType === 'custom-smtp') {
        const creds = provider.getCustomSMTPCredentials();
        transporter = nodemailer.createTransport({
          host: creds.host,
          port: creds.port,
          secure: creds.secure,
          auth: {
            user: creds.username,
            pass: creds.password
          }
        });
      }

      // Send test email
      const result = await transporter.sendMail({
        from: testEmail || provider.email,
        to: testEmail || provider.email,
        subject: 'Bloo CRM - SMTP Provider Test',
        html: `
          <h2>SMTP Provider Test</h2>
          <p>If you're seeing this email, your SMTP provider is configured correctly!</p>
          <p><strong>Provider:</strong> ${provider.providerDisplayName}</p>
          <p><strong>Email:</strong> ${provider.email}</p>
          <p>You can now use this provider to send emails through Bloo CRM.</p>
        `
      });

      success = true;
      await SMTPProvider.findByIdAndUpdate(
        providerId,
        {
          $set: {
            'metadata.testsPassed': [provider.providerType],
            testEmailSent: new Date(),
            testEmailResult: 'success'
          }
        }
      );
    } catch (err) {
      error = err.message;
      await SMTPProvider.findByIdAndUpdate(
        providerId,
        {
          $push: {
            'errors': {
              timestamp: new Date(),
              error: err.message,
              code: err.code
            }
          },
          $set: {
            testEmailResult: 'failed'
          }
        }
      );
    }

    if (success) {
      res.json({
        status: 'success',
        message: 'Test email sent successfully',
        result: 'Email sent to ' + (testEmail || provider.email)
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Test email failed',
        error: error
      });
    }
  } catch (error) {
    console.error('Test provider error:', error);
    res.status(500).json({
      error: 'Failed to test provider',
      message: error.message
    });
  }
});

// =====================================================
// UPDATE PROVIDER
// =====================================================

router.put('/email/smtp-provider/:providerId', async (req, res) => {
  try {
    const { providerId } = req.params;
    const updateData = req.body;

    // Prevent direct modification of security fields
    delete updateData.encryptedCredentials;
    delete updateData.userId;
    delete updateData._id;

    const provider = await SMTPProvider.findByIdAndUpdate(
      providerId,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-encryptedCredentials');

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    res.json({
      status: 'success',
      message: 'Provider updated successfully',
      provider
    });
  } catch (error) {
    console.error('Provider update error:', error);
    res.status(500).json({
      error: 'Failed to update provider',
      message: error.message
    });
  }
});

// =====================================================
// DELETE PROVIDER
// =====================================================

router.delete('/email/smtp-provider/:providerId', async (req, res) => {
  try {
    const { providerId } = req.params;

    // Soft delete
    const provider = await SMTPProvider.findByIdAndUpdate(
      providerId,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    res.json({
      status: 'success',
      message: 'Provider deleted successfully'
    });
  } catch (error) {
    console.error('Provider deletion error:', error);
    res.status(500).json({
      error: 'Failed to delete provider',
      message: error.message
    });
  }
});

module.exports = router;
