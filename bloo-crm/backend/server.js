/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  This source code is the proprietary and confidential property of Blue Astra
  Technologies LLP (India). Unauthorized copying, modification, distribution, or
  use of this file or codebase, in whole or in part, by any means or technology
  (including AI tools), is strictly prohibited without express written permission.
*/
/* =====================================================
   BLOO CRM BACKEND - EXPRESS SERVER
   ===================================================== */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');
const session = require('express-session');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// =====================================================
// MIDDLEWARE
// =====================================================

// Security middleware
// CSP / cross-origin isolation are disabled because the SPA uses inline
// event handlers, inline styles, and external CDN scripts. Other helmet
// protections (HSTS, noSniff, frameguard, etc.) remain enabled.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false
}));

// CORS configuration
// Reflect the request origin (allow any). This is safe here because auth uses
// the Authorization header (JWT), not cookies, so a permissive CORS policy does
// not expose credentials. Same-origin requests via the nginx proxy don't need
// CORS at all; this prevents cross-origin setups (e.g. direct :5000 access)
// from being blocked with "Not allowed by CORS".
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Stripe webhook needs the raw body for signature verification — mount before JSON parser
app.use('/api/payments/stripe/webhook', express.raw({ type: '*/*' }));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Session (used by the OAuth flow to hold the CSRF state across the redirect)
app.set('trust proxy', 1);
app.use(session({
  secret: process.env.SESSION_SECRET || 'bloo-crm-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 30 * 60 * 1000 }
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// =====================================================
// ROUTES
// =====================================================

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Bloo CRM Backend is running',
    timestamp: new Date().toISOString()
  });
});

// API version endpoint
app.get('/api/version', (req, res) => {
  res.json({
    version: '1.0.0',
    name: 'Bloo CRM',
    api: 'v1',
    copyright: 'Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.',
    proprietary: 'Unauthorized copying, modification, or use by any means or technology (including AI tools) is strictly prohibited.'
  });
});

// =====================================================
// OAUTH AUTHENTICATION ROUTES
// =====================================================

const oauthAuthRoutes = require('./routes/oauth-auth');
app.use('/api/auth', oauthAuthRoutes);

// =====================================================
// AUTHENTICATION ROUTES
// =====================================================

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// =====================================================
// CLIENT ROUTES
// =====================================================

const clientRoutes = require('./routes/clients');
app.use('/api/clients', clientRoutes);

// =====================================================
// LEAD ROUTES
// =====================================================

const leadRoutes = require('./routes/leads');
app.use('/api/leads', leadRoutes);

// =====================================================
// COMMUNICATION ROUTES
// =====================================================

const communicationRoutes = require('./routes/communications');
app.use('/api/communications', communicationRoutes);

// =====================================================
// WORKFLOW ROUTES
// =====================================================

const workflowRoutes = require('./routes/workflow');
app.use('/api/workflow', workflowRoutes);

// =====================================================
// PAYMENT ROUTES
// =====================================================

const paymentRoutes = require('./routes/payments');
app.use('/api/payments', paymentRoutes);

// =====================================================
// EMAIL SYNC ROUTES
// =====================================================

const emailSyncRoutes = require('./routes/email-sync');
app.use('/api', emailSyncRoutes);

// =====================================================
// CALENDAR SYNC ROUTES
// =====================================================

const calendarSyncRoutes = require('./routes/calendar-sync');
app.use('/api', calendarSyncRoutes);

// =====================================================
// CALENDAR EVENTS API ROUTES
// =====================================================

const calendarEventsApiRoutes = require('./routes/calendar-events-api');
app.use('/api', calendarEventsApiRoutes);

// =====================================================
// SMTP PROVIDER API ROUTES
// =====================================================

const smtpProviderApiRoutes = require('./routes/smtp-provider-api');
app.use('/api', smtpProviderApiRoutes);

// =====================================================
// EMAIL MANAGEMENT API ROUTES
// =====================================================

const emailManagementApiRoutes = require('./routes/email-management-api');
app.use('/api', emailManagementApiRoutes);

// =====================================================
// EMAIL CLIENT API ROUTES
// =====================================================

const emailClientApiRoutes = require('./routes/email-client-api');
app.use('/api', emailClientApiRoutes);

// =====================================================
// MEETING EMAIL ROUTES
// =====================================================

const meetingEmailRoutes = require('./routes/meeting-email');
app.use('/api', meetingEmailRoutes);

// =====================================================
// MEETING ROOM ROUTES (sessions + Webex)
// =====================================================

const meetingRoomRoutes = require('./routes/meeting-rooms');
app.use('/api/meeting-rooms', meetingRoomRoutes);

// Meeting records (minutes, transcript, search)
const meetingRecordRoutes = require('./routes/meetings');
app.use('/api/meetings', meetingRecordRoutes);

// JaaS webhook (recording -> transcript)
const jaasWebhookRoutes = require('./routes/jaas-webhook');
app.use('/api', jaasWebhookRoutes);

// Grievances (complaints / support)
const grievanceRoutes = require('./routes/grievances');
app.use('/api/grievances', grievanceRoutes);

// Employees (HR)
const employeeRoutes = require('./routes/employees');
app.use('/api/employees', employeeRoutes);

// Policies (create/update + publish to all employees)
const policyRoutes = require('./routes/policies');
app.use('/api/policies', policyRoutes);

// Analytics (dashboard aggregates)
const analyticsRoutes = require('./routes/analytics');
app.use('/api/analytics', analyticsRoutes);

// Leave applications (apply + manager approval + backup delegation)
const leaveRoutes = require('./routes/leaves');
app.use('/api/leaves', leaveRoutes);

// Performance (goals, KPIs, reviews, feedback)
const performanceRoutes = require('./routes/performance');
app.use('/api/performance', performanceRoutes);

// Onboarding (new-hire checklist + welcome email)
const onboardingRoutes = require('./routes/onboarding');
app.use('/api/onboarding', onboardingRoutes);

// Approvals (expense/purchase/travel/hiring/promotion/policy-exception)
const approvalRoutes = require('./routes/approvals');
app.use('/api/approvals', approvalRoutes);

// Workflow tasks (assign to employee; email routes to backup if on leave)
const workflowTaskRoutes = require('./routes/workflow-tasks');
app.use('/api/workflow-tasks', workflowTaskRoutes);

// Vendors (vendor dashboard, quarterly revenue/KPI/KRI, documents)
const vendorRoutes = require('./routes/vendors');
app.use('/api/vendors', vendorRoutes);

// AI Insights (assistant, duplicate detection/merge, email analysis, drafting)
const aiRoutes = require('./routes/ai');
app.use('/api/ai', aiRoutes);

// Knowledge repository (searchable KB + RAG AI answering)
const knowledgeRoutes = require('./routes/knowledge');
app.use('/api/knowledge', knowledgeRoutes);

// Proposals (RFI / RFQ / RFP templates, guidance, documents)
const proposalRoutes = require('./routes/proposals');
app.use('/api/proposals', proposalRoutes);

// =====================================================
// STATIC FRONTEND
// Serve the SPA from the backend so the whole app runs same-origin
// (relative /api calls work without a separate reverse proxy).
// =====================================================

// Serve uploaded meeting recordings (browser-recorded audio) for playback
app.use('/recordings', express.static(path.join(__dirname, 'uploads', 'recordings')));
// Serve uploaded vendor documents
app.use('/vendor-docs', express.static(path.join(__dirname, 'uploads', 'vendor-docs')));
// Serve uploaded proposal documents
app.use('/proposal-docs', express.static(path.join(__dirname, 'uploads', 'proposal-docs')));

const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// SPA fallback: any non-API GET returns index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path === '/health') return next();
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// =====================================================
// ERROR HANDLING
// =====================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Endpoint ${req.method} ${req.path} does not exist`,
    timestamp: new Date().toISOString()
  });
});

// Error handler middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
    path: req.path
  });
});

// =====================================================
// SERVER START
// =====================================================

app.listen(PORT, () => {
  console.log(`
    ╔══════════════════════════════════════╗
    ║   🌊 BLOO CRM BACKEND SERVER 🌊   ║
    ╚══════════════════════════════════════╝
    
    ✓ Server running on port ${PORT}
    ✓ Environment: ${process.env.NODE_ENV || 'development'}
    ✓ API Version: 1.0.0

    Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
    Proprietary software — unauthorized copying or use is prohibited.

    API Endpoints:
    • GET  /health
    • GET  /api/version
    • POST /api/auth/register
    • POST /api/auth/login
    • GET  /api/clients
    • POST /api/clients
    • GET  /api/clients/analysis
    • GET  /api/clients/export
    • GET  /api/leads
    • POST /api/leads
    
    Documentation: http://localhost:${PORT}/api/docs
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

module.exports = app;
