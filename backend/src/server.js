import express from 'express';
import cors from 'cors';
import cookieSession from 'cookie-session';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import xssClean from './middlewares/xssClean.js';
import hpp from 'hpp';
import bidRoutes from './routes/bidRoutes.js';
import productRoutes from './routes/productRoutes.js';
import authRoutes from './routes/authRoutes.js';
import shippingRoutes from './routes/shippingRoutes.js';
import disputeRoutes from './routes/disputeRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import userRoutes from './routes/userRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import watchlistRoutes from './routes/watchlistRoutes.js';
import { requireAuth } from './middlewares/authMiddleware.js';
import { errorHandler } from './middlewares/errorMiddleware.js';
import { logger } from './utils/logger.js';
import './workers/auctionWorker.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable trust proxy in production to support express-rate-limit behind reverse proxies (like Render)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// 1. Cấu hình Helmet đầu tiên để bảo vệ các Header nhạy cảm
app.use(helmet());

// 2. Chống HTTP Parameter Pollution (HPP)
app.use(hpp());

// 3. Khử trùng đầu vào chống tấn công XSS
app.use(xssClean());

// Enable CORS with support for credentials (cookies) and robust origin matching
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'https://bidding-web-development.vercel.app'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);
    
    // Check if origin matches allowed list or ends with vercel.app
    const isAllowed = allowedOrigins.includes(origin) || 
                      allowedOrigins.includes(origin + '/') || // handle trailing slash safely
                      origin.endsWith('.vercel.app');
                      
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(null, false); // Block CORS but don't crash Node process
    }
  },
  credentials: true // BẮT BUỘC ĐỂ NHẬN COOKIE
}));

// Parse JSON bodies (increased limit to 10mb to support base64 product image uploads)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 4. Cấu hình Global Rate Limiter: Tối đa 100 requests mỗi 15 phút (tăng lên 10000 ở dev)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: process.env.NODE_ENV === 'development' ? 10000 : 100, // Tối đa 100 requests từ mỗi IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút.'
  }
});
app.use(globalLimiter);

// 5. Cấu hình Strict Rate Limiter chống Bot spam giá và Brute force đăng nhập: Tối đa 5 requests / phút (tăng lên 100 ở dev)
const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: process.env.NODE_ENV === 'development' ? 100 : 5, // Tối đa 5 requests từ mỗi IP
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

// Configure Cookie Session middleware for authentication with banking-grade security
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'secret-key-123')) {
  console.warn('⚠️ WARNING: SESSION_SECRET is not set or using default value in production! Please configure a strong secret key.');
}

app.use(cookieSession({
  name: 'auction_session',
  keys: [process.env.SESSION_SECRET || 'secret-key-123'],
  maxAge: 24 * 60 * 60 * 1000,
  httpOnly: true, // Chống XSS: JavaScript ở frontend không thể đọc được cookie này
  secure: isProduction, // Chỉ gửi cookie qua HTTPS
  // 'lax' is safe here because Vercel proxies /api/* to the backend (same-origin)
  sameSite: 'lax'
}));

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/products', productRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/notifications', requireAuth, notificationRoutes);
app.use('/api/reviews', requireAuth, reviewRoutes);

// Mounting Centralized Error Handler Middleware (MUST be registered after all route definitions)
app.use(errorHandler);

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
  logger.info(`Server successfully started`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development'
  });
});
