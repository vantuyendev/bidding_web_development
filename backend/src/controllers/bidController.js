import prisma from '../models/db.js';
import { Prisma } from '@prisma/client';
import { triggerProductUpdate } from './streamController.js';
import { z } from 'zod';
import { holdEscrow, releaseEscrow } from '../services/walletService.js';
import { triggerNotificationSend } from '../utils/notificationEmitter.js';
import ApiError from '../utils/ApiError.js';

/**
 * Tính Bước giá Biến thiên tự động theo currentPrice
 * @param {number|Prisma.Decimal|string} currentPrice
 * @returns {Prisma.Decimal}
 */
export function calculateStepPrice(currentPrice) {
  const price = new Prisma.Decimal(currentPrice);
  if (price.lt(1000000)) {
    return new Prisma.Decimal(10000);
  } else if (price.lt(5000000)) {
    return new Prisma.Decimal(50000);
  } else {
    return new Prisma.Decimal(100000);
  }
}

// Định nghĩa Schema kiểm duyệt dữ liệu nghiêm ngặt cho Bid Placement (Manual & Proxy)
const bidSchema = z.object({
  productId: z.string().uuid({ message: "ID sản phẩm phải là định dạng UUID hợp lệ." }),
  bidAmount: z.number({ invalid_type_error: "Số tiền đặt giá phải là một con số." })
    .gt(0, { message: "Giá đặt phải lớn hơn 0." })
    .max(100000000000, { message: "Giá đặt không được vượt quá 100 tỷ đồng để tránh tràn bộ nhớ." })
    .optional(),
  maxAutoBidAmount: z.number({ invalid_type_error: "Số tiền đặt tối đa tự động phải là một con số." })
    .gt(0, { message: "Mức giá tối đa tự động phải lớn hơn 0." })
    .max(100000000000, { message: "Mức giá tối đa tự động không được vượt quá 100 tỷ đồng để tránh tràn bộ nhớ." })
    .optional()
}).refine(data => data.bidAmount !== undefined || data.maxAutoBidAmount !== undefined, {
  message: "Bạn phải cung cấp ít nhất giá đặt (bidAmount) hoặc giá tối đa tự động (maxAutoBidAmount).",
  path: ["bidAmount"]
});

export const placeBid = async (req, res, next) => {
  const userId = req.session?.userId;

  if (!userId) {
    return next(new ApiError(401, 'Bạn cần đăng nhập để đặt giá'));
  }

  try {
    // Validate request body using Zod (safeParse will throw a validation error if failed, or we can SafeParse and throw ApiError)
    const validation = bidSchema.safeParse(req.body);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => err.message).join(' ');
      throw new ApiError(400, errors);
    }

    const { productId, bidAmount, maxAutoBidAmount } = validation.data;

    // Convert inputs to Decimal objects if present
    const bidDecimal = bidAmount !== undefined && bidAmount !== null ? new Prisma.Decimal(bidAmount) : null;
    const maxAutoBidDecimal = maxAutoBidAmount !== undefined && maxAutoBidAmount !== null ? new Prisma.Decimal(maxAutoBidAmount) : null;

    // Trích xuất thông tin IP và User Agent để lưu nhật ký kiểm toán (Audit Logs)
    const ipAddress = req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;

    // High-security Database Transaction
    const result = await prisma.$transaction(async (tx) => {
      // Ensure mock user exists in DB
      await tx.user.upsert({
        where: { id: userId },
        update: {},
        create: {
          id: userId,
          email: `mock_user_${userId.slice(0, 8)}@example.com`,
          passwordHash: "$2b$10$mockpasswordhashplaceholder",
          balance: new Prisma.Decimal(0.00),
          walletBalance: new Prisma.Decimal(0.00),
        },
      });

      // Row-level Locking: Lock product row - Tối ưu hóa selective SELECT
      const products = await tx.$queryRaw`
        SELECT id, title, status, current_price, end_time, seller_id FROM "products" WHERE id = ${productId} FOR UPDATE
      `;

      if (!products || products.length === 0) {
        throw new ApiError(404, "Sản phẩm không tồn tại");
      }

      const product = products[0];
      const now = new Date();
      const endTime = new Date(product.end_time);

      // Check if auction has ended
      if (now > endTime || product.status === 'ENDED' || product.status === 'PENDING_PAYMENT' || product.status === 'PAID') {
        throw new ApiError(400, "Buổi đấu giá đã kết thúc");
      }

      const currentPriceDecimal = new Prisma.Decimal(product.current_price);
      const step = calculateStepPrice(currentPriceDecimal);
      const nextValidBid = currentPriceDecimal.plus(step);

      let initialBidAmountDecimal = null;
      let depositAmount = null;
      let isProxySetup = false;

      if (maxAutoBidDecimal !== null) {
        // Proxy Bid
        isProxySetup = true;
        depositAmount = maxAutoBidDecimal.mul(0.1);

        if (maxAutoBidDecimal.lt(nextValidBid)) {
          throw new ApiError(400, "Mức giá tối đa thiết lập phải lớn hơn giá thầu hợp lệ tiếp theo");
        }

        initialBidAmountDecimal = nextValidBid;
      } else {
        // Manual Bid
        if (bidDecimal === null) {
          throw new ApiError(400, "Vui lòng cung cấp số tiền đặt giá");
        }

        if (bidDecimal.lt(nextValidBid)) {
          throw new ApiError(400, `Giá đặt phải lớn hơn hoặc bằng giá thầu tối thiểu: ${nextValidBid.toString()}`);
        }

        depositAmount = bidDecimal.mul(0.1);
        initialBidAmountDecimal = bidDecimal;
      }

      // Đóng băng tiền cọc
      await holdEscrow(tx, userId, depositAmount, product.id);

      const notificationsToTrigger = [];

      // Hoàn cọc cho người bị vượt giá cũ
      const oldHighestBid = await tx.bid.findFirst({
        where: { productId: product.id },
        orderBy: { bidAmount: 'desc' }
      });

      if (oldHighestBid && oldHighestBid.userId && oldHighestBid.bidAmount) {
        const oldDepositAmount = oldHighestBid.isAutoBid && oldHighestBid.maxAutoBidAmount
          ? new Prisma.Decimal(oldHighestBid.maxAutoBidAmount).mul(0.1)
          : new Prisma.Decimal(oldHighestBid.bidAmount).mul(0.1);
        await releaseEscrow(tx, oldHighestBid.userId, oldDepositAmount, product.id);

        // Tạo thông báo vượt giá
        const notif = await tx.notification.create({
          data: {
            userId: oldHighestBid.userId,
            title: 'Bạn đã bị vượt giá',
            message: `Lượt đặt giá của bạn cho sản phẩm "${product.title}" đã bị vượt qua. Số tiền cọc đã được hoàn trả vào ví.`,
            type: 'OUTBID'
          }
        });
        notificationsToTrigger.push(notif);
      }

      // Tạo lượt Bid mới
      const initialBid = await tx.bid.create({
        data: {
          productId: product.id,
          userId: userId,
          bidAmount: initialBidAmountDecimal,
          status: "SUCCESS",
          ipAddress: ipAddress,
          userAgent: userAgent,
          isAutoBid: isProxySetup,
          maxAutoBidAmount: isProxySetup ? maxAutoBidDecimal : null,
        },
      });

      // Cập nhật giá sản phẩm tạm thời
      await tx.product.update({
        where: { id: product.id },
        data: { currentPrice: initialBidAmountDecimal }
      });

      let currentHighestBidderId = userId;
      let currentPrice = initialBidAmountDecimal;
      const bidsCreated = [initialBid];

      // Proxy Loop
      let loopCount = 0;
      const maxIterations = 100;
      while (loopCount < maxIterations) {
        loopCount++;

        const allBids = await tx.bid.findMany({
          where: { productId: product.id },
          orderBy: { bidTime: 'desc' }
        });

        const latestUserBids = new Map();
        for (const bid of allBids) {
          if (!latestUserBids.has(bid.userId)) {
            latestUserBids.set(bid.userId, bid);
          }
        }

        let otherProxy = null;
        for (const bid of latestUserBids.values()) {
          if (
            bid.userId !== currentHighestBidderId &&
            bid.isAutoBid &&
            bid.maxAutoBidAmount &&
            new Prisma.Decimal(bid.maxAutoBidAmount).gt(currentPrice)
          ) {
            if (!otherProxy || new Prisma.Decimal(bid.maxAutoBidAmount).gt(new Prisma.Decimal(otherProxy.maxAutoBidAmount))) {
              otherProxy = bid;
            }
          }
        }

        if (!otherProxy) {
          break;
        }

        const currentStep = calculateStepPrice(currentPrice);
        const nextBidAmount = currentPrice.plus(currentStep);

        const otherProxyMax = new Prisma.Decimal(otherProxy.maxAutoBidAmount);
        if (nextBidAmount.gt(otherProxyMax)) {
          break;
        }

        // Đóng băng cọc User X và hoàn cọc currentHighestBidder
        const userXDeposit = otherProxyMax.mul(0.1);
        await holdEscrow(tx, otherProxy.userId, userXDeposit, product.id);

        const outbidBid = bidsCreated[bidsCreated.length - 1];
        const outbidDeposit = outbidBid.isAutoBid && outbidBid.maxAutoBidAmount
          ? new Prisma.Decimal(outbidBid.maxAutoBidAmount).mul(0.1)
          : new Prisma.Decimal(outbidBid.bidAmount).mul(0.1);
        await releaseEscrow(tx, currentHighestBidderId, outbidDeposit, product.id);

        // Thông báo cho người bị đè
        const notifOutbid = await tx.notification.create({
          data: {
            userId: currentHighestBidderId,
            title: 'Bạn đã bị vượt giá (Đấu giá Tự động)',
            message: `Lượt đặt giá của bạn cho sản phẩm "${product.title}" đã bị hệ thống tự động vượt qua.`,
            type: 'OUTBID'
          }
        });
        notificationsToTrigger.push(notifOutbid);

        const newBid = await tx.bid.create({
          data: {
            productId: product.id,
            userId: otherProxy.userId,
            bidAmount: nextBidAmount,
            status: "SUCCESS",
            ipAddress: "system-proxy",
            userAgent: "system-proxy-agent",
            isAutoBid: true,
            maxAutoBidAmount: otherProxy.maxAutoBidAmount
          }
        });

        bidsCreated.push(newBid);

        await tx.product.update({
          where: { id: product.id },
          data: { currentPrice: nextBidAmount }
        });

        currentHighestBidderId = otherProxy.userId;
        currentPrice = nextBidAmount;
      }

      if (loopCount >= maxIterations) {
        throw new Error("Phát hiện vòng lặp vô hạn trong Đấu giá Tự động.");
      }

      // Sniping Protection
      const timeRemainingMs = endTime.getTime() - now.getTime();
      let newEndTime = undefined;

      if (timeRemainingMs > 0 && timeRemainingMs < 30 * 1000) {
        newEndTime = new Date(endTime.getTime() + 2 * 60 * 1000);
      }

      const updatedProduct = await tx.product.update({
        where: { id: product.id },
        data: {
          currentPrice: currentPrice,
          ...(newEndTime ? { endTime: newEndTime } : {}),
        },
      });

      // Tạo Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'PLACE_BID',
          target: product.id,
          ipAddress,
          userAgent,
          details: JSON.stringify({
            finalPrice: Number(currentPrice),
            bidsCount: bidsCreated.length,
            isSnipingExtension: !!newEndTime
          })
        }
      });

      return {
        currentPrice: updatedProduct.currentPrice,
        endTime: updatedProduct.endTime,
        bidsCreated: bidsCreated,
        notificationsToTrigger
      };
    });

    // Broadcast SSE update event for bids
    for (const bid of result.bidsCreated) {
      const bidUser = await prisma.user.findUnique({
        where: { id: bid.userId },
        select: { id: true, email: true }
      });
      
      const formattedBidForSse = {
        id: bid.id,
        productId: bid.productId,
        userId: bid.userId,
        bidAmount: Number(bid.bidAmount),
        bidTime: bid.bidTime.toISOString(),
        isAutoBid: bid.isAutoBid,
        user: bidUser
      };

      triggerProductUpdate(
        productId,
        Number(bid.bidAmount),
        result.endTime.toISOString(),
        undefined,
        formattedBidForSse
      );
    }

    // Broadcast user notifications
    for (const notif of result.notificationsToTrigger) {
      triggerNotificationSend(notif.userId, notif);
    }

    return res.status(200).json({
      success: true,
      message: "Đặt giá thành công",
      data: {
        currentPrice: Number(result.currentPrice),
        endTime: result.endTime,
      },
    });

  } catch (error) {
    return next(error);
  }
};

export const buyNow = async (req, res, next) => {
  const userId = req.session?.userId;
  if (!userId) {
    return next(new ApiError(401, 'Bạn cần đăng nhập để mua đứt sản phẩm'));
  }

  const { productId } = req.body;
  if (!productId) {
    return next(new ApiError(400, 'Thiếu thông tin productId.'));
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Ensure user exists
      await tx.user.upsert({
        where: { id: userId },
        update: {},
        create: {
          id: userId,
          email: `mock_user_${userId.slice(0, 8)}@example.com`,
          passwordHash: "$2b$10$mockpasswordhashplaceholder",
          balance: new Prisma.Decimal(0.00),
          walletBalance: new Prisma.Decimal(0.00),
        },
      });

      const products = await tx.$queryRaw`
        SELECT id, title, status, buy_now_price, end_time, seller_id FROM "products" WHERE id = ${productId} FOR UPDATE
      `;

      if (!products || products.length === 0) {
        throw new ApiError(404, "Sản phẩm không tồn tại");
      }

      const product = products[0];
      const now = new Date();
      const endTime = new Date(product.end_time);

      if (now > endTime || product.status === 'ENDED' || product.status === 'PENDING_PAYMENT' || product.status === 'PAID') {
        throw new ApiError(400, "Buổi đấu giá đã kết thúc");
      }

      if (!product.buy_now_price) {
        throw new ApiError(400, "Sản phẩm này không hỗ trợ tính năng Mua đứt");
      }

      const buyNowPriceDecimal = new Prisma.Decimal(product.buy_now_price);
      const depositAmount = buyNowPriceDecimal.mul(0.1);

      // Verify wallet balance
      const buyer = await tx.user.findUnique({
        where: { id: userId },
        select: { walletBalance: true }
      });
      if (!buyer || new Prisma.Decimal(buyer.walletBalance).lt(depositAmount)) {
        throw new ApiError(400, "Số dư ví không đủ để đặt cọc mua đứt (cần cọc 10% giá trị mua đứt).");
      }

      // Hold deposit (10%)
      await holdEscrow(tx, userId, depositAmount, product.id);

      const notificationsToTrigger = [];

      // Release previous highest bidder deposit if any
      const oldHighestBid = await tx.bid.findFirst({
        where: { productId: product.id },
        orderBy: { bidAmount: 'desc' }
      });

      if (oldHighestBid && oldHighestBid.userId) {
        const oldDeposit = oldHighestBid.isAutoBid && oldHighestBid.maxAutoBidAmount
          ? new Prisma.Decimal(oldHighestBid.maxAutoBidAmount).mul(0.1)
          : new Prisma.Decimal(oldHighestBid.bidAmount).mul(0.1);
        await releaseEscrow(tx, oldHighestBid.userId, oldDeposit, product.id);

        // Notify old highest bidder
        const notifOutbid = await tx.notification.create({
          data: {
            userId: oldHighestBid.userId,
            title: 'Buổi đấu giá kết thúc đột ngột (Mua đứt)',
            message: `Sản phẩm "${product.title}" đã được một người dùng khác mua đứt. Tiền cọc đấu giá của bạn đã được hoàn trả.`,
            type: 'SYSTEM'
          }
        });
        notificationsToTrigger.push(notifOutbid);
      }

      // Notify seller
      const notifSeller = await tx.notification.create({
        data: {
          userId: product.seller_id,
          title: 'Sản phẩm đã được mua đứt',
          message: `Sản phẩm "${product.title}" của bạn đã được mua đứt với giá ${Number(buyNowPriceDecimal).toLocaleString('vi-VN')} đ. Vui lòng chuẩn bị giao hàng.`,
          type: 'SYSTEM'
        }
      });
      notificationsToTrigger.push(notifSeller);

      // Notify buyer
      const notifBuyer = await tx.notification.create({
        data: {
          userId: userId,
          title: 'Mua đứt sản phẩm thành công',
          message: `Bạn đã mua đứt sản phẩm "${product.title}" thành công. Vui lòng thanh toán 90% còn lại.`,
          type: 'WON'
        }
      });
      notificationsToTrigger.push(notifBuyer);

      // Create winning bid record
      const bid = await tx.bid.create({
        data: {
          productId: product.id,
          userId: userId,
          bidAmount: buyNowPriceDecimal,
          status: "SUCCESS",
          ipAddress: req.ip || "system-buy-now",
          userAgent: req.headers['user-agent'] || "system-buy-now-agent"
        }
      });

      // End the auction: set currentPrice = buyNowPrice, status = PENDING_PAYMENT
      const updatedProduct = await tx.product.update({
        where: { id: product.id },
        data: {
          currentPrice: buyNowPriceDecimal,
          status: "PENDING_PAYMENT",
          endTime: now,
          winnerId: userId
        }
      });

      // Tạo Audit Log cho Buy Now
      await tx.auditLog.create({
        data: {
          userId,
          action: 'BUY_NOW',
          target: product.id,
          ipAddress: req.ip || "system-buy-now",
          userAgent: req.headers['user-agent'] || "system-buy-now-agent",
          details: JSON.stringify({
            buyNowPrice: Number(buyNowPriceDecimal)
          })
        }
      });

      return {
        currentPrice: updatedProduct.currentPrice,
        endTime: updatedProduct.endTime,
        status: updatedProduct.status,
        bid,
        notificationsToTrigger
      };
    });

    // Broadcast SSE update event
    const bidUser = await prisma.user.findUnique({
      where: { id: result.bid.userId },
      select: { id: true, email: true }
    });

    const formattedBidForSse = {
      id: result.bid.id,
      productId: result.bid.productId,
      userId: result.bid.userId,
      bidAmount: Number(result.bid.bidAmount),
      bidTime: result.bid.bidTime.toISOString(),
      isAutoBid: result.bid.isAutoBid,
      user: bidUser
    };

    triggerProductUpdate(
      productId,
      Number(result.currentPrice),
      result.endTime.toISOString(),
      result.status,
      formattedBidForSse
    );

    // Trigger user notifications via SSE
    for (const notif of result.notificationsToTrigger) {
      triggerNotificationSend(notif.userId, notif);
    }

    return res.status(200).json({
      success: true,
      message: "Mua đứt sản phẩm thành công",
      data: {
        currentPrice: Number(result.currentPrice),
        endTime: result.endTime,
        status: result.status
      }
    });

  } catch (error) {
    return next(error);
  }
};
