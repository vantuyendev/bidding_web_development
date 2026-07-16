import prisma from '../models/db.js';
import { Prisma } from '@prisma/client';
import { triggerProductUpdate } from './streamController.js';
import { z } from 'zod';
import { holdEscrow, releaseEscrow } from '../services/walletService.js';
import { triggerNotificationSend } from '../utils/notificationEmitter.js';
import ApiError from '../utils/ApiError.js';

/**
 * TÍNH BƯỚC GIÁ BIẾN THIÊN TỰ ĐỘNG (calculateStepPrice)
 * - Nó là gì: Khoảng cách giá tối thiểu giữa lượt đặt giá mới và giá hiện tại.
 * - Để làm gì: Tránh trường hợp người dùng đặt giá nâng lên một lượng quá nhỏ (ví dụ sản phẩm 10 triệu mà đặt thêm 1 đồng).
 *   Quy định bước giá tăng dần theo giá trị sản phẩm:
 *     + Giá trị sản phẩm < 1.000.000đ: bước giá là 10.000đ.
 *     + Giá trị sản phẩm từ 1.000.000đ đến dưới 5.000.000đ: bước giá là 50.000đ.
 *     + Giá trị sản phẩm từ 5.000.000đ trở lên: bước giá là 100.000đ.
 * - Ý nghĩa: Đẩy nhanh tốc độ đấu giá và duy trì sự chuyên nghiệp, công bằng cho phiên.
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
    // Xác thực body của yêu cầu bằng Zod (safeParse sẽ ném ra lỗi xác thực nếu thất bại, hoặc chúng ta có thể SafeParse rồi ném lỗi ApiError)
    const validation = bidSchema.safeParse(req.body);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => err.message).join(' ');
      throw new ApiError(400, errors);
    }

    const { productId, bidAmount, maxAutoBidAmount } = validation.data;

    // Chuyển đổi đầu vào thành đối tượng Decimal nếu có
    const bidDecimal = bidAmount !== undefined && bidAmount !== null ? new Prisma.Decimal(bidAmount) : null;
    const maxAutoBidDecimal = maxAutoBidAmount !== undefined && maxAutoBidAmount !== null ? new Prisma.Decimal(maxAutoBidAmount) : null;

    // Trích xuất thông tin IP và User Agent để lưu nhật ký kiểm toán (Audit Logs)
    const ipAddress = req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;

    // GIAO DỊCH DATABASE BẢO MẬT CAO (Database Transaction)
    // - Nó là gì: Gom một nhóm các thao tác DB vào một khối thực thi duy nhất tuân thủ tính chất ACID.
    // - Để làm gì: Đảm bảo tính toàn vẹn dữ liệu tuyệt đối. Nếu có bất kỳ lỗi nào xảy ra giữa chừng 
    //   (ví dụ đóng băng ví bị lỗi), toàn bộ giao dịch sẽ Rollback (quay xe), không lưu lại bất kỳ thay đổi nào.
    const result = await prisma.$transaction(async (tx) => {
      // Đảm bảo người dùng giả lập tồn tại trong DB
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

      // KHÓA DÒNG DỮ LIỆU ĐỂ TRÁNH TRANH CHẤP (Row-level Locking - FOR UPDATE)
      // - Nó là gì: Raw query sử dụng từ khóa "FOR UPDATE" để khóa sản phẩm đang được truy vấn trong DB.
      // - Để làm gì: Ngăn ngừa Race Condition (Xung đột đồng thời). Nếu có 100 người dùng cùng click đặt giá 
      //   ở cùng một phần nghìn giây, DB sẽ buộc họ phải xếp hàng thực hiện lần lượt. Người thứ nhất khóa dòng,
      //   tính toán giá mới, lưu lại rồi mới mở khóa dòng để người thứ hai truy vấn.
      const products = await tx.$queryRaw`
        SELECT id, title, status, current_price, end_time, seller_id FROM "products" WHERE id = ${productId} FOR UPDATE
      `;

      if (!products || products.length === 0) {
        throw new ApiError(404, "Sản phẩm không tồn tại");
      }

      const product = products[0];
      const now = new Date();
      const endTime = new Date(product.end_time);

      // Kiểm tra xem phiên đấu giá đã kết thúc chưa
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
        // CƠ CHẾ ĐẤU GIÁ HỘ (Proxy Bidding / Auto Bid)
        // - Nó là gì: Người dùng chỉ cần thiết lập giá tối đa họ sẵn sàng trả (maxAutoBidAmount).
        //   Hệ thống sẽ thay mặt họ tự động đấu thầu lên từng bước giá một khi có người khác trả giá cao hơn.
        // - Để làm gì: Người dùng không cần trực tiếp canh phiên đấu giá 24/7.
        // - Ký quỹ: Tiền cọc giữ hộ sẽ tự động đóng băng dựa trên 10% giá trị tối đa (maxAutoBidAmount) 
        //   thay vì giá trị thầu hiện tại, nhằm đảm bảo người dùng đủ khả năng thanh toán nếu đẩy giá thầu tới đích.
        isProxySetup = true;
        depositAmount = maxAutoBidDecimal.mul(0.1);

        if (maxAutoBidDecimal.lt(nextValidBid)) {
          throw new ApiError(400, "Mức giá tối đa thiết lập phải lớn hơn giá thầu hợp lệ tiếp theo");
        }

        initialBidAmountDecimal = nextValidBid;
      } else {
        // Đặt giá thủ công (Manual Bidding)
        // Người dùng đặt giá trị thầu cụ thể ở lượt thầu này. Đóng băng cọc bằng 10% giá trị lượt thầu này.
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

      // Vòng lặp Proxy
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

      // CƠ CHẾ CHỐNG BẮN TỈA PHÚT CHÓT (Sniping Protection)
      // - Nó là gì: Nếu có một lượt đặt giá (thủ công hoặc tự động) được gửi vào hệ thống trong khoảng 30 giây
      //   trước khi phiên đấu giá kết thúc, thời gian kết thúc sẽ được gia hạn thêm 2 phút.
      // - Để làm gì: Ngăn chặn các hành vi "bắn tỉa" (sniper) - việc người đặt giá chờ đến giây cuối cùng để thầu 
      //   khiến những người đấu giá cũ không kịp phản ứng. Cơ chế này đem lại sự công bằng và giúp sản phẩm 
      //   đạt được giá trị thực tế cao nhất có thể.
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

    // Phát sóng sự kiện cập nhật SSE cho các lượt đấu giá
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

    // Phát sóng thông báo người dùng
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
      // Đảm bảo người dùng tồn tại
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

      // Xác minh số dư ví
      const buyer = await tx.user.findUnique({
        where: { id: userId },
        select: { walletBalance: true }
      });
      if (!buyer || new Prisma.Decimal(buyer.walletBalance).lt(depositAmount)) {
        throw new ApiError(400, "Số dư ví không đủ để đặt cọc mua đứt (cần cọc 10% giá trị mua đứt).");
      }

      // Giữ tiền đặt cọc (10%)
      await holdEscrow(tx, userId, depositAmount, product.id);

      const notificationsToTrigger = [];

      // Giải phóng tiền cọc của người đặt giá cao nhất trước đó nếu có
      const oldHighestBid = await tx.bid.findFirst({
        where: { productId: product.id },
        orderBy: { bidAmount: 'desc' }
      });

      if (oldHighestBid && oldHighestBid.userId) {
        const oldDeposit = oldHighestBid.isAutoBid && oldHighestBid.maxAutoBidAmount
          ? new Prisma.Decimal(oldHighestBid.maxAutoBidAmount).mul(0.1)
          : new Prisma.Decimal(oldHighestBid.bidAmount).mul(0.1);
        await releaseEscrow(tx, oldHighestBid.userId, oldDeposit, product.id);

        // Thông báo cho người đặt giá cao nhất cũ
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

      // Thông báo cho người bán
      const notifSeller = await tx.notification.create({
        data: {
          userId: product.seller_id,
          title: 'Sản phẩm đã được mua đứt',
          message: `Sản phẩm "${product.title}" của bạn đã được mua đứt với giá ${Number(buyNowPriceDecimal).toLocaleString('vi-VN')} đ. Vui lòng chuẩn bị giao hàng.`,
          type: 'SYSTEM'
        }
      });
      notificationsToTrigger.push(notifSeller);

      // Thông báo cho người mua
      const notifBuyer = await tx.notification.create({
        data: {
          userId: userId,
          title: 'Mua đứt sản phẩm thành công',
          message: `Bạn đã mua đứt sản phẩm "${product.title}" thành công. Vui lòng thanh toán 90% còn lại.`,
          type: 'WON'
        }
      });
      notificationsToTrigger.push(notifBuyer);

      // Tạo bản ghi đấu giá thắng
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

      // Kết thúc phiên đấu giá: đặt currentPrice = buyNowPrice, status = PENDING_PAYMENT
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

    // Phát sóng sự kiện cập nhật SSE
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

    // Kích hoạt thông báo người dùng qua SSE
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
