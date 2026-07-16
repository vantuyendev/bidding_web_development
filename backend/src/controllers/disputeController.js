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

      // Check who won the auction (highest bidder)
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

      // Lock product state by setting status to DISPUTED
      await tx.product.update({
        where: { id: productId },
        data: { status: 'DISPUTED' }
      });

      // Create dispute ticket
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
      // 1. Verify admin privilege by checking email in DB
      const adminUser = await tx.user.findUnique({
        where: { id: adminId },
        select: { isAdmin: true }
      });
      if (!adminUser || !adminUser.isAdmin) {
        throw new ApiError(403, "Quyền truy cập bị từ chối: Chỉ tài khoản Admin mới được thực hiện phán quyết.");
      }

      // 2. Fetch ticket and related product with row-locking (selective SELECT to optimize performance)
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

      // 3. Find the winning bid to retrieve deposit details
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

      // Check if winner has checked out (paid remaining 90% and shipping fee)
      const hasCheckedOut = !!(product.winnerName && product.shippingFee);
      const escrowAmount = hasCheckedOut
        ? new Prisma.Decimal(product.currentPrice).plus(new Prisma.Decimal(product.shippingFee))
        : depositAmount;

      if (status === 'RESOLVED_REFUND') {
        // Refund Buyer: Release buyer's frozen escrow/deposit to wallet
        await releaseEscrow(tx, buyerId, escrowAmount, product.id);
      } else if (status === 'RESOLVED_PAY') {
        // Pay Seller: Deduct escrow from buyer's frozen balance and transfer to seller
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

        // Deduct from buyer's frozen balance
        await tx.user.update({
          where: { id: buyerId },
          data: {
            frozenBalance: buyerFrozen.minus(escrowAmount)
          }
        });

        // Log buyer deduction
        await tx.transaction.create({
          data: {
            userId: buyerId,
            amount: escrowAmount,
            type: "DISPUTE_PAY_BUYER_DEDUCT",
            status: "COMPLETED",
            productId: product.id
          }
        });

        // Ensure seller account exists
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

        // Fetch seller wallet
        const seller = await tx.user.findUnique({
          where: { id: sellerId },
          select: { walletBalance: true }
        });
        const sellerWallet = new Prisma.Decimal(seller.walletBalance);

        // Credit to seller's wallet balance
        await tx.user.update({
          where: { id: sellerId },
          data: {
            walletBalance: sellerWallet.plus(escrowAmount)
          }
        });

        // Log seller credit transaction
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

      // 4. Update dispute ticket and product states
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
