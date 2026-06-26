/* =====================================================
   BLOO CRM BACKEND - EXPRESS SERVER
   ===================================================== */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
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
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow localhost on any port, and specific production domains
    const allowedOrigins = [
      'http://localhost:3000',
      '/api',
      'http://localhost:8000',
      'http://localhost:8080',
      'http://127.0.0.1:3000',
      '/api',
      'http://127.0.0.1:8000',
      'http://127.0.0.1:8080',
      'file://' // Allow file:// protocol for local development
    ];

    // In development, allow all localhost
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin === 'file://') {
      callback(null, true);
    } else if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

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
    api: 'v1'
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
