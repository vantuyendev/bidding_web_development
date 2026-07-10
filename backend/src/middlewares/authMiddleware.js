import prisma from '../models/db.js';

export const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      error: 'Bạn cần đăng nhập để thực hiện thao tác này'
    });
  }
  next();
};

// Kiểm tra tài khoản không bị ban (dùng sau requireAuth)
export const requireNotBanned = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: { isBanned: true, banReason: true }
    });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Người dùng không tồn tại.' });
    }
    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        error: `Tài khoản của bạn đã bị khóa${user.banReason ? ': ' + user.banReason : '.'}. Vui lòng liên hệ Admin.`
      });
    }
    next();
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Lỗi xác thực tài khoản.' });
  }
};

// Kiểm tra quyền admin (dùng cột is_admin trong DB, không phụ thuộc vào email)
export const requireAdmin = async (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ success: false, error: 'Yêu cầu đăng nhập.' });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: { isAdmin: true, isBanned: true }
    });
    if (!user || !user.isAdmin) {
      return res.status(403).json({ success: false, error: 'Quyền truy cập bị từ chối.' });
    }
    if (user.isBanned) {
      return res.status(403).json({ success: false, error: 'Tài khoản admin đã bị khóa.' });
    }
    next();
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Lỗi xác thực quyền admin.' });
  }
};
