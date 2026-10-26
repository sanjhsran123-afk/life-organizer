import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import apiRoutes from './routes/api.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import friendsRoutes from './routes/friends.js';
import messagesRoutes from './routes/messages.js';
import callsRoutes from './routes/calls.js';
import { authMiddleware } from './middleware/auth.js';
import { initSocketServer } from './services/socketService.js';

import { configureWebPush } from './services/pushService.js';
import { startReminderScheduler } from './services/reminderScheduler.js';

// Support both root .env and ./server/.env for local development
dotenv.config();
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: './server/.env' });
}

// Initialize Web Push VAPID configuration from environment variables
configureWebPush();

const app = express();
// Render automatically provides PORT via environment variable
const PORT = process.env.PORT || 5000;

const isProduction = process.env.NODE_ENV === 'production';

// Parse configured origins from CLIENT_URL, ALLOWED_ORIGINS, or APP_ORIGINS (comma-separated)
const parseOrigins = (val) =>
  (val || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

const configuredWebOrigins = parseOrigins(process.env.CLIENT_URL || process.env.CORS_ORIGIN);
const configuredAppOrigins = parseOrigins(process.env.APP_ORIGINS || process.env.ALLOWED_ORIGINS);

// Standard local development origins
const devOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
];

// Standard hybrid mobile app webview origins (Capacitor / Cordova for Android and iOS builds)
const mobileAppOrigins = [
  'https://localhost',     // Android WebView (Capacitor with androidScheme: 'https')
  'capacitor://localhost', // iOS Capacitor WebView
  'ionic://localhost',
  'http://localhost',      // Android WebView default/legacy scheme
  ...configuredAppOrigins,
];

// Production origins allowlist: explicit origins only (wildcard '*' is forbidden in production)
const productionAllowedOrigins = new Set([
  ...configuredWebOrigins.filter((origin) => origin !== '*'),
  ...mobileAppOrigins,
]);

app.use(
  cors({
    origin: (origin, callback) => {
      // 1. Allow requests with no Origin header (native mobile apps, curl, uptime pingers, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      // Clean incoming origin from trailing slashes
      const cleanOrigin = origin.replace(/\/+$/, '');

      // 2. In local development, permit localhost and local network testing
      if (!isProduction) {
        if (
          devOrigins.includes(cleanOrigin) ||
          cleanOrigin.startsWith('http://localhost:') ||
          cleanOrigin.startsWith('http://127.0.0.1:') ||
          mobileAppOrigins.includes(cleanOrigin) ||
          configuredWebOrigins.includes(cleanOrigin)
        ) {
          return callback(null, true);
        }
      }

      // 3. In production, check explicitly allowed web, Netlify deploys, and app origins
      if (
        productionAllowedOrigins.has(cleanOrigin) ||
        cleanOrigin.endsWith('.netlify.app') ||
        cleanOrigin.endsWith('onrender.com')
      ) {
        return callback(null, true);
      }

      // Reject all unauthorized origins
      console.warn(`[CORS Blocked] Request rejected from origin: ${origin}`);
      return callback(new Error(`CORS policy does not allow access from origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json());

// Request logger for debugging (masks sensitive endpoints/bodies)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Simple Health Check URL for Render monitoring and uptime checks
app.get(['/health', '/api/health'], (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// Authentication middleware to populate req.userId & req.user from JWT
app.use(authMiddleware);

// Mount Auth, Admin, Friends, Messages, Calls, and Data API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/calls', callsRoutes);
app.use('/api', apiRoutes);

// Root informational route (sanitized to NEVER leak credentials or secrets)
app.get('/', (req, res) => {
  const isAtlas = Boolean(process.env.MONGODB_URI && process.env.MONGODB_URI.includes('mongodb+srv'));
  res.json({
    name: 'DayLedger API',
    status: 'Running',
    version: '1.2.0',
    authEnabled: true,
    messagingEnabled: true,
    callingEnabled: true,
    database: mongoose.connection.readyState === 1
      ? 'Connected'
      : process.env.MONGODB_URI
      ? (isAtlas ? 'MongoDB Atlas (Configured)' : 'Configured (Awaiting Connection)')
      : 'Local Default',
  });
});

// Create Node HTTP Server to attach both Express and Socket.io
const httpServer = http.createServer(app);

// Initialize Socket.io server with CORS allowlist
initSocketServer(httpServer, Array.from(productionAllowedOrigins));

// Start server on 0.0.0.0 to accept public web requests on Render
httpServer.listen(PORT, '0.0.0.0', () => {
  const isAtlas = Boolean(process.env.MONGODB_URI && process.env.MONGODB_URI.includes('mongodb+srv'));
  const safeDbTarget = process.env.MONGODB_URI
    ? (isAtlas ? 'MongoDB Atlas Cluster' : 'Configured MongoDB URI')
    : 'mongodb://localhost:27017/dayledger';

  console.log(`🚀 DayLedger Backend Server is running on port ${PORT}`);
  console.log(`📡 MongoDB Target: ${safeDbTarget}`);
  connectDB().then(() => {
    startReminderScheduler();
  }).catch(() => {
    // Also start scheduler so it resumes once DB reconnects
    startReminderScheduler();
  });
});

