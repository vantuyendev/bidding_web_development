import prisma from '../models/db.js';

// Get current logged-in user session
export const getMe = async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(200).json({
      success: true,
      data: null
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true,
        balance: true, walletBalance: true, frozenBalance: true,
        isBanned: true, banReason: true,
        isVerifiedSeller: true, kycStatus: true,
        isAdmin: true
      }
    });

    if (!user) {
      req.session = null; // Clear invalid session
      return res.status(200).json({
        success: true,
        data: null
      });
    }

    // Không cho phép user bị ban truy cập các tính năng
    // (họ vẫn có thể xem thông tin nhưng sẽ bị chặn ở route cụ thể)
    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        balance: Number(user.balance),
        walletBalance: Number(user.walletBalance),
        frozenBalance: Number(user.frozenBalance),
        isBanned: user.isBanned,
        banReason: user.banReason,
        isVerifiedSeller: user.isVerifiedSeller,
        kycStatus: user.kycStatus,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Đã xảy ra lỗi khi lấy thông tin người dùng.'
    });
  }
};

// Register controller: create a new user in the system
export const register = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Vui lòng cung cấp đầy đủ email và mật khẩu.'
    });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email này đã được sử dụng.'
      });
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: '$2b$10$mockpasswordhashplaceholder', // Password hash authenticity is ignored
        balance: 10000000.00, // Default 10M balance
        walletBalance: 10000000.00
      }
    });

    // Set user session
    req.session.userId = user.id;

    return res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công.',
      data: {
        id: user.id,
        email: user.email,
        balance: Number(user.balance)
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Đã xảy ra lỗi trong quá trình đăng ký.'
    });
  }
};

// Login controller: authenticity of mock password hash is ignored for this task
export const login = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Vui lòng cung cấp email.'
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true, email: true, name: true,
        balance: true, walletBalance: true, frozenBalance: true,
        isBanned: true, banReason: true,
        isVerifiedSeller: true, kycStatus: true,
        isAdmin: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Tài khoản không tồn tại. Vui lòng đăng ký.'
      });
    }

    // Chặn đăng nhập nếu tài khoản bị ban
    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        error: `Tài khoản của bạn đã bị khóa${user.banReason ? ': ' + user.banReason : '.'}. Vui lòng liên hệ Admin để biết thêm.`
      });
    }

    // Set the userId in the session
    req.session.userId = user.id;

    return res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công.',
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        balance: Number(user.balance),
        walletBalance: Number(user.walletBalance),
        frozenBalance: Number(user.frozenBalance),
        isBanned: user.isBanned,
        isVerifiedSeller: user.isVerifiedSeller,
        kycStatus: user.kycStatus,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Đã xảy ra lỗi trong quá trình đăng nhập.'
    });
  }
};

// Logout controller: clear session
export const logout = (req, res) => {
  req.session = null;
  return res.status(200).json({
    success: true,
    message: 'Đăng xuất thành công.'
  });
};

