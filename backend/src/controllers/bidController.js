import prisma from '../models/db.js';
import { Prisma } from '@prisma/client';
import { triggerProductUpdate } from './streamController.js';

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
    // 2. Read Request Body
    const { productId, bidAmount } = req.body;

    if (!productId || bidAmount === undefined || bidAmount === null) {
      return res.status(400).json({
        success: false,
        error: "Thiếu productId hoặc bidAmount trong request body."
      });
    }

    // Convert bidAmount to Decimal object for precise comparison
    let bidDecimal;
    try {
      bidDecimal = new Prisma.Decimal(bidAmount);
    } catch (e) {
      return res.status(400).json({
        success: false,
        error: "Giá trị đặt giá không hợp lệ."
      });
    }

    if (bidDecimal.isNaN() || bidDecimal.isNegative()) {
      return res.status(400).json({
        success: false,
        error: "Giá trị đặt giá không hợp lệ."
      });
    }

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

      // Check bid amount (must be higher than current price)
      const currentPriceDecimal = new Prisma.Decimal(product.current_price);
      if (bidDecimal.lte(currentPriceDecimal)) {
        throw new Error("Giá đặt phải lớn hơn giá hiện tại");
      }

      // Create new bid record
      await tx.bid.create({
        data: {
          productId: product.id,
          userId: userId,
          bidAmount: bidDecimal,
          status: "success",
        },
      });

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
          currentPrice: bidDecimal,
          ...(newEndTime ? { endTime: newEndTime } : {}),
        },
      });

      return {
        currentPrice: updatedProduct.currentPrice,
        endTime: updatedProduct.endTime,
      };
    });

    // Broadcast SSE update event
    triggerProductUpdate(
      productId,
      Number(result.currentPrice),
      result.endTime.toISOString()
    );

    return res.status(200).json({
      success: true,
      message: "Đặt giá thành công",
      data: result,
    });

  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message || "Đã xảy ra lỗi không xác định."
    });
  }
};
