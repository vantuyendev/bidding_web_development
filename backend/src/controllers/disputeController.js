import prisma from '../models/db.js';
import { Prisma } from '@prisma/client';
import { releaseEscrow } from '../services/walletService.js';

/**
 * Controller to create a new dispute ticket for an ended auction.
 * 
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const createDisputeTicket = async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: "Bạn cần đăng nhập để thực hiện khiếu nại."
    });
  }

  const { productId, reason, description, unboxingVideoUrl } = req.body;

  if (!productId || !reason || !description) {
    return res.status(400).json({
      success: false,
      error: "Vui lòng điền đầy đủ các thông tin: productId, reason và description."
    });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Row-level lock to prevent concurrent modifications
      const products = await tx.$queryRaw`
        SELECT * FROM "products" WHERE id = ${productId} FOR UPDATE
      `;
      if (!products || products.length === 0) {
        throw new Error("Sản phẩm không tồn tại.");
      }
      const product = products[0];

      if (product.status !== 'ENDED') {
        throw new Error("Sản phẩm chưa kết thúc đấu giá hoặc đã bị khiếu nại/xử lý.");
      }

      // Check who won the auction (highest bidder)
      const highestBid = await tx.bid.findFirst({
        where: { productId: product.id },
        orderBy: { bidAmount: 'desc' }
      });

      if (!highestBid) {
        throw new Error("Không thể khiếu nại sản phẩm không có lượt đặt giá thắng cuộc.");
      }

      if (highestBid.userId !== userId) {
        throw new Error("Chỉ người mua trúng đấu giá mới có quyền khiếu nại sản phẩm này.");
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
    return res.status(400).json({
      success: false,
      error: error.message || "Đã xảy ra lỗi khi tạo khiếu nại."
    });
  }
};

/**
 * Controller for admin to resolve a dispute ticket.
 * 
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const adminResolveTicket = async (req, res) => {
  const adminId = req.session?.userId;
  if (!adminId) {
    return res.status(401).json({
      success: false,
      error: "Yêu cầu đăng nhập."
    });
  }

  const { ticketId, status } = req.body;

  if (!ticketId || !['RESOLVED_REFUND', 'RESOLVED_PAY'].includes(status)) {
    return res.status(400).json({
      success: false,
      error: "Vui lòng cung cấp ticketId và status phán quyết hợp lệ (RESOLVED_REFUND hoặc RESOLVED_PAY)."
    });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify admin privilege by checking email in DB
      const adminUser = await tx.user.findUnique({
        where: { id: adminId }
      });
      if (!adminUser || !adminUser.email.toLowerCase().includes("admin")) {
        throw new Error("Quyền truy cập bị từ chối: Chỉ tài khoản Admin mới được thực hiện phán quyết.");
      }

      // 2. Fetch ticket and related product with row-locking
      const ticket = await tx.disputeTicket.findUnique({
        where: { id: ticketId },
        include: { product: true }
      });

      if (!ticket) {
        throw new Error("Không tìm thấy đơn khiếu nại.");
      }

      if (ticket.status !== 'PENDING') {
        throw new Error("Khiếu nại này đã được xử lý trước đó.");
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
        throw new Error("Sản phẩm khiếu nại không có lượt đặt giá thắng cuộc hợp lệ.");
      }

      const depositAmount = highestBid.isAutoBid && highestBid.maxAutoBidAmount
        ? new Prisma.Decimal(highestBid.maxAutoBidAmount).mul(0.1)
        : new Prisma.Decimal(highestBid.bidAmount).mul(0.1);

      if (status === 'RESOLVED_REFUND') {
        // Refund Buyer: Release buyer's frozen deposit to buyer's wallet balance
        await releaseEscrow(tx, buyerId, depositAmount);
      } else if (status === 'RESOLVED_PAY') {
        // Pay Seller: Release deposit from buyer's frozen balance and transfer to seller
        const buyer = await tx.user.findUnique({
          where: { id: buyerId }
        });
        if (!buyer) {
          throw new Error("Không tìm thấy thông tin người mua.");
        }

        const buyerFrozen = new Prisma.Decimal(buyer.frozenBalance);
        if (buyerFrozen.lt(depositAmount)) {
          throw new Error("Số dư đóng băng của người mua không đủ để thực hiện thanh toán.");
        }

        // Deduct from buyer's frozen balance
        await tx.user.update({
          where: { id: buyerId },
          data: {
            frozenBalance: buyerFrozen.minus(depositAmount)
          }
        });

        // Log buyer deduction
        await tx.transaction.create({
          data: {
            userId: buyerId,
            amount: depositAmount,
            type: "DISPUTE_PAY_BUYER_DEDUCT",
            status: "COMPLETED"
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
          where: { id: sellerId }
        });
        const sellerWallet = new Prisma.Decimal(seller.walletBalance);

        // Credit to seller's wallet balance
        await tx.user.update({
          where: { id: sellerId },
          data: {
            walletBalance: sellerWallet.plus(depositAmount)
          }
        });

        // Log seller credit transaction
        await tx.transaction.create({
          data: {
            userId: sellerId,
            amount: depositAmount,
            type: "DISPUTE_PAY_SELLER_ADD",
            status: "COMPLETED"
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
        data: { status: 'RESOLVED' }
      });

      return updatedTicket;
    });

    return res.status(200).json({
      success: true,
      message: `Xử lý khiếu nại thành công với phán quyết: ${status}.`,
      data: result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message || "Đã xảy ra lỗi khi xử lý khiếu nại."
    });
  }
};

/**
 * Controller to fetch details of a dispute ticket.
 * 
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const getDisputeDetail = async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: "Yêu cầu đăng nhập."
    });
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
            email: true
          }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: "Không tìm thấy đơn khiếu nại."
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    const isAdmin = user && user.email.toLowerCase().includes("admin");
    const isBuyer = ticket.openedById === userId;
    const isSeller = ticket.product.sellerId === userId;

    if (!isAdmin && !isBuyer && !isSeller) {
      return res.status(403).json({
        success: false,
        error: "Quyền truy cập bị từ chối: Bạn không liên quan đến khiếu nại này."
      });
    }

    return res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "Đã xảy ra lỗi khi lấy thông tin khiếu nại."
    });
  }
};

/**
 * Controller to fetch messages of a dispute ticket.
 * 
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const getDisputeMessages = async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: "Yêu cầu đăng nhập."
    });
  }

  const { ticketId } = req.params;

  try {
    const ticket = await prisma.disputeTicket.findUnique({
      where: { id: ticketId },
      include: { product: true }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: "Không tìm thấy đơn khiếu nại."
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    const isAdmin = user && user.email.toLowerCase().includes("admin");
    const isBuyer = ticket.openedById === userId;
    const isSeller = ticket.product.sellerId === userId;

    if (!isAdmin && !isBuyer && !isSeller) {
      return res.status(403).json({
        success: false,
        error: "Quyền truy cập bị từ chối: Bạn không liên quan đến khiếu nại này."
      });
    }

    const messages = await prisma.disputeMessage.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });

    return res.status(200).json({
      success: true,
      data: messages
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "Đã xảy ra lỗi khi lấy danh sách tin nhắn."
    });
  }
};

/**
 * Controller to post a message to a dispute ticket.
 * 
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const createDisputeMessage = async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: "Yêu cầu đăng nhập."
    });
  }

  const { ticketId } = req.params;
  const { message } = req.body;

  if (!message || message.trim() === "") {
    return res.status(400).json({
      success: false,
      error: "Nội dung tin nhắn không được để trống."
    });
  }

  try {
    const ticket = await prisma.disputeTicket.findUnique({
      where: { id: ticketId },
      include: { product: true }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: "Không tìm thấy đơn khiếu nại."
      });
    }

    if (ticket.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: "Khiếu nại đã được đóng. Bạn không thể gửi tin nhắn."
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    const isAdmin = user && user.email.toLowerCase().includes("admin");
    const isBuyer = ticket.openedById === userId;
    const isSeller = ticket.product.sellerId === userId;

    if (!isAdmin && !isBuyer && !isSeller) {
      return res.status(403).json({
        success: false,
        error: "Quyền truy cập bị từ chối: Bạn không liên quan đến khiếu nại này."
      });
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
            email: true
          }
        }
      }
    });

    return res.status(201).json({
      success: true,
      data: newMessage
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "Đã xảy ra lỗi khi gửi tin nhắn."
    });
  }
};

/**
 * Controller to list dispute tickets.
 * 
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const getDisputesList = async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: "Bạn cần đăng nhập để xem danh sách khiếu nại."
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    const isAdmin = user && user.email.toLowerCase().includes("admin");

    let tickets;
    if (isAdmin) {
      tickets = await prisma.disputeTicket.findMany({
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
              email: true
            }
          }
        }
      });
    } else {
      tickets = await prisma.disputeTicket.findMany({
        where: {
          OR: [
            { openedById: userId },
            { product: { sellerId: userId } }
          ]
        },
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
              email: true
            }
          }
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: tickets
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "Đã xảy ra lỗi khi tải danh sách khiếu nại."
    });
  }
};

