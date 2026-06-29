import express from 'express';
import cors from 'cors';
import cookieSession from 'cookie-session';
import dotenv from 'dotenv';
import bidRoutes from './routes/bidRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Mount routes
app.use('/api/bids', bidRoutes);

// Enable CORS with support for credentials (cookies)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON bodies
app.use(express.json());

// Configure Cookie Session middleware for authentication
app.use(cookieSession({
  name: 'session',
  keys: [process.env.SESSION_SECRET || 'bidding_app_secret_key'],
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  secure: process.env.NODE_ENV === 'production', // only send over HTTPS in production
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
}));

// Basic route to check if server is healthy
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: "Bidding Web API Server is running successfully!",
    timestamp: new Date().toISOString()
  });
});

// Listen on the configured port
app.listen(PORT, () => {
  console.log(`[Server] running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});
