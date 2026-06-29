import express from 'express';
import cors from 'cors';
import cookieSession from 'cookie-session';
import dotenv from 'dotenv';
import bidRoutes from './routes/bidRoutes.js';
import productRoutes from './routes/productRoutes.js';
import authRoutes from './routes/authRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS with support for credentials (cookies)
app.use(cors({
  origin: 'http://localhost:5173', // Port mặc định của Vite
  credentials: true // BẮT BUỘC ĐỂ NHẬN COOKIE
}));

// Parse JSON bodies
app.use(express.json());

// Configure Cookie Session middleware for authentication
app.use(cookieSession({
  name: 'auction-session',
  keys: [process.env.SESSION_SECRET || 'secret-key-123'],
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/products', productRoutes);

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
