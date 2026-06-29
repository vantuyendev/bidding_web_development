import prisma from '../models/db.js';

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
      where: { email }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Tài khoản không tồn tại.'
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
        balance: Number(user.balance)
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
