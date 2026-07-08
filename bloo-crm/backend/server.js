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
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const connectDB = require('./config/db');
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');
const { auditLogger } = require('./middleware/auditLog');
const AuditLog = require('./models/AuditLog');
const { buildMap, canonicalRedirect, serveClean } = require('./middleware/cleanUrls');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '127.0.0.1'; // bind to loopback; nginx proxies to it

// Fail fast if critical secrets are missing/weak in production, rather than
// silently falling back to guessable defaults.
if (process.env.NODE_ENV === 'production') {
  const problems = [];
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) problems.push('JWT_SECRET (missing or too short)');
  if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length < 32) problems.push('ENCRYPTION_KEY (missing or too short)');
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 16) problems.push('SESSION_SECRET (missing or too short)');
  if (problems.length) {
    console.error('FATAL: insecure configuration in production ->', problems.join('; '));
    process.exit(1);
  }
}

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
// Restrict credentialed CORS to known origins (same-origin requests carry no
// Origin header and are always allowed). Tunable via CORS_ORIGINS (comma-sep).
const corsAllowlist = (process.env.CORS_ORIGINS || 'https://bloocrm.com,https://www.bloocrm.com')
  .split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);                         // same-origin / curl / mobile
    if (corsAllowlist.includes(origin)) return cb(null, true);
    if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true); // local dev
    return cb(null, false);                                     // unknown origin -> no CORS headers
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Stripe webhook needs the raw body for signature verification — mount before JSON parser
app.use('/api/payments/stripe/webhook', express.raw({ type: '*/*' }));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Neutralize NoSQL operator injection ($ / .) in any input. Sanitize in place so
// we never reassign Express's read-only req.query getter.
app.use((req, _res, next) => {
  ['body', 'params', 'query'].forEach(k => { if (req[k]) mongoSanitize.sanitize(req[k]); });
  next();
});
// Strip HTTP parameter pollution (duplicate query/body params)
app.use(hpp());

// Session (used by the OAuth flow to hold the CSRF state across the redirect)
app.set('trust proxy', 1);
app.use(session({
  secret: process.env.SESSION_SECRET || require('crypto').randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS-only cookie in prod
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 60 * 1000
  }
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Audit trail: persist every mutating (non-GET) request to MongoDB
app.use(auditLogger(AuditLog));

// ---- Rate limiting ----
// Strict limiter on credential endpoints (brute-force / account-enumeration guard)
app.use(['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password', '/api/auth/reset-password', '/api/auth/mfa/login'], authLimiter);
// General API abuse guard
app.use('/api', apiLimiter);

// Clean URLs / canonical redirects: /page.html -> /page, strip trailing slash,
// index.html -> dir. (Bypasses /api & /health; leaves *-callback.html untouched.)
app.use(canonicalRedirect);

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

// Team & access control (admin manages member sub-users)
const teamRoutes = require('./routes/team');
app.use('/api/team', teamRoutes);

// Brochure Papa — AI brochure generation via Beautiful.ai
const brochureRoutes = require('./routes/brochure');
app.use('/api/brochure', brochureRoutes);

// Proposals (RFI / RFQ / RFP templates, guidance, documents)
const proposalRoutes = require('./routes/proposals');
app.use('/api/proposals', proposalRoutes);

// Project-management integrations (Rocket AI+ only)
const integrationRoutes = require('./routes/integrations');
app.use('/api/integrations', integrationRoutes);

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
const outerLayerPath = path.join(__dirname, '..', '..', 'outer-layer');

// Map extensionless page URLs (e.g. /features) to their .html file, once at startup.
const cleanUrlMap = buildMap([frontendPath, outerLayerPath]);

// Public landing page is the marketing Features page; the app (login + CRM)
// lives at /app. These routes run before the static middleware so "/" is the
// Features page rather than the app's index.html.
app.get('/', (req, res) => res.sendFile(path.join(outerLayerPath, 'Features.html')));
app.get('/app', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));

app.use(express.static(frontendPath));

// Dedicated product website pages (Features / Enroll / Customer Support, etc.)
app.use(express.static(outerLayerPath));

// Marketing website home also available at /home (and /website).
app.get(['/home', '/website'], (req, res) => res.sendFile(path.join(outerLayerPath, 'index.html')));

// Serve extensionless clean URLs (/features -> Features.html) before the SPA fallback
app.get('*', serveClean(cleanUrlMap));

// SPA fallback: any non-API GET returns the app index.html
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
  
  const status = err.status || 500;
  // Don't leak internal error details on 5xx in production.
  const message = (process.env.NODE_ENV === 'production' && status >= 500)
    ? 'Internal Server Error'
    : (err.message || 'Internal Server Error');
  res.status(status).json({
    error: message,
    timestamp: new Date().toISOString()
  });
});

// =====================================================
// SERVER START
// =====================================================

app.listen(PORT, HOST, () => {
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
