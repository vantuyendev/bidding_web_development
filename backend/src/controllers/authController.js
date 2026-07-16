import prisma from '../models/db.js';
import bcrypt from 'bcryptjs';

// Lấy phiên làm việc của người dùng đăng nhập hiện tại
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
      req.session = null; // Xóa session không hợp lệ
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

// Controller đăng ký: tạo một người dùng mới trong hệ thống
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

    // Băm mật khẩu bằng bcrypt trước khi lưu vào database.
    // - Cost factor 12: chỉ định độ phức tạp của thuật toán băm (2^12 vòng lặp),
    //   càng cao càng an toàn nhưng càng chậm. Factor 12 là mức khó khuyến nghị năm 2024+.
    // - bcrypt tự động thêm "salt" (chuỗi ngẫu nhiên) vào mật khẩu trước khi băm,
    //   giúp ngăn chặn tấn công Rainbow Table (bảng tra mã hásh định sẵn).
    // - Kết quả là một chuỗi 60 ký tự dài được lưu vào cột `password_hash`.
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        balance: 0.00,
        walletBalance: 0.00
      }
    });

    // Thiết lập phiên người dùng (session)
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

// Controller đăng nhập: kiểm tra email, xác thực mật khẩu bằng bcrypt, tạo session
export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Vui lòng cung cấp đầy đủ email và mật khẩu.'
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true, email: true, name: true,
        passwordHash: true,
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

    // Xác thực mật khẩu người dùng nhập vào với mã băm lưu trong database.
    // - bcrypt.compare() không giải mã (vì không thể giải mã), mà băm lại mật khẩu
    //   với cùng salt đằ rồi so sánh kết quả với hash đã lưu.
    // - Trả về `false` nếu sai mật khẩu, trả `true` nếu đúng.
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Mật khẩu không chính xác.'
      });
    }

    // Chặn đăng nhập nếu tài khoản bị ban
    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        error: `Tài khoản của bạn đã bị khóa${user.banReason ? ': ' + user.banReason : '.'}. Vui lòng liên hệ Admin để biết thêm.`
      });
    }

    // Thiết lập userId vào session
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

// Controller đăng xuất: xóa phiên làm việc (session)
export const logout = (req, res) => {
  req.session = null;
  return res.status(200).json({
    success: true,
    message: 'Đăng xuất thành công.'
  });
};

