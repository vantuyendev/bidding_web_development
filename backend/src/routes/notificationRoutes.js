import express from 'express';
import { getNotifications, markAsRead, streamNotifications } from '../controllers/notificationController.js';

const router = express.Router();

// GET /api/notifications/live - Luồng SSE cho thông báo (được bảo vệ, gắn kèm requireAuth trong server.js)
router.get('/live', streamNotifications);

// GET /api/notifications - Lấy danh sách thông báo của người dùng hiện tại
router.get('/', getNotifications);

// PUT /api/notifications/read - Đánh dấu một hoặc tất cả thông báo của người dùng hiện tại là đã đọc
router.put('/read', markAsRead);

export default router;

