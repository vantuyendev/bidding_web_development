export const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      error: 'Bạn cần đăng nhập để thực hiện thao tác này'
    });
  }
  next();
};
