import cron from 'node-cron';
import prisma from '../models/db.js';
import { Prisma } from '@prisma/client';
import { triggerProductUpdate } from '../controllers/streamController.js';
import { releaseEscrow } from '../services/walletService.js';

console.log('[CRON WORKER] Background auction worker script loaded.');

// Setup cron schedule to run every minute ('* * * * *')
cron.schedule('* * * * *', async () => {
  const now = new Date();
  console.log(`[CRON WORKER] Checking for expired active auctions at ${now.toISOString()}...`);

  try {
    // Run db queries inside a transaction for complete data integrity
    const transactionResult = await prisma.$transaction(async (tx) => {
      // Find all active products whose bidding time has expired
      const expiredProducts = await tx.product.findMany({
        where: {
          endTime: {
            lte: now,
          },
          status: 'ACTIVE',
        },
      });

      if (expiredProducts.length === 0) {
        return [];
      }

      const closedAuctions = [];

      for (const product of expiredProducts) {
        // Query the highest bid for this product
        const highestBid = await tx.bid.findFirst({
          where: {
            productId: product.id,
          },
          orderBy: {
            bidAmount: 'desc',
          },
        });

        let updatedStatus = 'ENDED';
        let winnerId = null;

        if (highestBid) {
          // Check if highest bid meets reserve price
          const meetsReserve = !product.reservePrice || new Prisma.Decimal(highestBid.bidAmount).gte(new Prisma.Decimal(product.reservePrice));

          if (meetsReserve) {
            // Reserve price met -> winner gets product, status is PENDING_PAYMENT (waiting for remaining 90%)
            updatedStatus = 'PENDING_PAYMENT';
            winnerId = highestBid.userId;

            // Create notification for winner
            await tx.notification.create({
              data: {
                userId: highestBid.userId,
                title: 'Chúc mừng! Bạn đã thắng đấu giá',
                message: `Bạn đã thắng đấu giá sản phẩm "${product.title}" với mức giá ${Number(highestBid.bidAmount).toLocaleString('vi-VN')} đ. Vui lòng hoàn tất thanh toán 90% còn lại.`,
                type: 'WON'
              }
            });

            // Create notification for seller
            await tx.notification.create({
              data: {
                userId: product.sellerId,
                title: 'Phiên đấu giá thành công',
                message: `Phiên đấu giá sản phẩm "${product.title}" của bạn đã kết thúc thành công. Người thắng cuộc là ${highestBid.userId} với mức giá ${Number(highestBid.bidAmount).toLocaleString('vi-VN')} đ.`,
                type: 'SYSTEM'
              }
            });

            console.log(
              `[CRON WORKER] Sản phẩm "${product.title}" đã thắng. Người thắng cuộc: User ID "${highestBid.userId}" với mức giá ${highestBid.bidAmount} đ.`
            );
          } else {
            // Reserve price NOT met -> UNSOLD, refund deposit to bidder
            updatedStatus = 'UNSOLD';
            
            // Release/unfreeze the deposit for the highest bidder
            const depositAmount = highestBid.isAutoBid && highestBid.maxAutoBidAmount
              ? new Prisma.Decimal(highestBid.maxAutoBidAmount).mul(0.1)
              : new Prisma.Decimal(highestBid.bidAmount).mul(0.1);

            await releaseEscrow(tx, highestBid.userId, depositAmount);

            // Create notification for bidder
            await tx.notification.create({
              data: {
                userId: highestBid.userId,
                title: 'Đấu giá kết thúc (Không đạt giá bảo lưu)',
                message: `Phiên đấu giá sản phẩm "${product.title}" đã kết thúc nhưng giá cược cao nhất không đạt giá bảo lưu của người bán. Tiền cọc đã được hoàn trả.`,
                type: 'SYSTEM'
              }
            });

            // Create notification for seller
            await tx.notification.create({
              data: {
                userId: product.sellerId,
                title: 'Phiên đấu giá kết thúc (Không đạt giá bảo lưu)',
                message: `Sản phẩm "${product.title}" của bạn đã kết thúc nhưng không đạt giá bảo lưu tối thiểu. Trạng thái chuyển thành Không bán được.`,
                type: 'SYSTEM'
              }
            });

            console.log(
              `[CRON WORKER] Sản phẩm "${product.title}" đã kết thúc nhưng KHÔNG ĐẠT GIÁ BẢO LƯU (${product.reservePrice} đ). Giá cược cao nhất: ${highestBid.bidAmount} đ.`
            );
          }
        } else {
          // No bids -> UNSOLD
          updatedStatus = 'UNSOLD';
          
          // Create notification for seller
          await tx.notification.create({
            data: {
              userId: product.sellerId,
              title: 'Phiên đấu giá kết thúc (Không có lượt đặt giá)',
              message: `Sản phẩm "${product.title}" của bạn đã kết thúc nhưng không có lượt đặt giá nào. Trạng thái chuyển thành Không bán được.`,
              type: 'SYSTEM'
            }
          });

          console.log(
            `[CRON WORKER] Sản phẩm "${product.title}" đã kết thúc nhưng không có lượt đặt giá nào.`
          );
        }

        // Update status and winner of product
        const updatedProduct = await tx.product.update({
          where: { id: product.id },
          data: { 
            status: updatedStatus,
            winnerId: winnerId
          },
        });

        closedAuctions.push({
          productId: product.id,
          currentPrice: highestBid ? Number(highestBid.bidAmount) : Number(product.currentPrice),
          endTime: updatedProduct.endTime.toISOString(),
          status: updatedProduct.status,
        });
      }

      return closedAuctions;
    });

    // Emit SSE real-time updates for all closed auctions AFTER database transaction succeeds
    if (transactionResult.length > 0) {
      console.log(`[CRON WORKER] Successfully closed ${transactionResult.length} expired auctions.`);
      for (const auction of transactionResult) {
        triggerProductUpdate(
          auction.productId,
          auction.currentPrice,
          auction.endTime,
          auction.status
        );
      }
    }
  } catch (error) {
    console.error('[CRON WORKER] Error running closeExpiredAuctions:', error);
  }
});

