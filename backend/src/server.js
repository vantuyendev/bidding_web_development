import express from 'express';
import cors from 'cors';
import cookieSession from 'cookie-session';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import xss from 'xss-clean';
import hpp from 'hpp';
import bidRoutes from './routes/bidRoutes.js';
import productRoutes from './routes/productRoutes.js';
import authRoutes from './routes/authRoutes.js';
import './workers/auctionWorker.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Cấu hình Helmet đầu tiên để bảo vệ các Header nhạy cảm
app.use(helmet());

// 2. Chống HTTP Parameter Pollution (HPP)
app.use(hpp());

// 3. Khử trùng đầu vào chống tấn công XSS
app.use(xss());

// Enable CORS with support for credentials (cookies)
app.use(cors({
  origin: 'http://localhost:5173', // Port mặc định của Vite
  credentials: true // BẮT BUỘC ĐỂ NHẬN COOKIE
}));

// Parse JSON bodies
app.use(express.json());

// 4. Cấu hình Global Rate Limiter: Tối đa 100 requests mỗi 15 phút
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100, // Tối đa 100 requests từ mỗi IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút.'
  }
});
app.use(globalLimiter);

// 5. Cấu hình Strict Rate Limiter chống Bot spam giá và Brute force đăng nhập: Tối đa 5 requests / phút
const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: 5, // Tối đa 5 requests từ mỗi IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Yêu cầu quá nhanh. Vui lòng thử lại sau 1 phút để tránh spam.'
  }
});

// Áp dụng Rate Limiter đặc biệt khắc nghiệt cho các endpoints nhạy cảm
app.use('/api/auth/login', strictLimiter);
app.use('/api/bids/place', strictLimiter);

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
