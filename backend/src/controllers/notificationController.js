import prisma from '../models/db.js';

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
