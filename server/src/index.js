import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import apiRoutes from './routes/api.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import { authMiddleware } from './middleware/auth.js';

// Support both root .env and ./server/.env
dotenv.config();
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: './server/.env' });
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Request logger for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Authentication middleware to populate req.userId & req.user from JWT
app.use(authMiddleware);

// Mount Auth, Admin, and API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', apiRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'DayLedger API',
    status: 'Running',
    version: '1.1.0',
    authEnabled: true,
    database: process.env.MONGODB_URI || 'mongodb://localhost:27017/dayledger',
  });
});

// Start Express server immediately, then connect to MongoDB
app.listen(PORT, () => {
  console.log(`🚀 DayLedger Backend Server is running on http://localhost:${PORT}`);
  console.log(`📡 MongoDB Target: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/dayledger'}`);
  connectDB();
});
