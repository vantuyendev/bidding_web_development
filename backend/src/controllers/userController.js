import prisma from '../models/db.js';
import { Prisma } from '@prisma/client';

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
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        bids: {
          include: {
            product: {
              include: {
                review: true
              }
            }
          },
          orderBy: { bidTime: 'desc' },
          take: 20
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
      frozenBalance: Number(userProfile.frozenBalance),
      transactions: userProfile.transactions ? userProfile.transactions.map(t => ({
        ...t,
        amount: Number(t.amount)
      })) : [],
      bids: userProfile.bids ? userProfile.bids.map(b => ({
        ...b,
        bidAmount: Number(b.bidAmount),
        maxAutoBidAmount: b.maxAutoBidAmount ? Number(b.maxAutoBidAmount) : null,
        product: b.product ? {
          ...b.product,
          startPrice: Number(b.product.startPrice),
          currentPrice: Number(b.product.currentPrice),
          buyNowPrice: b.product.buyNowPrice ? Number(b.product.buyNowPrice) : null,
          review: b.product.review || null
        } : null
      })) : []
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
      data: { isVerifiedSeller: true, kycStatus: 'APPROVED' }
    });

    return res.status(200).json({
      success: true,
      message: 'Chúc mừng! Tài khoản của bạn đã được nâng cấp thành Người bán xác thực.',
      data: {
        id: user.id,
        isVerifiedSeller: user.isVerifiedSeller,
        kycStatus: user.kycStatus
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Đã xảy ra lỗi khi xác thực người bán.'
    });
  }
};

// Deposit funds from external balance to Aura Bid wallet balance
export const depositFunds = async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Bạn cần đăng nhập để thực hiện.' });
  }

  const { amount } = req.body;
  const depositAmount = new Prisma.Decimal(amount || 0);

  if (depositAmount.lte(0)) {
    return res.status(400).json({ success: false, error: 'Số tiền nạp phải lớn hơn 0.' });
  }

  try {
    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { balance: true, walletBalance: true, frozenBalance: true }
      });

      if (!user) throw new Error('Người dùng không tồn tại.');

      const bankBalance = new Prisma.Decimal(user.balance);
      if (bankBalance.lt(depositAmount)) {
        throw new Error('Số dư tài khoản ngân hàng liên kết không đủ.');
      }

      // Decrement external bank balance and increment wallet balance
      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          balance: bankBalance.minus(depositAmount),
          walletBalance: new Prisma.Decimal(user.walletBalance).plus(depositAmount)
        }
      });

      // Create transaction log
      await tx.transaction.create({
        data: {
          userId,
          amount: depositAmount,
          type: 'DEPOSIT',
          status: 'COMPLETED'
        }
      });

      return updated;
    });

    return res.status(200).json({
      success: true,
      message: `Nạp tiền thành công: +${depositAmount.toLocaleString('vi-VN')} đ vào ví.`,
      data: {
        balance: Number(updatedUser.balance),
        walletBalance: Number(updatedUser.walletBalance),
        frozenBalance: Number(updatedUser.frozenBalance)
      }
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message || 'Đã xảy ra lỗi khi nạp tiền.'
    });
  }
};

// Withdraw funds from Aura Bid wallet balance to external bank balance
export const withdrawFunds = async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Bạn cần đăng nhập để thực hiện.' });
  }

  const { amount } = req.body;
  const withdrawAmount = new Prisma.Decimal(amount || 0);

  if (withdrawAmount.lte(0)) {
    return res.status(400).json({ success: false, error: 'Số tiền rút phải lớn hơn 0.' });
  }

  try {
    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { balance: true, walletBalance: true, frozenBalance: true }
      });

      if (!user) throw new Error('Người dùng không tồn tại.');

      const walletBal = new Prisma.Decimal(user.walletBalance);
      if (walletBal.lt(withdrawAmount)) {
        throw new Error('Số dư ví khả dụng không đủ để thực hiện rút tiền.');
      }

      // Decrement wallet balance and increment external bank balance
      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          walletBalance: walletBal.minus(withdrawAmount),
          balance: new Prisma.Decimal(user.balance).plus(withdrawAmount)
        }
      });

      // Create transaction log
      await tx.transaction.create({
        data: {
          userId,
          amount: withdrawAmount,
          type: 'WITHDRAW',
          status: 'COMPLETED'
        }
      });

      return updated;
    });

    return res.status(200).json({
      success: true,
      message: `Rút tiền thành công: -${withdrawAmount.toLocaleString('vi-VN')} đ khỏi ví.`,
      data: {
        balance: Number(updatedUser.balance),
        walletBalance: Number(updatedUser.walletBalance),
        frozenBalance: Number(updatedUser.frozenBalance)
      }
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message || 'Đã xảy ra lỗi khi rút tiền.'
    });
  }
};

// Submit KYC Seller request
export const submitKyc = async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Bạn cần đăng nhập để thực hiện.' });
  }

  const { idCardNumber, idCardImageUrl, shopAddress, phoneNumber } = req.body;

  if (!idCardNumber || !shopAddress) {
    return res.status(400).json({ success: false, error: 'Vui lòng cung cấp số CCCD và địa chỉ cửa hàng.' });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        idCardNumber,
        idCardImageUrl: idCardImageUrl || 'https://picsum.photos/seed/kyc/400/300', // mock kyc image
        shopAddress,
        phoneNumber: phoneNumber || undefined,
        kycStatus: 'PENDING'
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Gửi hồ sơ KYC thành công. Vui lòng chờ Admin phê duyệt.',
      data: {
        id: updated.id,
        kycStatus: updated.kycStatus
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Đã xảy ra lỗi khi gửi hồ sơ KYC.'
    });
  }
};

// Admin retrieve pending KYC applications
export const adminGetPendingKyc = async (req, res) => {
  const adminId = req.session?.userId;
  if (!adminId) {
    return res.status(401).json({ success: false, error: 'Yêu cầu đăng nhập.' });
  }

  try {
    const adminUser = await prisma.user.findUnique({ where: { id: adminId } });
    if (!adminUser || !adminUser.email.toLowerCase().includes('admin')) {
      return res.status(403).json({ success: false, error: 'Quyền truy cập bị từ chối: Chỉ tài khoản Admin mới được thực hiện.' });
    }

    const pendingUsers = await prisma.user.findMany({
      where: { kycStatus: 'PENDING' },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        idCardNumber: true,
        idCardImageUrl: true,
        shopAddress: true,
        kycStatus: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({
      success: true,
      data: pendingUsers
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Đã xảy ra lỗi khi lấy hồ sơ KYC.'
    });
  }
};

// Admin approve/reject KYC Seller requests
export const adminApproveKyc = async (req, res) => {
  const adminId = req.session?.userId;
  if (!adminId) {
    return res.status(401).json({ success: false, error: 'Yêu cầu đăng nhập.' });
  }

  const { targetUserId, action } = req.body; // action: 'APPROVE' or 'REJECT'

  if (!targetUserId || !['APPROVE', 'REJECT'].includes(action)) {
    return res.status(400).json({ success: false, error: 'Thiếu thông tin targetUserId hoặc action hợp lệ.' });
  }

  try {
    const adminUser = await prisma.user.findUnique({ where: { id: adminId } });
    if (!adminUser || !adminUser.email.toLowerCase().includes('admin')) {
      return res.status(403).json({ success: false, error: 'Quyền truy cập bị từ chối.' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy người dùng cần duyệt.' });
    }

    const kycStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    const isVerifiedSeller = action === 'APPROVE';

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { kycStatus, isVerifiedSeller }
    });

    return res.status(200).json({
      success: true,
      message: action === 'APPROVE'
        ? `Đã phê duyệt tài khoản ${updatedUser.email} thành Người bán xác thực.`
        : `Đã từ chối hồ sơ KYC của tài khoản ${updatedUser.email}.`,
      data: {
        id: updatedUser.id,
        kycStatus: updatedUser.kycStatus,
        isVerifiedSeller: updatedUser.isVerifiedSeller
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Đã xảy ra lỗi khi duyệt hồ sơ.'
    });
  }
};

// GET /api/users/:id - Fetch public profile of a user (seller) with reviews received
export const getPublicUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            soldProducts: true,
            reviewsReceived: true
          }
        },
        reviewsReceived: {
          include: {
            reviewer: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            product: {
              select: {
                id: true,
                title: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy thông tin người dùng.'
      });
    }

    const data = {
      id: user.id,
      name: user.name,
      email: user.email,
      reputationScore: Number(user.reputationScore),
      isVerifiedSeller: user.isVerifiedSeller,
      createdAt: user.createdAt,
      soldCount: user._count.soldProducts,
      reviewsCount: user._count.reviewsReceived,
      reviews: user.reviewsReceived.map(review => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        reviewer: {
          id: review.reviewer.id,
          name: review.reviewer.name || review.reviewer.email
        },
        product: review.product ? {
          id: review.product.id,
          title: review.product.title
        } : null
      }))
    };

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Đã xảy ra lỗi khi lấy thông tin người dùng.'
    });
  }
};


