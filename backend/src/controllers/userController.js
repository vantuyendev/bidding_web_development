import prisma from '../models/db.js';

// Retrieve the current logged-in user profile with counts of sold products and reviews received
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            soldProducts: true,
            reviewsReceived: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy người dùng.'
      });
    }

    // Remove passwordHash for security
    const { passwordHash, ...userProfile } = user;

    // Convert Decimals to Numbers for API output compatibility
    const data = {
      ...userProfile,
      balance: Number(userProfile.balance),
      walletBalance: Number(userProfile.walletBalance),
      frozenBalance: Number(userProfile.frozenBalance)
    };

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Đã xảy ra lỗi khi lấy thông tin cá nhân.'
    });
  }
};

// Automatically verify the seller profile (auto KYC for testing)
export const verifySeller = async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isVerifiedSeller: true }
    });

    return res.status(200).json({
      success: true,
      message: 'Chúc mừng! Tài khoản của bạn đã được nâng cấp thành Người bán xác thực.',
      data: {
        id: user.id,
        isVerifiedSeller: user.isVerifiedSeller
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Đã xảy ra lỗi khi xác thực người bán.'
    });
  }
};
