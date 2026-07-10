import prisma from '../models/db.js';
import { Prisma } from '@prisma/client';
import { releaseEscrow } from '../services/walletService.js';
import { logger } from '../utils/logger.js';

// Helper: Kiểm tra quyền admin (email chứa 'admin')
async function checkAdmin(adminId) {
  const admin = await prisma.user.findUnique({ where: { id: adminId } });
  if (!admin || !admin.email.toLowerCase().includes('admin')) {
    throw new Error('FORBIDDEN');
  }
  return admin;
}

// ─────────────────────────────────────────────
// USER MANAGEMENT
// ─────────────────────────────────────────────

// GET /api/admin/users — Danh sách tất cả users
export const adminGetAllUsers = async (req, res) => {
  const adminId = req.session?.userId;
  if (!adminId) return res.status(401).json({ success: false, error: 'Yêu cầu đăng nhập.' });

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
    if (err.message === 'FORBIDDEN') return res.status(403).json({ success: false, error: 'Không có quyền truy cập.' });
    return res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/admin/users/:id/ban — Ban hoặc Unban tài khoản
export const adminBanUser = async (req, res) => {
  const adminId = req.session?.userId;
  if (!adminId) return res.status(401).json({ success: false, error: 'Yêu cầu đăng nhập.' });

  const { id: targetUserId } = req.params;
  const { action, reason } = req.body; // action: 'ban' | 'unban'

  if (!['ban', 'unban'].includes(action)) {
    return res.status(400).json({ success: false, error: 'action phải là ban hoặc unban.' });
  }
  if (action === 'ban' && !reason) {
    return res.status(400).json({ success: false, error: 'Phải cung cấp lý do khi ban tài khoản.' });
  }

  try {
    await checkAdmin(adminId);

    if (targetUserId === adminId) {
      return res.status(400).json({ success: false, error: 'Không thể tự ban tài khoản của mình.' });
    }

    const target = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) return res.status(404).json({ success: false, error: 'Không tìm thấy người dùng.' });

    const isBanning = action === 'ban';

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        isBanned: isBanning,
        banReason: isBanning ? reason : null,
        bannedAt: isBanning ? new Date() : null
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
    if (err.message === 'FORBIDDEN') return res.status(403).json({ success: false, error: 'Không có quyền truy cập.' });
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────
// AUCTION MANAGEMENT
// ─────────────────────────────────────────────

// GET /api/admin/auctions — Danh sách phiên đấu giá đang ACTIVE
export const adminGetActiveAuctions = async (req, res) => {
  const adminId = req.session?.userId;
  if (!adminId) return res.status(401).json({ success: false, error: 'Yêu cầu đăng nhập.' });

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
    if (err.message === 'FORBIDDEN') return res.status(403).json({ success: false, error: 'Không có quyền truy cập.' });
    return res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/admin/auctions/:id/cancel — Hủy phiên đấu giá + hoàn tiền
export const adminCancelAuction = async (req, res) => {
  const adminId = req.session?.userId;
  if (!adminId) return res.status(401).json({ success: false, error: 'Yêu cầu đăng nhập.' });

  const { id: productId } = req.params;
  const { reason } = req.body;

  if (!reason) return res.status(400).json({ success: false, error: 'Phải cung cấp lý do hủy phiên đấu giá.' });

  try {
    await checkAdmin(adminId);

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { bids: { orderBy: { bidAmount: 'desc' } } }
    });

    if (!product) return res.status(404).json({ success: false, error: 'Không tìm thấy sản phẩm.' });
    if (product.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, error: `Chỉ có thể hủy phiên đang ACTIVE. Trạng thái hiện tại: ${product.status}` });
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
    if (err.message === 'FORBIDDEN') return res.status(403).json({ success: false, error: 'Không có quyền truy cập.' });
    logger.error('Error cancelling auction', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────
// WALLET REQUEST MANAGEMENT
// ─────────────────────────────────────────────

// GET /api/admin/wallet-requests — Danh sách yêu cầu nạp/rút
export const adminGetWalletRequests = async (req, res) => {
  const adminId = req.session?.userId;
  if (!adminId) return res.status(401).json({ success: false, error: 'Yêu cầu đăng nhập.' });

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
    if (err.message === 'FORBIDDEN') return res.status(403).json({ success: false, error: 'Không có quyền truy cập.' });
    return res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/admin/wallet-requests/:id/confirm — Duyệt hoặc từ chối yêu cầu
export const adminConfirmWalletRequest = async (req, res) => {
  const adminId = req.session?.userId;
  if (!adminId) return res.status(401).json({ success: false, error: 'Yêu cầu đăng nhập.' });

  const { id: requestId } = req.params;
  const { action, adminNote } = req.body; // action: 'APPROVE' | 'REJECT'

  if (!['APPROVE', 'REJECT'].includes(action)) {
    return res.status(400).json({ success: false, error: 'action phải là APPROVE hoặc REJECT.' });
  }

  try {
    await checkAdmin(adminId);

    const walletReq = await prisma.walletRequest.findUnique({
      where: { id: requestId },
      include: { user: { select: { id: true, email: true, walletBalance: true } } }
    });

    if (!walletReq) return res.status(404).json({ success: false, error: 'Không tìm thấy yêu cầu.' });
    if (walletReq.status !== 'PENDING') {
      return res.status(400).json({ success: false, error: 'Yêu cầu này đã được xử lý.' });
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
    if (err.message === 'FORBIDDEN') return res.status(403).json({ success: false, error: 'Không có quyền truy cập.' });
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────
// PRODUCT APPROVAL
// ─────────────────────────────────────────────

// GET /api/admin/products — Sản phẩm chờ duyệt
export const adminGetPendingProducts = async (req, res) => {
  const adminId = req.session?.userId;
  if (!adminId) return res.status(401).json({ success: false, error: 'Yêu cầu đăng nhập.' });

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
    if (err.message === 'FORBIDDEN') return res.status(403).json({ success: false, error: 'Không có quyền truy cập.' });
    return res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/admin/products/:id/approve — Duyệt hoặc từ chối sản phẩm
export const adminApproveProduct = async (req, res) => {
  const adminId = req.session?.userId;
  if (!adminId) return res.status(401).json({ success: false, error: 'Yêu cầu đăng nhập.' });

  const { id: productId } = req.params;
  const { action, rejectionReason } = req.body; // action: 'APPROVE' | 'REJECT'

  if (!['APPROVE', 'REJECT'].includes(action)) {
    return res.status(400).json({ success: false, error: 'action phải là APPROVE hoặc REJECT.' });
  }
  if (action === 'REJECT' && !rejectionReason) {
    return res.status(400).json({ success: false, error: 'Phải cung cấp lý do từ chối.' });
  }

  try {
    await checkAdmin(adminId);

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { seller: { select: { id: true, email: true } } }
    });

    if (!product) return res.status(404).json({ success: false, error: 'Không tìm thấy sản phẩm.' });
    if (product.approvalStatus !== 'PENDING_REVIEW') {
      return res.status(400).json({ success: false, error: 'Sản phẩm này không ở trạng thái chờ duyệt.' });
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
    if (err.message === 'FORBIDDEN') return res.status(403).json({ success: false, error: 'Không có quyền truy cập.' });
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/admin/stats — Thống kê tổng quan
export const adminGetStats = async (req, res) => {
  const adminId = req.session?.userId;
  if (!adminId) return res.status(401).json({ success: false, error: 'Yêu cầu đăng nhập.' });

  try {
    await checkAdmin(adminId);

    const [
      totalUsers, bannedUsers, pendingKyc,
      activeAuctions, pendingProducts,
      pendingDeposits, pendingWithdraws
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isBanned: true } }),
      prisma.user.count({ where: { kycStatus: 'PENDING' } }),
      prisma.product.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      prisma.product.count({ where: { approvalStatus: 'PENDING_REVIEW', deletedAt: null } }),
      prisma.walletRequest.count({ where: { type: 'DEPOSIT', status: 'PENDING' } }),
      prisma.walletRequest.count({ where: { type: 'WITHDRAW', status: 'PENDING' } })
    ]);

    return res.json({
      success: true,
      data: {
        totalUsers, bannedUsers, pendingKyc,
        activeAuctions, pendingProducts,
        pendingDeposits, pendingWithdraws,
        totalPending: pendingDeposits + pendingWithdraws + pendingProducts + pendingKyc
      }
    });
  } catch (err) {
    if (err.message === 'FORBIDDEN') return res.status(403).json({ success: false, error: 'Không có quyền truy cập.' });
    return res.status(500).json({ success: false, error: err.message });
  }
};
