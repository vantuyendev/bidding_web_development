import cron from 'node-cron';
import prisma from '../models/db.js';
import { triggerProductUpdate } from '../controllers/streamController.js';

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
          status: {
            in: ['active', 'ACTIVE'],
          },
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

        // Update status of product to "ENDED"
        const updatedProduct = await tx.product.update({
          where: { id: product.id },
          data: { status: 'ENDED' },
        });

        if (highestBid) {
          console.log(
            `[CRON WORKER] Sản phẩm "${product.title}" đã kết thúc. Người thắng cuộc: User ID "${highestBid.userId}" với mức giá ${highestBid.bidAmount} đ.`
          );
        } else {
          console.log(
            `[CRON WORKER] Sản phẩm "${product.title}" đã kết thúc nhưng không có lượt đặt giá nào.`
          );
        }

        closedAuctions.push({
          productId: product.id,
          currentPrice: highestBid ? Number(highestBid.bidAmount) : Number(product.currentPrice),
          endTime: updatedProduct.endTime.toISOString(),
          status: updatedProduct.status, // "ENDED"
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
