import prisma from '../models/db.js';
import { Prisma } from '@prisma/client';
import { triggerProductUpdate } from './streamController.js';
import { z } from 'zod';
import { holdEscrow, releaseEscrow } from '../services/walletService.js';

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

export const placeBid = async (req, res) => {
  // Get userId from session
  const userId = req.session?.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Bạn cần đăng nhập để đặt giá'
    });
  }

  try {
    // 2. Validate request body using Zod
    const validation = bidSchema.safeParse(req.body);
    if (!validation.success) {
      // Trích xuất các thông báo lỗi kiểm duyệt
      const errors = validation.error.errors.map(err => err.message).join(' ');
      return res.status(400).json({
        success: false,
        error: errors
      });
    }

    const { productId, bidAmount, maxAutoBidAmount } = validation.data;

    // Convert inputs to Decimal objects if present
    const bidDecimal = bidAmount !== undefined && bidAmount !== null ? new Prisma.Decimal(bidAmount) : null;
    const maxAutoBidDecimal = maxAutoBidAmount !== undefined && maxAutoBidAmount !== null ? new Prisma.Decimal(maxAutoBidAmount) : null;

    // Trích xuất thông tin IP và User Agent để lưu nhật ký kiểm toán (Audit Logs)
    const ipAddress = req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;


    // 3. High-security Database Transaction
    const result = await prisma.$transaction(async (tx) => {
      // Ensure mock user exists in DB to prevent foreign key constraint error
      await tx.user.upsert({
        where: { id: userId },
        update: {},
        create: {
          id: userId,
          email: `mock_user_${userId.slice(0, 8)}@example.com`,
          passwordHash: "$2b$10$mockpasswordhashplaceholder",
          balance: new Prisma.Decimal(10000000.00),
          walletBalance: new Prisma.Decimal(10000000.00),
        },
      });

      // Row-level Locking: Lock product row to prevent Race Condition
      const products = await tx.$queryRaw`
        SELECT * FROM "products" WHERE id = ${productId} FOR UPDATE
      `;

      if (!products || products.length === 0) {
        throw new Error("Sản phẩm không tồn tại");
      }

      const product = products[0];
      const now = new Date();
      const endTime = new Date(product.end_time);

      // Check if auction has ended
      if (now > endTime) {
        throw new Error("Buổi đấu giá đã kết thúc");
      }

      const currentPriceDecimal = new Prisma.Decimal(product.current_price);
      const step = calculateStepPrice(currentPriceDecimal);
      const nextValidBid = currentPriceDecimal.plus(step);

      let initialBidAmountDecimal = null;
      let depositAmount = null;
      let isProxySetup = false;

      if (maxAutoBidDecimal !== null) {
        // Trường hợp Thiết lập Tự động Đấu giá (Proxy Bid)
        isProxySetup = true;

        // Kiểm tra và đảm bảo số dư ví đủ để cọc 10% của maxAutoBidAmount
        depositAmount = maxAutoBidDecimal.mul(0.1);

        // Nếu maxAutoBidAmount < nextValidBid, quăng lỗi
        if (maxAutoBidDecimal.lt(nextValidBid)) {
          throw new Error("Mức giá tối đa thiết lập phải lớn hơn giá thầu hợp lệ tiếp theo");
        }

        // Tự động tạo lượt Bid mới bằng chính giá trị nextValidBid
        initialBidAmountDecimal = nextValidBid;
      } else {
        // Trường hợp đặt giá tĩnh (Manual Bid)
        if (bidDecimal === null) {
          throw new Error("Vui lòng cung cấp số tiền đặt giá");
        }

        // Kiểm tra xem bidAmount có lớn hơn hoặc bằng nextValidBid không
        if (bidDecimal.lt(nextValidBid)) {
          throw new Error(`Giá đặt phải lớn hơn hoặc bằng giá thầu tối thiểu: ${nextValidBid.toString()}`);
        }

        depositAmount = bidDecimal.mul(0.1);
        initialBidAmountDecimal = bidDecimal;
      }

      // Gọi hàm holdEscrow để đóng băng depositAmount của User A
      await holdEscrow(tx, userId, depositAmount);

      // Xử lý hoàn cọc cho người bị vượt giá cũ:
      // Truy vấn bảng Bid để tìm lượt đặt giá cao nhất hiện tại của sản phẩm đó trước khi bị User A đè giá
      const oldHighestBid = await tx.bid.findFirst({
        where: { productId: product.id },
        orderBy: { bidAmount: 'desc' }
      });

      // Nếu tìm thấy User B, trả lại tiền cọc cũ cho User B ngay lập tức
      if (oldHighestBid && oldHighestBid.userId && oldHighestBid.bidAmount) {
        const oldDepositAmount = oldHighestBid.isAutoBid && oldHighestBid.maxAutoBidAmount
          ? new Prisma.Decimal(oldHighestBid.maxAutoBidAmount).mul(0.1)
          : new Prisma.Decimal(oldHighestBid.bidAmount).mul(0.1);
        await releaseEscrow(tx, oldHighestBid.userId, oldDepositAmount);
      }

      // Tạo lượt Bid mới đầu tiên của User A
      const initialBid = await tx.bid.create({
        data: {
          productId: product.id,
          userId: userId,
          bidAmount: initialBidAmountDecimal,
          status: "success",
          ipAddress: ipAddress,
          userAgent: userAgent,
          isAutoBid: isProxySetup,
          maxAutoBidAmount: isProxySetup ? maxAutoBidDecimal : null,
        },
      });

      // Cập nhật giá sản phẩm tạm thời trong transaction
      await tx.product.update({
        where: { id: product.id },
        data: {
          currentPrice: initialBidAmountDecimal
        }
      });

      let currentHighestBidderId = userId;
      let currentPrice = initialBidAmountDecimal;
      const bidsCreated = [initialBid];

      // Vòng lặp Đè giá Tự động (The Proxy Loop)
      let loopCount = 0;
      const maxIterations = 100;
      while (loopCount < maxIterations) {
        loopCount++;

        // Lấy tất cả lượt đặt giá để lọc ra lượt mới nhất của từng người dùng
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

        // Tìm xem có User X khác có cấu hình Proxy Bid và maxAutoBidAmount > currentPrice
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
          break; // Không tìm thấy User X nào khác thỏa mãn, thoát vòng lặp
        }

        // Tính giá đặt tiếp theo cho User X
        const currentStep = calculateStepPrice(currentPrice);
        const nextBidAmount = currentPrice.plus(currentStep);

        const otherProxyMax = new Prisma.Decimal(otherProxy.maxAutoBidAmount);
        if (nextBidAmount.gt(otherProxyMax)) {
          // Giá thầu tự động tiếp theo vượt quá giới hạn của User X
          break;
        }

        // Đủ điều kiện đè giá: User X tự động đặt giá tiếp theo
        // 1. Đóng băng tiền cọc cho User X (10% của maxAutoBidAmount)
        const userXDeposit = otherProxyMax.mul(0.1);
        await holdEscrow(tx, otherProxy.userId, userXDeposit);

        // 2. Hoàn cọc cho người giữ giá cao nhất cũ vừa bị đè (currentHighestBidderId)
        const outbidBid = bidsCreated[bidsCreated.length - 1];
        const outbidDeposit = outbidBid.isAutoBid && outbidBid.maxAutoBidAmount
          ? new Prisma.Decimal(outbidBid.maxAutoBidAmount).mul(0.1)
          : new Prisma.Decimal(outbidBid.bidAmount).mul(0.1);
        await releaseEscrow(tx, currentHighestBidderId, outbidDeposit);

        // 3. Tạo bản ghi đặt giá mới cho User X
        const newBid = await tx.bid.create({
          data: {
            productId: product.id,
            userId: otherProxy.userId,
            bidAmount: nextBidAmount,
            status: "success",
            ipAddress: "system-proxy",
            userAgent: "system-proxy-agent",
            isAutoBid: true,
            maxAutoBidAmount: otherProxy.maxAutoBidAmount
          }
        });

        bidsCreated.push(newBid);

        // 4. Cập nhật currentPrice của sản phẩm
        await tx.product.update({
          where: { id: product.id },
          data: { currentPrice: nextBidAmount }
        });

        // 5. Cập nhật tracking variables để tiếp tục vòng lặp
        currentHighestBidderId = otherProxy.userId;
        currentPrice = nextBidAmount;
      }

      if (loopCount >= maxIterations) {
        throw new Error("Phát hiện vòng lặp vô hạn trong Đấu giá Tự động.");
      }

      // Sniping Protection
      const timeRemainingMs = endTime.getTime() - now.getTime();
      let newEndTime = undefined;

      // If time remaining is less than 30s, add 2 minutes
      if (timeRemainingMs > 0 && timeRemainingMs < 30 * 1000) {
        newEndTime = new Date(endTime.getTime() + 2 * 60 * 1000);
      }

      // Update product info (currentPrice and new endTime if applicable)
      const updatedProduct = await tx.product.update({
        where: { id: product.id },
        data: {
          currentPrice: currentPrice,
          ...(newEndTime ? { endTime: newEndTime } : {}),
        },
      });

      return {
        currentPrice: updatedProduct.currentPrice,
        endTime: updatedProduct.endTime,
        bidsCreated: bidsCreated,
      };
    });

    // Broadcast SSE update event for each generated bid in chronological order
    for (const bid of result.bidsCreated) {
      triggerProductUpdate(
        productId,
        Number(bid.bidAmount),
        result.endTime.toISOString()
      );
    }

    return res.status(200).json({
      success: true,
      message: "Đặt giá thành công",
      data: {
        currentPrice: result.currentPrice,
        endTime: result.endTime,
      },
    });

  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message || "Đã xảy ra lỗi không xác định."
    });
  }
};

