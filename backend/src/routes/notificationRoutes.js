import express from 'express';
import { getNotifications, markAsRead } from '../controllers/notificationController.js';

const router = express.Router();

// GET /api/notifications - Get list of notifications for current user
router.get('/', getNotifications);

// PUT /api/notifications/read - Mark one or all notifications of current user as read
router.put('/read', markAsRead);

export default router;
