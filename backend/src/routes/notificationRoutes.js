import express from 'express';
import { getNotifications, markAsRead, streamNotifications } from '../controllers/notificationController.js';

const router = express.Router();

// GET /api/notifications/live - SSE stream for notifications (protected, mounted with requireAuth in server.js)
router.get('/live', streamNotifications);

// GET /api/notifications - Get list of notifications for current user
router.get('/', getNotifications);

// PUT /api/notifications/read - Mark one or all notifications of current user as read
router.put('/read', markAsRead);

export default router;

