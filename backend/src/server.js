import express from 'express';
import cors from 'cors';
import cookieSession from 'cookie-session';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import xssClean from './middlewares/xssClean.js';
import hpp from 'hpp';
import compression from 'compression';
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
import adminRoutes from './routes/adminRoutes.js';
import { requireAuth } from './middlewares/authMiddleware.js';
import { errorHandler } from './middlewares/errorMiddleware.js';
import { logger } from './utils/logger.js';
import './workers/auctionWorker.js';

// Tải các biến môi trường
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Bật trust proxy khi chạy trên Render hoặc trong môi trường sản xuất để hỗ trợ express-rate-limit phía sau reverse proxy
if (process.env.NODE_ENV === 'production' || process.env.RENDER === 'true') {
  app.set('trust proxy', 1);
}

// Bật middleware nén để giảm kích thước dữ liệu truyền tải
app.use(compression());

// 1. Cấu hình Helmet đầu tiên để bảo vệ các Header nhạy cảm
app.use(helmet());

// 2. Chống HTTP Parameter Pollution (HPP)
app.use(hpp());

// 3. Khử trùng đầu vào chống tấn công XSS
app.use(xssClean());

// Bật CORS hỗ trợ credentials (cookie) và so khớp origin mạnh mẽ
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'https://bidding-web-development.vercel.app'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Cho phép các yêu cầu không có origin (như ứng dụng di động, curl, hoặc server-to-server)
    if (!origin) return callback(null, true);
    
    // Kiểm tra xem origin có khớp với danh sách được phép hoặc kết thúc bằng vercel.app không
    const isAllowed = allowedOrigins.includes(origin) || 
                      allowedOrigins.includes(origin + '/') || // xử lý dấu gạch chéo cuối một cách an toàn
                      origin.endsWith('.vercel.app');
                      
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(null, false); // Chặn CORS nhưng không làm sập tiến trình Node
    }
  },
  credentials: true // BẮT BUỘC ĐỂ NHẬN COOKIE
 }));

// Phân tích cú pháp JSON trong body (tăng giới hạn lên 10mb để hỗ trợ tải lên ảnh sản phẩm dạng base64)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 4. Cấu hình Global Rate Limiter: Tăng giới hạn lên 1000 ở production / 10000 ở dev để tránh bị block nhầm
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: (process.env.NODE_ENV === 'development') ? 10000 : 1000, // Tối đa 1000 requests từ mỗi IP ở production
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút.'
  }
});
app.use(globalLimiter);

// 5. Cấu hình Strict Rate Limiter chống Bot spam giá và Brute force: Tối đa 60 requests / phút ở prod
const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: (process.env.NODE_ENV === 'development') ? 100 : 60, // 60 requests/phút ở production để thoải mái bidding
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Yêu cầu quá nhanh. Vui lòng thử lại sau 1 phút để tránh spam.'
  }
});

// Áp dụng Rate Limiter đặc biệt cho các endpoints nhạy cảm
app.use('/api/auth/login', strictLimiter);
app.use('/api/bids/place', strictLimiter);

// Cấu hình middleware Cookie Session để xác thực với bảo mật cấp ngân hàng
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
  // Trong production, nếu dùng VITE_API_URL trực tiếp (cross-origin) thì phải set sameSite: 'none'
  sameSite: isProduction ? 'none' : 'lax'
}));

// Gắn các tuyến đường API
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
app.use('/api/admin', adminRoutes);

// Gắn middleware xử lý lỗi tập trung (PHẢI được đăng ký sau khi định nghĩa tất cả các tuyến đường)
app.use(errorHandler);

// Tuyến đường cơ bản để kiểm tra máy chủ hoạt động bình thường
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: "Bidding Web API Server is running successfully!",
    timestamp: new Date().toISOString()
  });
});

// Lắng nghe trên cổng đã được cấu hình
app.listen(PORT, () => {
  logger.info(`Server successfully started`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development'
  });
});
