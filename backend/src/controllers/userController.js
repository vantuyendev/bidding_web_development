import prisma from '../models/db.js';
import { Prisma } from '@prisma/client';
import ApiError from '../utils/ApiError.js';
import { z } from 'zod';

// Định nghĩa các schema xác thực đầu vào bằng Zod
const depositSchema = z.object({
  amount: z.coerce.number({ invalid_type_error: "Số tiền nạp phải là một con số." })
    .gt(0, { message: "Số tiền nạp phải lớn hơn 0." })
    .max(500000000, { message: "Số tiền nạp tối đa mỗi lần là 500 triệu đồng." })
});

const withdrawSchema = z.object({
  amount: z.coerce.number({ invalid_type_error: "Số tiền rút phải là một con số." })
    .gt(0, { message: "Số tiền rút phải lớn hơn 0." }),
  bankName: z.string({ required_error: "Vui lòng nhập tên ngân hàng nhận tiền." }).trim().min(1, { message: "Tên ngân hàng nhận tiền không được để trống." }),
  bankAccount: z.string({ required_error: "Vui lòng nhập số tài khoản nhận tiền." }).trim().min(1, { message: "Số tài khoản nhận tiền không được để trống." }),
  bankOwner: z.string({ required_error: "Vui lòng nhập tên chủ tài khoản nhận tiền." }).trim().min(1, { message: "Tên chủ tài khoản nhận tiền không được để trống." })
});

const kycSchema = z.object({
  idCardNumber: z.string().trim().min(9, { message: "Số CMND/CCCD phải có ít nhất 9 ký tự." }).max(20, { message: "Số CMND/CCCD không hợp lệ." }),
  idCardImageUrl: z.string().url({ message: "Đường dẫn ảnh thẻ CMND/CCCD không hợp lệ." }).optional().or(z.literal('')),
  shopAddress: z.string().trim().min(5, { message: "Địa chỉ cửa hàng phải có ít nhất 5 ký tự." }),
  phoneNumber: z.string().trim().regex(/^[0-9+]{9,15}$/, { message: "Số điện thoại không hợp lệ." }).optional().or(z.literal(''))
});

const adminApproveKycSchema = z.object({
  targetUserId: z.string().uuid({ message: "ID người dùng không hợp lệ." }),
  action: z.enum(['APPROVE', 'REJECT'], { errorMap: () => ({ message: "Hành động chỉ có thể là APPROVE hoặc REJECT." }) }),
  rejectionReason: z.string().trim().optional()
}).refine(data => data.action !== 'REJECT' || (data.rejectionReason && data.rejectionReason.trim().length > 0), {
  message: "Vui lòng cung cấp lý do từ chối hồ sơ KYC.",
  path: ["rejectionReason"]
});

// Retrieve the current logged-in user profile with counts of sold products and reviews received
export const getUserProfile = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    // Tối ưu hóa database: Chỉ SELECT các cột cần thiết, tránh passwordHash ngay từ tầng DB
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        balance: true,
        walletBalance: true,
        frozenBalance: true,
        reputationScore: true,
        createdAt: true,
        isVerifiedSeller: true,
        kycStatus: true,
        avatarUrl: true,
        phoneNumber: true,
        isBanned: true,
        banReason: true,
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
      throw new ApiError(404, 'Không tìm thấy người dùng.');
    }

    const userProfile = user;

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
    return next(error);
  }
};

// Automatically verify the seller profile (auto KYC for testing)
export const verifySeller = async (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: 'Tính năng tự động xác thực người bán bị vô hiệu hóa ở môi trường Production. Vui lòng gửi hồ sơ KYC để Admin phê duyệt.'
    });
  }

  try {
    const userId = req.session.userId;
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isVerifiedSeller: true, kycStatus: 'APPROVED' },
      select: {
        id: true,
        isVerifiedSeller: true,
        kycStatus: true
      }
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
    return next(error);
  }
};

// Tạo yêu cầu nạp tiền — admin sẽ xác nhận sau khi user chuyển khoản
export const depositFunds = async (req, res, next) => {
  const userId = req.session?.userId;
  if (!userId) {
    return next(new ApiError(401, 'Bạn cần đăng nhập để thực hiện.'));
  }

  try {
    // Xác thực đầu vào bằng Zod
    const validation = depositSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ApiError(400, validation.error.errors[0].message);
    }
    const { amount } = validation.data;
    const depositAmount = new Prisma.Decimal(amount);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isBanned: true }
    });
    if (!user) throw new ApiError(404, 'Người dùng không tồn tại.');
    if (user.isBanned) throw new ApiError(403, 'Tài khoản của bạn đã bị khóa.');

    // Tạo mã tham chiếu để user ghi vào nội dung chuyển khoản
    const transferNote = `NAP ${userId.slice(0, 8).toUpperCase()} ${Date.now().toString().slice(-6)}`;

    const walletRequest = await prisma.walletRequest.create({
      data: {
        userId,
        type: 'DEPOSIT',
        amount: depositAmount,
        status: 'PENDING',
        transferNote
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Yêu cầu nạp tiền đã được tạo. Vui lòng chuyển khoản và chờ Admin xác nhận.',
      data: {
        id: walletRequest.id,
        amount: Number(walletRequest.amount),
        transferNote,
        adminBankInfo: {
          bankName: process.env.ADMIN_BANK_NAME || 'Vietcombank',
          bankAccount: process.env.ADMIN_BANK_ACCOUNT || '1234567890',
          bankOwner: process.env.ADMIN_BANK_OWNER || 'NGUYEN VAN A'
        }
      }
    });
  } catch (error) {
    return next(error);
  }
};

// Tạo yêu cầu rút tiền — admin sẽ chuyển khoản sau khi xác nhận
export const withdrawFunds = async (req, res, next) => {
  const userId = req.session?.userId;
  if (!userId) {
    return next(new ApiError(401, 'Bạn cần đăng nhập để thực hiện.'));
  }

  try {
    // Xác thực đầu vào bằng Zod
    const validation = withdrawSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ApiError(400, validation.error.errors[0].message);
    }
    const { amount, bankName, bankAccount, bankOwner } = validation.data;
    const withdrawAmount = new Prisma.Decimal(amount);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, walletBalance: true, isBanned: true }
    });
    if (!user) throw new ApiError(404, 'Người dùng không tồn tại.');
    if (user.isBanned) throw new ApiError(403, 'Tài khoản của bạn đã bị khóa.');

    const walletBal = new Prisma.Decimal(user.walletBalance);
    if (walletBal.lt(withdrawAmount)) {
      throw new ApiError(400, 'Số dư ví không đủ để thực hiện rút tiền.');
    }

    // Kiểm tra xem có yêu cầu rút tiền đang chờ xử lý không
    const pendingWithdraw = await prisma.walletRequest.findFirst({
      where: { userId, type: 'WITHDRAW', status: 'PENDING' }
    });
    if (pendingWithdraw) {
      throw new ApiError(400, 'Bạn đã có một yêu cầu rút tiền đang chờ xử lý.');
    }

    const walletRequest = await prisma.walletRequest.create({
      data: {
        userId,
        type: 'WITHDRAW',
        amount: withdrawAmount,
        status: 'PENDING',
        bankName,
        bankAccount,
        bankOwner
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Yêu cầu rút tiền đã được gửi. Admin sẽ chuyển khoản trong vòng 24 giờ làm việc.',
      data: {
        id: walletRequest.id,
        amount: Number(walletRequest.amount),
        bankName: walletRequest.bankName,
        bankAccount: walletRequest.bankAccount,
        status: 'PENDING'
      }
    });
  } catch (error) {
    return next(error);
  }
};

// GET /api/users/wallet-requests — Lấy danh sách yêu cầu nạp/rút của user
export const getUserWalletRequests = async (req, res, next) => {
  const userId = req.session?.userId;
  if (!userId) {
    return next(new ApiError(401, 'Bạn cần đăng nhập để thực hiện.'));
  }

  try {
    const { type, status, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, parseInt(limit) || 20);

    const where = { userId };
    if (type && ['DEPOSIT', 'WITHDRAW'].includes(type)) where.type = type;
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) where.status = status;

    const [requests, total] = await Promise.all([
      prisma.walletRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum
      }),
      prisma.walletRequest.count({ where })
    ]);

    return res.json({
      success: true,
      data: requests.map(r => ({ ...r, amount: Number(r.amount) })),
      adminBankInfo: {
        bankName: process.env.ADMIN_BANK_NAME || 'Vietcombank',
        bankAccount: process.env.ADMIN_BANK_ACCOUNT || '1234567890',
        bankOwner: process.env.ADMIN_BANK_OWNER || 'NGUYEN VAN A'
      },
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    return next(error);
  }
};

// DELETE /api/users/wallet-requests/:id — Hủy yêu cầu nạp/rút tiền đang chờ duyệt (PENDING)
export const cancelWalletRequest = async (req, res, next) => {
  const userId = req.session?.userId;
  if (!userId) {
    return next(new ApiError(401, 'Bạn cần đăng nhập để thực hiện.'));
  }

  const { id: requestId } = req.params;

  try {
    const walletReq = await prisma.walletRequest.findUnique({
      where: { id: requestId }
    });

    if (!walletReq) {
      throw new ApiError(404, 'Không tìm thấy yêu cầu.');
    }

    if (walletReq.userId !== userId) {
      throw new ApiError(403, 'Bạn không có quyền hủy yêu cầu này.');
    }

    if (walletReq.status !== 'PENDING') {
      throw new ApiError(400, 'Chỉ có thể hủy yêu cầu đang ở trạng thái chờ duyệt.');
    }

    const updated = await prisma.walletRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELLED', resolvedAt: new Date() }
    });

    return res.json({
      success: true,
      message: 'Đã hủy yêu cầu thành công.',
      data: {
        id: updated.id,
        status: updated.status
      }
    });
  } catch (error) {
    return next(error);
  }
};

// GET /api/users/won-auctions — Lấy danh sách sản phẩm thắng đấu giá của user
export const getWonAuctions = async (req, res, next) => {
  const userId = req.session?.userId;
  if (!userId) {
    return next(new ApiError(401, 'Bạn cần đăng nhập để thực hiện.'));
  }

  try {
    const { status, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, parseInt(limit) || 20);

    const where = {
      winnerId: userId,
      deletedAt: null
    };

    // Filter by product status if provided (e.g., PENDING_PAYMENT, PAID, SHIPPED, COMPLETED)
    if (status && ['PENDING_PAYMENT', 'PAID', 'SHIPPED', 'COMPLETED'].includes(status)) {
      where.status = status;
    } else {
      // Default: only return won products in these states
      where.status = {
        in: ['PENDING_PAYMENT', 'PAID', 'SHIPPED', 'COMPLETED']
      };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          seller: { select: { id: true, email: true, name: true } },
          category: { select: { id: true, name: true } }
        },
        orderBy: { endTime: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum
      }),
      prisma.product.count({ where })
    ]);

    return res.json({
      success: true,
      data: products.map(p => ({
        ...p,
        startPrice: Number(p.startPrice),
        currentPrice: Number(p.currentPrice),
        buyNowPrice: p.buyNowPrice ? Number(p.buyNowPrice) : null,
        shippingFee: p.shippingFee ? Number(p.shippingFee) : null
      })),
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    return next(error);
  }
};

// GET /api/users/transactions — Lấy lịch sử giao dịch ví của user
export const getUserTransactionHistory = async (req, res, next) => {
  const userId = req.session?.userId;
  if (!userId) {
    return next(new ApiError(401, 'Bạn cần đăng nhập để thực hiện.'));
  }

  try {
    const { type, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, parseInt(limit) || 20);

    const where = { userId };
    if (type && ['DEPOSIT', 'WITHDRAW', 'HOLD_ESCROW', 'RELEASE_ESCROW', 'PAYMENT', 'DISPUTE_PAY_BUYER_DEDUCT', 'DISPUTE_PAY_SELLER_ADD', 'REFUND'].includes(type)) {
      where.type = type;
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          product: { select: { id: true, title: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum
      }),
      prisma.transaction.count({ where })
    ]);

    return res.json({
      success: true,
      data: transactions.map(t => ({
        ...t,
        amount: Number(t.amount)
      })),
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    return next(error);
  }
};

// Submit KYC Seller request
export const submitKyc = async (req, res, next) => {
  const userId = req.session?.userId;
  if (!userId) {
    return next(new ApiError(401, 'Bạn cần đăng nhập để thực hiện.'));
  }

  try {
    // Xác thực đầu vào bằng Zod
    const validation = kycSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ApiError(400, validation.error.errors[0].message);
    }
    const { idCardNumber, idCardImageUrl, shopAddress, phoneNumber } = validation.data;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        idCardNumber,
        idCardImageUrl: idCardImageUrl || 'https://picsum.photos/seed/kyc/400/300', // mock kyc image
        shopAddress,
        phoneNumber: phoneNumber || undefined,
        kycStatus: 'PENDING'
      },
      select: {
        id: true,
        kycStatus: true
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
    return next(error);
  }
};

// Admin retrieve pending KYC applications
export const adminGetPendingKyc = async (req, res, next) => {
  const adminId = req.session?.userId;
  if (!adminId) {
    return next(new ApiError(401, 'Yêu cầu đăng nhập.'));
  }

  try {
    const adminUser = await prisma.user.findUnique({ where: { id: adminId } });
    if (!adminUser || !adminUser.isAdmin) {
      throw new ApiError(403, 'Quyền truy cập bị từ chối: Chỉ tài khoản Admin mới được thực hiện.');
    }

    // Tối ưu hóa database: Bổ sung phân trang cho danh sách KYC chờ duyệt
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const [pendingUsers, total] = await Promise.all([
      prisma.user.findMany({
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
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.user.count({ where: { kycStatus: 'PENDING' } })
    ]);

    return res.status(200).json({
      success: true,
      data: pendingUsers,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    return next(error);
  }
};

// Admin approve/reject KYC Seller requests
export const adminApproveKyc = async (req, res, next) => {
  const adminId = req.session?.userId;
  if (!adminId) {
    return next(new ApiError(401, 'Yêu cầu đăng nhập.'));
  }

  try {
    const adminUser = await prisma.user.findUnique({ where: { id: adminId } });
    if (!adminUser || !adminUser.isAdmin) {
      throw new ApiError(403, 'Quyền truy cập bị từ chối.');
    }

    // Xác thực đầu vào bằng Zod
    const validation = adminApproveKycSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ApiError(400, validation.error.errors[0].message);
    }
    const { targetUserId, action, rejectionReason } = validation.data;

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      throw new ApiError(404, 'Không tìm thấy người dùng cần duyệt.');
    }

    const kycStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    const isVerifiedSeller = action === 'APPROVE';

    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: targetUserId },
        data: {
          kycStatus,
          isVerifiedSeller,
          kycRejectionReason: action === 'REJECT' ? rejectionReason : null
        }
      });

      // Gửi notification cho user
      await tx.notification.create({
        data: {
          userId: targetUserId,
          title: action === 'APPROVE'
            ? 'Hồ sơ KYC đã được phê duyệt'
            : 'Hồ sơ KYC đã bị từ chối',
          message: action === 'APPROVE'
            ? 'Chúc mừng! Hồ sơ KYC của bạn đã được phê duyệt. Bạn đã trở thành Người bán xác thực.'
            : `Hồ sơ KYC của bạn đã bị từ chối với lý do: ${rejectionReason}. Vui lòng cập nhật thông tin chính xác và gửi lại.`,
          type: 'SYSTEM'
        }
      });

      // Tạo audit log
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: action === 'APPROVE' ? 'ADMIN_APPROVE_KYC' : 'ADMIN_REJECT_KYC',
          target: targetUserId,
          details: JSON.stringify({
            email: targetUser.email,
            rejectionReason: action === 'REJECT' ? rejectionReason : null
          })
        }
      });

      return user;
    });

    return res.status(200).json({
      success: true,
      message: action === 'APPROVE'
        ? `Đã phê duyệt tài khoản ${updatedUser.email} thành Người bán xác thực.`
        : `Đã từ chối hồ sơ KYC của tài khoản ${updatedUser.email}.`,
      data: {
        id: updatedUser.id,
        kycStatus: updatedUser.kycStatus,
        isVerifiedSeller: updatedUser.isVerifiedSeller,
        kycRejectionReason: updatedUser.kycRejectionReason
      }
    });
  } catch (error) {
    return next(error);
  }
};

// GET /api/users/:id - Fetch public profile of a user (seller) with reviews received
export const getPublicUserProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Tối ưu hóa database: Chỉ SELECT các thuộc tính công khai cần thiết, không SELECT thông tin nhạy cảm (như passwordHash, idCardNumber, v.v.)
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        reputationScore: true,
        isVerifiedSeller: true,
        createdAt: true,
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
      throw new ApiError(404, 'Không tìm thấy thông tin người dùng.');
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
    return next(error);
  }
};
