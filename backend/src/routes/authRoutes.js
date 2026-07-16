import express from 'express';
import { login, logout, register, getMe } from '../controllers/authController.js';

const router = express.Router();

// GET /api/auth/me - Lấy hồ sơ người dùng đang đăng nhập hiện tại
router.get('/me', getMe);

// POST /api/auth/register - Đăng ký người dùng mới
router.post('/register', register);

// POST /api/auth/login - Đăng nhập người dùng và thiết lập phiên làm việc
router.post('/login', login);

// POST /api/auth/logout - Đăng xuất và xóa phiên làm việc
router.post('/logout', logout);

export default router;
