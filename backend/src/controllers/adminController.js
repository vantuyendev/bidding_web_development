import prisma from '../models/db.js';
import { Prisma } from '@prisma/client';
import { releaseEscrow } from '../services/walletService.js';
import { logger } from '../utils/logger.js';
import ApiError from '../utils/ApiError.js';
import { z } from 'zod';

// Định nghĩa các schema xác thực bằng Zod
const banUserSchema = z.object({
  action: z.enum(['ban', 'unban'], { errorMap: () => ({ message: "Hành động chỉ có thể là ban hoặc unban." }) }),
  reason: z.string().trim().optional()
}).refine(data => data.action !== 'ban' || (data.reason && data.reason.trim().length > 0), {
  message: "Phải cung cấp lý do khi khóa tài khoản.",
  path: ["reason"]
});

const cancelAuctionSchema = z.object({
  reason: z.string().trim().min(5, { message: "Lý do hủy phiên đấu giá phải có ít nhất 5 ký tự." })
});

const confirmWalletRequestSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT'], { errorMap: () => ({ message: "Hành động chỉ có thể là APPROVE hoặc REJECT." }) }),
  adminNote: z.string().trim().optional()
});

const approveProductSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT'], { errorMap: () => ({ message: "Hành động chỉ có thể là APPROVE hoặc REJECT." }) }),
  rejectionReason: z.string().trim().optional()
}).refine(data => data.action !== 'REJECT' || (data.rejectionReason && data.rejectionReason.trim().length > 0), {
  message: "Phải cung cấp lý do từ chối duyệt sản phẩm.",
  path: ["rejectionReason"]
});

// Helper: Kiểm tra quyền admin (sử dụng thuộc tính isAdmin trong DB)
async function checkAdmin(adminId) {
  const admin = await prisma.user.findUnique({
    where: { id: adminId },
    select: { id: true, isAdmin: true }
  });
  if (!admin || !admin.isAdmin) {
    throw new ApiError(403, 'Không có quyền truy cập.');
  }
  return admin;
}

// ─────────────────────────────────────────────
// USER MANAGEMENT
// ─────────────────────────────────────────────

// GET /api/admin/users — Danh sách tất cả users
export const adminGetAllUsers = async (req, res, next) => {
  const adminId = req.session?.userId;
  if (!adminId) return next(new ApiError(401, 'Yêu cầu đăng nhập.'));

  try {
    await checkAdmin(adminId);

    const { page = 1, limit = 20, search = '', status = '' } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (status === 'banned') where.isBanned = true;
    if (status === 'seller') where.isVerifiedSeller = true;
    if (status === 'kyc_pending') where.kycStatus = 'PENDING';

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, email: true, name: true,
          isBanned: true, banReason: true, bannedAt: true,
          isVerifiedSeller: true, kycStatus: true,
          walletBalance: true, frozenBalance: true,
          createdAt: true,
          _count: { select: { soldProducts: true, bids: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.user.count({ where })
    ]);

    return res.json({
      success: true,
      data: users.map(u => ({
        ...u,
        walletBalance: Number(u.walletBalance),
        frozenBalance: Number(u.frozenBalance)
      })),
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (err) {
    return next(err);
  }
};

// POST /api/admin/users/:id/ban — Ban hoặc Unban tài khoản
export const adminBanUser = async (req, res, next) => {
  const adminId = req.session?.userId;
  if (!adminId) return next(new ApiError(401, 'Yêu cầu đăng nhập.'));

  const { id: targetUserId } = req.params;

  try {
    await checkAdmin(adminId);

    if (targetUserId === adminId) {
      throw new ApiError(400, 'Không thể tự ban tài khoản của mình.');
    }

    // Xác thực đầu vào
    const validation = banUserSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ApiError(400, validation.error.errors[0].message);
    }
    const { action, reason } = validation.data;

    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true }
    });
    if (!target) throw new ApiError(404, 'Không tìm thấy người dùng.');

    const isBanning = action === 'ban';

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        isBanned: isBanning,
        banReason: isBanning ? reason : null,
        bannedAt: isBanning ? new Date() : null
      },
      select: {
        id: true,
        isBanned: true
      }
    });

    // Ghi audit log
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: isBanning ? 'ADMIN_BAN_USER' : 'ADMIN_UNBAN_USER',
        target: targetUserId,
        details: JSON.stringify({ reason, email: target.email })
      }
    });

    // Gửi notification cho user
    await prisma.notification.create({
      data: {
        userId: targetUserId,
        title: isBanning ? 'Tài khoản của bạn đã bị khóa' : 'Tài khoản của bạn đã được mở khóa',
        message: isBanning
          ? `Tài khoản của bạn đã bị khóa vì lý do: ${reason}. Vui lòng liên hệ Admin để biết thêm chi tiết.`
          : 'Tài khoản của bạn đã được mở khóa bởi Admin. Bạn có thể tiếp tục sử dụng dịch vụ.',
        type: 'SYSTEM'
      }
    });

    return res.json({
      success: true,
      message: isBanning ? `Đã khóa tài khoản ${target.email}.` : `Đã mở khóa tài khoản ${target.email}.`,
      data: { id: updated.id, isBanned: updated.isBanned }
    });
  } catch (err) {
    return next(err);
  }
};

// ─────────────────────────────────────────────
// AUCTION MANAGEMENT
// ─────────────────────────────────────────────

// GET /api/admin/auctions — Danh sách phiên đấu giá đang ACTIVE
export const adminGetActiveAuctions = async (req, res, next) => {
  const adminId = req.session?.userId;
  if (!adminId) return next(new ApiError(401, 'Yêu cầu đăng nhập.'));

  try {
    await checkAdmin(adminId);

    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);

    const [auctions, total] = await Promise.all([
      prisma.product.findMany({
        where: { status: 'ACTIVE', deletedAt: null },
        include: {
          seller: { select: { id: true, email: true, name: true } },
          _count: { select: { bids: true } }
        },
        orderBy: { startTime: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum
      }),
      prisma.product.count({ where: { status: 'ACTIVE', deletedAt: null } })
    ]);

    return res.json({
      success: true,
      data: auctions.map(a => ({
        ...a,
        startPrice: Number(a.startPrice),
        currentPrice: Number(a.currentPrice),
        buyNowPrice: a.buyNowPrice ? Number(a.buyNowPrice) : null,
        bidCount: a._count.bids
      })),
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (err) {
    return next(err);
  }
};

// POST /api/admin/auctions/:id/cancel — Hủy phiên đấu giá + hoàn tiền
export const adminCancelAuction = async (req, res, next) => {
  const adminId = req.session?.userId;
  if (!adminId) return next(new ApiError(401, 'Yêu cầu đăng nhập.'));

  const { id: productId } = req.params;

  try {
    await checkAdmin(adminId);

    // Xác thực đầu vào
    const validation = cancelAuctionSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ApiError(400, validation.error.errors[0].message);
    }
    const { reason } = validation.data;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { bids: { orderBy: { bidAmount: 'desc' } } }
    });

    if (!product) throw new ApiError(404, 'Không tìm thấy sản phẩm.');
    if (product.status !== 'ACTIVE') {
      throw new ApiError(400, `Chỉ có thể hủy phiên đang ACTIVE. Trạng thái hiện tại: ${product.status}`);
    }

    const refundedUsers = new Set();

    await prisma.$transaction(async (tx) => {
      // Hoàn tiền cọc cho TẤT CẢ bidders (theo bidder cao nhất của mỗi user)
      const bidsByUser = {};
      for (const bid of product.bids) {
        if (!bidsByUser[bid.userId]) {
          bidsByUser[bid.userId] = bid; // lấy bid cao nhất (đã sort desc)
        }
      }

      for (const [bidderId, bid] of Object.entries(bidsByUser)) {
        const depositAmount = bid.isAutoBid && bid.maxAutoBidAmount
          ? new Prisma.Decimal(bid.maxAutoBidAmount).mul(0.1)
          : new Prisma.Decimal(bid.bidAmount).mul(0.1);

        // Kiểm tra frozen balance trước khi release
        const userBalance = await tx.user.findUnique({
          where: { id: bidderId },
          select: { frozenBalance: true }
        });

        if (userBalance && new Prisma.Decimal(userBalance.frozenBalance).gte(depositAmount)) {
          await releaseEscrow(tx, bidderId, depositAmount, productId);
          refundedUsers.add(bidderId);

          // Notification hoàn tiền cho bidder
          await tx.notification.create({
            data: {
              userId: bidderId,
              title: 'Phiên đấu giá bị hủy – Đã hoàn tiền cọc',
              message: `Phiên đấu giá "${product.title}" đã bị Admin hủy (${reason}). Tiền cọc đã được hoàn trả vào ví của bạn.`,
              type: 'AUCTION_CANCELLED'
            }
          });
        }
      }

      // Cập nhật trạng thái sản phẩm
      await tx.product.update({
        where: { id: productId },
        data: { status: 'CANCELLED', deletedAt: new Date() }
      });

      // Notification cho seller
      await tx.notification.create({
        data: {
          userId: product.sellerId,
          title: 'Phiên đấu giá của bạn đã bị Admin hủy',
          message: `Phiên đấu giá "${product.title}" đã bị hủy bởi Admin với lý do: ${reason}. Tiền cọc đã được hoàn trả cho tất cả người tham gia.`,
          type: 'AUCTION_CANCELLED'
        }
      });

      // Ghi audit log
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'ADMIN_CANCEL_AUCTION',
          target: productId,
          details: JSON.stringify({ reason, refundedCount: refundedUsers.size, productTitle: product.title })
        }
      });
    });

    logger.info('Admin cancelled auction', { adminId, productId, refundedCount: refundedUsers.size });

    return res.json({
      success: true,
      message: `Đã hủy phiên đấu giá "${product.title}" và hoàn tiền cho ${refundedUsers.size} người tham gia.`,
      data: { productId, refundedCount: refundedUsers.size }
    });
  } catch (err) {
    return next(err);
  }
};

// ─────────────────────────────────────────────
// WALLET REQUEST MANAGEMENT
// ─────────────────────────────────────────────

// GET /api/admin/wallet-requests — Danh sách yêu cầu nạp/rút
export const adminGetWalletRequests = async (req, res, next) => {
  const adminId = req.session?.userId;
  if (!adminId) return next(new ApiError(401, 'Yêu cầu đăng nhập.'));

  try {
    await checkAdmin(adminId);

    const { type, status = 'PENDING', page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);

    const where = {};
    if (type && ['DEPOSIT', 'WITHDRAW'].includes(type)) where.type = type;
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) where.status = status;

    const [requests, total] = await Promise.all([
      prisma.walletRequest.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, name: true } },
          resolvedBy: { select: { id: true, email: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum
      }),
      prisma.walletRequest.count({ where })
    ]);

    return res.json({
      success: true,
      data: requests.map(r => ({ ...r, amount: Number(r.amount) })),
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (err) {
    return next(err);
  }
};

// POST /api/admin/wallet-requests/:id/confirm — Duyệt hoặc từ chối yêu cầu
export const adminConfirmWalletRequest = async (req, res, next) => {
  const adminId = req.session?.userId;
  if (!adminId) return next(new ApiError(401, 'Yêu cầu đăng nhập.'));

  const { id: requestId } = req.params;

  try {
    await checkAdmin(adminId);

    // Xác thực đầu vào
    const validation = confirmWalletRequestSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ApiError(400, validation.error.errors[0].message);
    }
    const { action, adminNote } = validation.data;

    const walletReq = await prisma.walletRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        userId: true,
        type: true,
        amount: true,
        status: true
      }
    });

    if (!walletReq) throw new ApiError(404, 'Không tìm thấy yêu cầu.');
    if (walletReq.status !== 'PENDING') {
      throw new ApiError(400, 'Yêu cầu này đã được xử lý.');
    }

    const isApproved = action === 'APPROVE';
    const amount = new Prisma.Decimal(walletReq.amount);

    await prisma.$transaction(async (tx) => {
      if (isApproved) {
        if (walletReq.type === 'DEPOSIT') {
          // Cộng tiền vào ví
          await tx.user.update({
            where: { id: walletReq.userId },
            data: { walletBalance: { increment: amount } }
          });
          await tx.transaction.create({
            data: {
              userId: walletReq.userId,
              amount,
              type: 'DEPOSIT',
              status: 'COMPLETED'
            }
          });
        } else {
          // WITHDRAW: trừ tiền từ ví
          const user = await tx.user.findUnique({
            where: { id: walletReq.userId },
            select: { walletBalance: true }
          });
          const walletBal = new Prisma.Decimal(user.walletBalance);
          if (walletBal.lt(amount)) {
            throw new Error('Số dư ví người dùng không đủ để thực hiện rút tiền.');
          }
          await tx.user.update({
            where: { id: walletReq.userId },
            data: { walletBalance: walletBal.minus(amount) }
          });
          await tx.transaction.create({
            data: {
              userId: walletReq.userId,
              amount,
              type: 'WITHDRAW',
              status: 'COMPLETED'
            }
          });
        }
      }

      // Cập nhật trạng thái yêu cầu
      await tx.walletRequest.update({
        where: { id: requestId },
        data: {
          status: isApproved ? 'APPROVED' : 'REJECTED',
          adminNote: adminNote || null,
          resolvedAt: new Date(),
          resolvedById: adminId
        }
      });

      // Gửi notification cho user
      const notifType = isApproved ? 'WALLET_REQUEST_APPROVED' : 'WALLET_REQUEST_REJECTED';
      const actionLabel = walletReq.type === 'DEPOSIT' ? 'nạp tiền' : 'rút tiền';
      await tx.notification.create({
        data: {
          userId: walletReq.userId,
          title: isApproved
            ? `Yêu cầu ${actionLabel} đã được duyệt`
            : `Yêu cầu ${actionLabel} bị từ chối`,
          message: isApproved
            ? `Yêu cầu ${actionLabel} ${Number(amount).toLocaleString('vi-VN')} đ của bạn đã được Admin xác nhận.`
            : `Yêu cầu ${actionLabel} ${Number(amount).toLocaleString('vi-VN')} đ của bạn bị từ chối${adminNote ? ': ' + adminNote : '.'}`,
          type: notifType
        }
      });
    });

    return res.json({
      success: true,
      message: isApproved ? 'Đã duyệt yêu cầu thành công.' : 'Đã từ chối yêu cầu.',
    });
  } catch (err) {
    return next(err);
  }
};

// ─────────────────────────────────────────────
// PRODUCT APPROVAL
// ─────────────────────────────────────────────

// GET /api/admin/products — Sản phẩm chờ duyệt
export const adminGetPendingProducts = async (req, res, next) => {
  const adminId = req.session?.userId;
  if (!adminId) return next(new ApiError(401, 'Yêu cầu đăng nhập.'));

  try {
    await checkAdmin(adminId);

    const { approvalStatus = 'PENDING_REVIEW', page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);

    const where = { deletedAt: null };
    if (['PENDING_REVIEW', 'APPROVED', 'REJECTED'].includes(approvalStatus)) {
      where.approvalStatus = approvalStatus;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          seller: { select: { id: true, email: true, name: true } },
          category: { select: { id: true, name: true } },
          _count: { select: { bids: true } }
        },
        orderBy: { startTime: 'desc' },
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
        bidCount: p._count.bids
      })),
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (err) {
    return next(err);
  }
};

// POST /api/admin/products/:id/approve — Duyệt hoặc từ chối sản phẩm
export const adminApproveProduct = async (req, res, next) => {
  const adminId = req.session?.userId;
  if (!adminId) return next(new ApiError(401, 'Yêu cầu đăng nhập.'));

  const { id: productId } = req.params;

  try {
    await checkAdmin(adminId);

    // Xác thực đầu vào
    const validation = approveProductSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ApiError(400, validation.error.errors[0].message);
    }
    const { action, rejectionReason } = validation.data;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        title: true,
        sellerId: true,
        approvalStatus: true,
        startTime: true
      }
    });

    if (!product) throw new ApiError(404, 'Không tìm thấy sản phẩm.');
    if (product.approvalStatus !== 'PENDING_REVIEW') {
      throw new ApiError(400, 'Sản phẩm này không ở trạng thái chờ duyệt.');
    }

    const isApproved = action === 'APPROVE';
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      if (isApproved) {
        // Kiểm tra startTime: nếu startTime trong tương lai thì giữ DRAFT (sẽ auto-activate),
        // nếu startTime <= now thì set ACTIVE ngay
        const shouldActivateNow = !product.startTime || new Date(product.startTime) <= now;
        await tx.product.update({
          where: { id: productId },
          data: {
            approvalStatus: 'APPROVED',
            rejectionReason: null,
            rejectedAt: null,
            status: shouldActivateNow ? 'ACTIVE' : 'DRAFT'
          }
        });

        await tx.notification.create({
          data: {
            userId: product.sellerId,
            title: 'Sản phẩm đấu giá đã được duyệt',
            message: shouldActivateNow
              ? `Sản phẩm "${product.title}" của bạn đã được Admin phê duyệt và đang hiển thị công khai.`
              : `Sản phẩm "${product.title}" của bạn đã được Admin phê duyệt. Phiên đấu giá sẽ bắt đầu vào ${new Date(product.startTime).toLocaleString('vi-VN')}.`,
            type: 'PRODUCT_APPROVED'
          }
        });
      } else {
        // Từ chối: seller có 6h để sửa
        await tx.product.update({
          where: { id: productId },
          data: {
            approvalStatus: 'REJECTED',
            rejectionReason,
            rejectedAt: now
          }
        });

        await tx.notification.create({
          data: {
            userId: product.sellerId,
            title: 'Sản phẩm đấu giá bị từ chối',
            message: `Sản phẩm "${product.title}" bị từ chối vì: ${rejectionReason}. Bạn có thể chỉnh sửa và gửi lại trong vòng 6 giờ. Sau đó sản phẩm sẽ bị xóa tự động.`,
            type: 'PRODUCT_REJECTED'
          }
        });
      }

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: isApproved ? 'ADMIN_APPROVE_PRODUCT' : 'ADMIN_REJECT_PRODUCT',
          target: productId,
          details: JSON.stringify({ productTitle: product.title, rejectionReason: rejectionReason || null })
        }
      });
    });

    return res.json({
      success: true,
      message: isApproved
        ? `Đã phê duyệt sản phẩm "${product.title}".`
        : `Đã từ chối sản phẩm "${product.title}". Seller sẽ được thông báo.`
    });
  } catch (err) {
    return next(err);
  }
};

// GET /api/admin/stats — Thống kê tổng quan
export const adminGetStats = async (req, res, next) => {
  const adminId = req.session?.userId;
  if (!adminId) return next(new ApiError(401, 'Yêu cầu đăng nhập.'));

  try {
    await checkAdmin(adminId);

    const [
      totalUsers, bannedUsers, pendingKyc,
      activeAuctions, pendingProducts,
      pendingDeposits, pendingWithdraws,
      depositSumResult, withdrawSumResult,
      activeBids, recentLogs
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isBanned: true } }),
      prisma.user.count({ where: { kycStatus: 'PENDING' } }),
      prisma.product.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      prisma.product.count({ where: { approvalStatus: 'PENDING_REVIEW', deletedAt: null } }),
      prisma.walletRequest.count({ where: { type: 'DEPOSIT', status: 'PENDING' } }),
      prisma.walletRequest.count({ where: { type: 'WITHDRAW', status: 'PENDING' } }),
      prisma.walletRequest.aggregate({
        where: { type: 'DEPOSIT', status: 'APPROVED' },
        _sum: { amount: true }
      }),
      prisma.walletRequest.aggregate({
        where: { type: 'WITHDRAW', status: 'APPROVED' },
        _sum: { amount: true }
      }),
      prisma.bid.count({
        where: { product: { status: 'ACTIVE', deletedAt: null } }
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { user: { select: { email: true } } }
      })
    ]);

    const totalDepositsApproved = Number(depositSumResult._sum.amount || 0);
    const totalWithdrawsApproved = Number(withdrawSumResult._sum.amount || 0);

    return res.json({
      success: true,
      data: {
        totalUsers, bannedUsers, pendingKyc,
        activeAuctions, pendingProducts,
        pendingDeposits, pendingWithdraws,
        totalPending: pendingDeposits + pendingWithdraws + pendingProducts + pendingKyc,
        totalDepositsApproved,
        totalWithdrawsApproved,
        activeBids,
        recentLogs
      }
    });
  } catch (err) {
    return next(err);
  }
};

// GET /api/admin/audit-logs — Danh sách nhật ký hệ thống
export const adminGetAuditLogs = async (req, res, next) => {
  const adminId = req.session?.userId;
  if (!adminId) return next(new ApiError(401, 'Yêu cầu đăng nhập.'));

  try {
    await checkAdmin(adminId);

    const { page = 1, limit = 20, search = '' } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { target: { contains: search, mode: 'insensitive' } },
        { details: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, name: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.auditLog.count({ where })
    ]);

    return res.json({
      success: true,
      data: logs,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (err) {
    return next(err);
  }
};
