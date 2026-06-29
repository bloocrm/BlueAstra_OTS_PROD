/* =====================================================
   EMAIL SERVICE UTILITY
   Handles email sending via Nodemailer
   ===================================================== */

const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initializeTransporter();
    }

    /**
     * Initialize the email transporter
     */
    initializeTransporter() {
        try {
            // Check if we're in demo mode or have real SMTP config
            const isDemoMode = !process.env.SMTP_HOST ||
                               process.env.SMTP_USER === 'noreply@bluocrm.com' ||
                               process.env.NODE_ENV === 'development';

            console.log('📧 Email Service Initialization:');
            console.log('   SMTP_HOST:', process.env.SMTP_HOST || 'undefined (will use demo mode)');
            console.log('   NODE_ENV:', process.env.NODE_ENV);
            console.log('   Demo Mode:', isDemoMode);

            if (isDemoMode) {
                console.log('📧 Email Service: DEMO MODE (emails will be logged, not sent)');
                this.isDemoMode = true;
                this.transporter = null;
                return;
            }

            // Using production SMTP configuration
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT || 587,
                secure: process.env.SMTP_SECURE === 'true' || false,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASSWORD
                }
            });

            console.log('✅ Email transporter initialized (Production)');
        } catch (error) {
            console.error('❌ Email transporter initialization failed:', error.message);
            console.log('📧 Falling back to DEMO MODE');
            this.isDemoMode = true;
            this.transporter = null;
        }
    }

    /**
     * Send meeting invitation email
     */
    async sendMeetingInvite(options) {
        try {
            // Validate required fields (only email is truly required)
            const { meetingTitle, providerName, clientName, clientEmail, agenda, senderEmail, senderName } = options;

            if (!clientEmail) {
                throw new Error('Client email is required');
            }

            // If in demo mode, use mock send
            if (this.isDemoMode) {
                console.log('📧 DEMO MODE - Email would be sent to:', clientEmail);
                return this.mockSendEmail(options);
            }

            // Create email content
            const emailContent = this.generateMeetingEmailHTML(options);

            // Send email
            const result = await this.transporter.sendMail({
                from: `"${senderName || 'Bloo CRM'}" <${senderEmail || process.env.DEFAULT_FROM_EMAIL || 'noreply@bluocrm.com'}>`,
                to: clientEmail,
                subject: `Meeting Invitation: ${meetingTitle}`,
                html: emailContent,
                text: this.generateMeetingEmailText(options)
            });

            console.log(`✅ Meeting email sent to ${clientEmail}:`, result.messageId);
            return {
                success: true,
                messageId: result.messageId,
                email: clientEmail
            };
        } catch (error) {
            console.error('❌ Error sending meeting email:', error.message);
            console.log('📧 Falling back to DEMO MODE');
            return this.mockSendEmail(options);
        }
    }

    /**
     * Generate HTML email content
     */
    generateMeetingEmailHTML(options) {
        const { meetingTitle, providerName, clientName, agenda, meetingTime } = options;

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #4A90E2; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
                    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
                    .meeting-details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #4A90E2; }
                    .detail-row { margin: 10px 0; }
                    .label { font-weight: bold; color: #4A90E2; }
                    .footer { background-color: #f0f0f0; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 5px 5px; }
                    .btn { display: inline-block; background-color: #4A90E2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📞 Meeting Invitation</h1>
                    </div>

                    <div class="content">
                        <p>Dear ${clientName},</p>

                        <p>You have been invited to join a meeting. Here are the details:</p>

                        <div class="meeting-details">
                            <div class="detail-row">
                                <span class="label">Meeting Title:</span>
                                <span>${meetingTitle}</span>
                            </div>

                            <div class="detail-row">
                                <span class="label">Video Provider:</span>
                                <span>${providerName}</span>
                            </div>

                            <div class="detail-row">
                                <span class="label">Meeting Time:</span>
                                <span>${meetingTime || new Date().toLocaleString()}</span>
                            </div>

                            <div class="detail-row">
                                <span class="label">Agenda:</span>
                                <p style="margin: 10px 0; white-space: pre-wrap; background-color: #f5f5f5; padding: 10px; border-radius: 3px;">${agenda}</p>
                            </div>
                        </div>

                        <p style="text-align: center;">
                            <a href="#" class="btn">Join Meeting</a>
                        </p>

                        <p>If you have any questions, please don't hesitate to reach out.</p>

                        <p>Best regards,<br>Bloo CRM Team</p>
                    </div>

                    <div class="footer">
                        <p>This is an automated message from Bloo CRM. Please do not reply to this email.</p>
                        <p>&copy; 2026 Bloo CRM. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    /**
     * Generate plain text email content
     */
    generateMeetingEmailText(options) {
        const { meetingTitle, providerName, clientName, agenda, meetingTime } = options;

        return `
Meeting Invitation

Dear ${clientName},

You have been invited to join a meeting. Here are the details:

Meeting Title: ${meetingTitle}
Video Provider: ${providerName}
Meeting Time: ${meetingTime || new Date().toLocaleString()}

Agenda:
${agenda}

If you have any questions, please don't hesitate to reach out.

Best regards,
Bloo CRM Team

---
This is an automated message from Bloo CRM. Please do not reply to this email.
© 2026 Bloo CRM. All rights reserved.
        `;
    }

    /**
     * Mock send email for testing/demo purposes
     */
    mockSendEmail(options) {
        const messageId = 'mock_' + Date.now();
        console.log('📧 MOCK EMAIL SENT (Demo/Test Mode)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('To:', options.clientEmail);
        console.log('Subject: Meeting Invitation: ' + options.meetingTitle);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Content:', {
            meetingTitle: options.meetingTitle,
            providerName: options.providerName,
            clientName: options.clientName,
            agenda: options.agenda
        });
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        return {
            success: true,
            messageId: messageId,
            email: options.clientEmail,
            mock: true,
            message: 'Email sent in demo mode (not actually delivered)'
        };
    }

    /**
     * Verify transporter connection
     */
    async verifyConnection() {
        try {
            if (!this.transporter) {
                return { success: false, message: 'Transporter not initialized' };
            }

            await this.transporter.verify();
            console.log('✅ Email service verified and ready');
            return { success: true, message: 'Email service ready' };
        } catch (error) {
            console.error('❌ Email service verification failed:', error.message);
            return { success: false, message: error.message };
        }
    }
}

// Create and export singleton instance
const emailService = new EmailService();

module.exports = emailService;
