import prisma from '../models/db.js';
import { Prisma } from '@prisma/client';
import { releaseEscrow } from '../services/walletService.js';
import ApiError from '../utils/ApiError.js';
import { z } from 'zod';

// Định nghĩa các schema xác thực bằng Zod
const createDisputeSchema = z.object({
  productId: z.string().uuid({ message: "ID sản phẩm phải là định dạng UUID hợp lệ." }),
  reason: z.string().trim().min(5, { message: "Lý do khiếu nại phải có ít nhất 5 ký tự." }),
  description: z.string().trim().min(10, { message: "Mô tả chi tiết khiếu nại phải có ít nhất 10 ký tự." }),
  unboxingVideoUrl: z.string().url({ message: "Đường dẫn video unboxing không hợp lệ." }).optional().or(z.literal(''))
});

const resolveDisputeSchema = z.object({
  ticketId: z.string().uuid({ message: "ID khiếu nại không hợp lệ." }),
  status: z.enum(['RESOLVED_REFUND', 'RESOLVED_PAY'], { errorMap: () => ({ message: "Quyết định xử lý chỉ có thể là RESOLVED_REFUND hoặc RESOLVED_PAY." }) })
});

const createMessageSchema = z.object({
  message: z.string({ required_error: "Nội dung tin nhắn không được để trống." }).trim().min(1, { message: "Nội dung tin nhắn không được để trống." })
});

/**
 * Controller to create a new dispute ticket for an ended auction.
 * 
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const createDisputeTicket = async (req, res, next) => {
  const userId = req.session?.userId;
  if (!userId) {
    return next(new ApiError(401, "Bạn cần đăng nhập để thực hiện khiếu nại."));
  }

  try {
    // Xác thực đầu vào
    const validation = createDisputeSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ApiError(400, validation.error.errors[0].message);
    }
    const { productId, reason, description, unboxingVideoUrl } = validation.data;

    const result = await prisma.$transaction(async (tx) => {
      // Tối ưu hóa truy vấn: Chỉ SELECT các cột cần thiết trong raw query
      const products = await tx.$queryRaw`
        SELECT id, status FROM "products" WHERE id = ${productId} FOR UPDATE
      `;
      if (!products || products.length === 0) {
        throw new ApiError(404, "Sản phẩm không tồn tại.");
      }
      const product = products[0];

      if (!['PENDING_PAYMENT', 'PAID', 'SHIPPED', 'ENDED'].includes(product.status)) {
        throw new ApiError(400, "Sản phẩm chưa kết thúc đấu giá hoặc không ở trạng thái hợp lệ để khiếu nại.");
      }

      // Kiểm tra xem ai đã thắng phiên đấu giá (người đặt giá cao nhất)
      const highestBid = await tx.bid.findFirst({
        where: { productId: product.id },
        orderBy: { bidAmount: 'desc' }
      });

      if (!highestBid) {
        throw new ApiError(400, "Không thể khiếu nại sản phẩm không có lượt đặt giá thắng cuộc.");
      }

      if (highestBid.userId !== userId) {
        throw new ApiError(403, "Chỉ người mua trúng đấu giá mới có quyền khiếu nại sản phẩm này.");
      }

      // Khóa trạng thái sản phẩm bằng cách đặt trạng thái thành DISPUTED (đang tranh chấp)
      await tx.product.update({
        where: { id: productId },
        data: { status: 'DISPUTED' }
      });

      // Tạo phiếu khiếu nại
      const ticket = await tx.disputeTicket.create({
        data: {
          productId,
          openedById: userId,
          reason,
          description,
          unboxingVideoUrl: unboxingVideoUrl || null,
          status: 'PENDING'
        }
      });

      return ticket;
    });

    return res.status(201).json({
      success: true,
      message: "Tạo khiếu nại thành công. Sản phẩm đã chuyển sang trạng thái tranh chấp (DISPUTED).",
      data: result
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Controller for admin to resolve a dispute ticket.
 * 
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
/**
 * HÀM GIẢI QUYẾT KHIẾU NẠI CỦA ADMIN (adminResolveTicket)
 * - Nó là gì: Cho phép quản trị viên xem xét bằng chứng tranh chấp (ví dụ: video khui hàng) 
 *   và đưa ra phán quyết cuối cùng: Hoàn tiền cho Người mua hoặc Giải ngân cho Người bán.
 * - Để làm gì: Giải quyết triệt để các xung đột C2C khi giao dịch gặp sự cố (ví dụ hàng hỏng, hàng giả).
 * - Cơ chế hoạt động:
 *   + Nếu phán quyết là HOÀN TIỀN (RESOLVED_REFUND): Hệ thống giải phóng số tiền đang bị đóng băng 
 *     ở ví ký quỹ (Escrow) trả ngược lại số dư khả dụng (walletBalance) của Người mua.
 *   + Nếu phán quyết là GIẢI NGÂN CHO NGƯỜI BÁN (RESOLVED_PAY): Hệ thống trừ vĩnh viễn số tiền đóng băng 
 *     của Người mua và cộng trực tiếp vào ví khả dụng (walletBalance) của Người bán.
 */
export const adminResolveTicket = async (req, res, next) => {
  const adminId = req.session?.userId;
  if (!adminId) {
    return next(new ApiError(401, "Yêu cầu đăng nhập."));
  }

  try {
    // Xác thực đầu vào
    const validation = resolveDisputeSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ApiError(400, validation.error.errors[0].message);
    }
    const { ticketId, status } = validation.data;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Xác minh quyền admin bằng cách kiểm tra email trong DB
      const adminUser = await tx.user.findUnique({
        where: { id: adminId },
        select: { isAdmin: true }
      });
      if (!adminUser || !adminUser.isAdmin) {
        throw new ApiError(403, "Quyền truy cập bị từ chối: Chỉ tài khoản Admin mới được thực hiện phán quyết.");
      }

      // 2. Lấy thông tin khiếu nại và sản phẩm liên quan kèm khóa dòng (SELECT có chọn lọc để tối ưu hiệu năng)
      const ticket = await tx.disputeTicket.findUnique({
        where: { id: ticketId },
        select: {
          id: true,
          status: true,
          openedById: true,
          productId: true,
          product: {
            select: {
              id: true,
              status: true,
              sellerId: true,
              currentPrice: true,
              shippingFee: true,
              winnerName: true,
              winnerPhone: true,
              winnerAddress: true,
              provinceId: true,
              weight: true,
              length: true,
              width: true,
              height: true
            }
          }
        }
      });

      if (!ticket) {
        throw new ApiError(404, "Không tìm thấy đơn khiếu nại.");
      }

      if (ticket.status !== 'PENDING') {
        throw new ApiError(400, "Khiếu nại này đã được xử lý trước đó.");
      }

      const product = ticket.product;
      const buyerId = ticket.openedById;
      const sellerId = product.sellerId || "seller-id-placeholder";

      // 3. Tìm lượt đấu giá thắng để lấy thông tin đặt cọc
      const highestBid = await tx.bid.findFirst({
        where: { productId: product.id },
        orderBy: { bidAmount: 'desc' }
      });

      if (!highestBid) {
        throw new ApiError(400, "Sản phẩm khiếu nại không có lượt đặt giá thắng cuộc hợp lệ.");
      }

      const depositAmount = highestBid.isAutoBid && highestBid.maxAutoBidAmount
        ? new Prisma.Decimal(highestBid.maxAutoBidAmount).mul(0.1)
        : new Prisma.Decimal(highestBid.bidAmount).mul(0.1);

      // CƠ CHẾ KÝ QUỸ TRUNG GIAN (Escrow Wallet System):
      // - Nếu người mua đã thanh toán xong đơn hàng (thanh toán 90% còn lại + phí vận chuyển),
      //   toàn bộ số tiền (100% giá trị sản phẩm + phí vận chuyển) đang bị đóng băng ở frozenBalance của người mua.
      // - Nếu người mua chưa thanh toán nốt (chỉ mới đặt cọc 10% sau khi thắng đấu giá), 
      //   số tiền tranh chấp lúc này chỉ là 10% đặt cọc ban đầu.
      const hasCheckedOut = !!(product.winnerName && product.shippingFee);
      const escrowAmount = hasCheckedOut
        ? new Prisma.Decimal(product.currentPrice).plus(new Prisma.Decimal(product.shippingFee))
        : depositAmount;

      if (status === 'RESOLVED_REFUND') {
        // PHÁN QUYẾT 1: HOÀN TIỀN CHO NGƯỜI MUA (RESOLVED_REFUND)
        // - Ý nghĩa: Người mua thắng khiếu nại (ví dụ hàng vỡ hỏng, thiếu hàng).
        // - Hành động: Giải phóng tiền từ trạng thái đóng băng (frozenBalance) quay về ví khả dụng (walletBalance) của người mua.
        await releaseEscrow(tx, buyerId, escrowAmount, product.id);
      } else if (status === 'RESOLVED_PAY') {
        // PHÁN QUYẾT 2: GIẢI NGÂN CHO NGƯỜI BÁN (RESOLVED_PAY)
        // - Ý nghĩa: Người bán thắng khiếu nại (ví dụ người mua có ý gian lận, tráo hàng).
        // - Hành động: 
        //   1. Trừ tiền khỏi số dư bị đóng băng (frozenBalance) của người mua.
        //   2. Cộng tiền tương ứng vào số dư ví khả dụng (walletBalance) của người bán.
        const buyer = await tx.user.findUnique({
          where: { id: buyerId },
          select: { frozenBalance: true }
        });
        if (!buyer) {
          throw new ApiError(404, "Không tìm thấy thông tin người mua.");
        }

        const buyerFrozen = new Prisma.Decimal(buyer.frozenBalance);
        if (buyerFrozen.lt(escrowAmount)) {
          throw new ApiError(400, "Số dư đóng băng của người mua không đủ để thực hiện thanh toán.");
        }

        // Khấu trừ từ số dư bị đóng băng của người mua
        await tx.user.update({
          where: { id: buyerId },
          data: {
            frozenBalance: buyerFrozen.minus(escrowAmount)
          }
        });

        // Ghi nhật ký khấu trừ của người mua
        await tx.transaction.create({
          data: {
            userId: buyerId,
            amount: escrowAmount,
            type: "DISPUTE_PAY_BUYER_DEDUCT",
            status: "COMPLETED",
            productId: product.id
          }
        });

        // Đảm bảo tài khoản người bán tồn tại
        await tx.user.upsert({
          where: { id: sellerId },
          update: {},
          create: {
            id: sellerId,
            email: `seller_${sellerId.slice(0, 8)}@example.com`,
            passwordHash: "$2b$10$mockpasswordhashplaceholder",
            balance: new Prisma.Decimal(0),
            walletBalance: new Prisma.Decimal(0),
            frozenBalance: new Prisma.Decimal(0)
          }
        });

        // Lấy ví của người bán
        const seller = await tx.user.findUnique({
          where: { id: sellerId },
          select: { walletBalance: true }
        });
        const sellerWallet = new Prisma.Decimal(seller.walletBalance);

        // Cộng tiền vào số dư ví của người bán
        await tx.user.update({
          where: { id: sellerId },
          data: {
            walletBalance: sellerWallet.plus(escrowAmount)
          }
        });

        // Ghi nhật ký giao dịch cộng tiền cho người bán
        await tx.transaction.create({
          data: {
            userId: sellerId,
            amount: escrowAmount,
            type: "DISPUTE_PAY_SELLER_ADD",
            status: "COMPLETED",
            productId: product.id
          }
        });
      }

      // 4. Cập nhật trạng thái yêu cầu khiếu nại và sản phẩm
      const updatedTicket = await tx.disputeTicket.update({
        where: { id: ticketId },
        data: { status }
      });

      await tx.product.update({
        where: { id: product.id },
        data: { status: status === 'RESOLVED_REFUND' ? 'CANCELLED' : 'COMPLETED' }
      });

      return updatedTicket;
    });

    return res.status(200).json({
      success: true,
      message: `Xử lý khiếu nại thành công với phán quyết: ${status}.`,
      data: result
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Controller to fetch details of a dispute ticket.
 * 
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const getDisputeDetail = async (req, res, next) => {
  const userId = req.session?.userId;
  if (!userId) {
    return next(new ApiError(401, "Yêu cầu đăng nhập."));
  }

  const { ticketId } = req.params;

  try {
    const ticket = await prisma.disputeTicket.findUnique({
      where: { id: ticketId },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            sellerId: true,
            status: true
          }
        },
        openedBy: {
          select: {
            id: true,
            email: true,
            isAdmin: true
          }
        }
      }
    });

    if (!ticket) {
      throw new ApiError(404, "Không tìm thấy đơn khiếu nại.");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true }
    });

    const isAdmin = user && user.isAdmin;
    const isBuyer = ticket.openedById === userId;
    const isSeller = ticket.product.sellerId === userId;

    if (!isAdmin && !isBuyer && !isSeller) {
      throw new ApiError(403, "Quyền truy cập bị từ chối: Bạn không liên quan đến khiếu nại này.");
    }

    return res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Controller to fetch messages of a dispute ticket.
 * 
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const getDisputeMessages = async (req, res, next) => {
  const userId = req.session?.userId;
  if (!userId) {
    return next(new ApiError(401, "Yêu cầu đăng nhập."));
  }

  const { ticketId } = req.params;

  try {
    const ticket = await prisma.disputeTicket.findUnique({
      where: { id: ticketId },
      include: { product: true }
    });

    if (!ticket) {
      throw new ApiError(404, "Không tìm thấy đơn khiếu nại.");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true }
    });

    const isAdmin = user && user.isAdmin;
    const isBuyer = ticket.openedById === userId;
    const isSeller = ticket.product.sellerId === userId;

    if (!isAdmin && !isBuyer && !isSeller) {
      throw new ApiError(403, "Quyền truy cập bị từ chối: Bạn không liên quan đến khiếu nại này.");
    }

    const messages = await prisma.disputeMessage.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            isAdmin: true
          }
        }
      }
    });

    return res.status(200).json({
      success: true,
      data: messages
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Controller to post a message to a dispute ticket.
 * 
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const createDisputeMessage = async (req, res, next) => {
  const userId = req.session?.userId;
  if (!userId) {
    return next(new ApiError(401, "Yêu cầu đăng nhập."));
  }

  const { ticketId } = req.params;

  try {
    // Xác thực đầu vào
    const validation = createMessageSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ApiError(400, validation.error.errors[0].message);
    }
    const { message } = validation.data;

    const ticket = await prisma.disputeTicket.findUnique({
      where: { id: ticketId },
      include: { product: true }
    });

    if (!ticket) {
      throw new ApiError(404, "Không tìm thấy đơn khiếu nại.");
    }

    if (ticket.status !== 'PENDING') {
      throw new ApiError(400, "Khiếu nại đã được đóng. Bạn không thể gửi tin nhắn.");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true }
    });

    const isAdmin = user && user.isAdmin;
    const isBuyer = ticket.openedById === userId;
    const isSeller = ticket.product.sellerId === userId;

    if (!isAdmin && !isBuyer && !isSeller) {
      throw new ApiError(403, "Quyền truy cập bị từ chối: Bạn không liên quan đến khiếu nại này.");
    }

    const newMessage = await prisma.disputeMessage.create({
      data: {
        ticketId,
        senderId: userId,
        message
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            isAdmin: true
          }
        }
      }
    });

    return res.status(201).json({
      success: true,
      data: newMessage
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Controller to list dispute tickets.
 * 
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const getDisputesList = async (req, res, next) => {
  const userId = req.session?.userId;
  if (!userId) {
    return next(new ApiError(401, "Bạn cần đăng nhập để xem danh sách khiếu nại."));
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true }
    });

    const isAdmin = user && user.isAdmin;

    // Tối ưu hóa database: Bổ sung phân trang cho danh sách khiếu nại
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (!isAdmin) {
      where.OR = [
        { openedById: userId },
        { product: { sellerId: userId } }
      ];
    }

    const [tickets, total] = await Promise.all([
      prisma.disputeTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              title: true,
              sellerId: true,
              status: true
            }
          },
          openedBy: {
            select: {
              id: true,
              email: true,
              isAdmin: true
            }
          }
        },
        skip,
        take: limitNum
      }),
      prisma.disputeTicket.count({ where })
    ]);

    return res.status(200).json({
      success: true,
      data: tickets,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    return next(error);
  }
};
