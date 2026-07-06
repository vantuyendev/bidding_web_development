import prisma from '../models/db.js';
import notificationEmitter from '../utils/notificationEmitter.js';

// GET /api/notifications - Get list of notifications for current user
export const getNotifications = async (req, res) => {
  try {
    const userId = req.session.userId;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return res.status(200).json({
      success: true,
      data: notifications
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Đã xảy ra lỗi khi lấy danh sách thông báo.'
    });
  }
};

// PUT /api/notifications/read - Mark one or all notifications of current user as read
export const markAsRead = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.body;

    if (id) {
      // Mark a single notification as read, checking owner
      const notification = await prisma.notification.findFirst({
        where: { id, userId }
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          error: 'Không tìm thấy thông báo hoặc thông báo không thuộc về bạn.'
        });
      }

      const updated = await prisma.notification.update({
        where: { id },
        data: { isRead: true }
      });

      return res.status(200).json({
        success: true,
        message: 'Đã đánh dấu thông báo là đã đọc.',
        data: updated
      });
    } else {
      // Mark all notifications for this user as read
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true }
      });

      return res.status(200).json({
        success: true,
        message: 'Đã đánh dấu tất cả thông báo là đã đọc.'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Đã xảy ra lỗi khi cập nhật trạng thái thông báo.'
    });
  }
};

// GET /api/notifications/live - SSE stream for real-time notifications
export const streamNotifications = (req, res) => {
  const userId = req.session?.userId;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Chưa đăng nhập' });
  }

  // Set mandatory SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  res.write('\n');

  const sendEvent = (event, data) => {
    try {
      const eventString = event ? `event: ${event}\n` : '';
      res.write(`${eventString}data: ${JSON.stringify(data)}\n\n`);
    } catch (e) {
      // client closed connection
    }
  };

  sendEvent('connected', { message: 'Notification stream connected', userId });

  const onNotification = (notification) => {
    sendEvent('notification', notification);
  };

  const eventName = `notification-${userId}`;
  notificationEmitter.on(eventName, onNotification);

  // Heartbeat to prevent disconnect
  const heartbeat = setInterval(() => {
    sendEvent('heartbeat', { time: new Date().toISOString() });
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    notificationEmitter.off(eventName, onNotification);
    res.end();
  });
};
