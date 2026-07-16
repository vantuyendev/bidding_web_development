import cron from 'node-cron';
import prisma from '../models/db.js';
import { Prisma } from '@prisma/client';
import { triggerProductUpdate } from '../controllers/streamController.js';
import { releaseEscrow } from '../services/walletService.js';
import { logger } from '../utils/logger.js';

logger.info('Background auction worker script loaded');

// ─────────────────────────────────────────────────────────────────────
// CRON 1: Chạy mỗi phút — Xử lý phiên đấu giá hết hạn
// ─────────────────────────────────────────────────────────────────────
cron.schedule('* * * * *', async () => {
  const now = new Date();
  logger.info('Checking for expired active auctions', { timestamp: now.toISOString() });

  try {
    const transactionResult = await prisma.$transaction(async (tx) => {
      // Tìm tất cả sản phẩm đang ACTIVE hết thời gian
      const expiredProducts = await tx.product.findMany({
        where: {
          endTime: { lte: now },
          status: 'ACTIVE',
          deletedAt: null
        },
      });

      if (expiredProducts.length === 0) return [];

      const closedAuctions = [];

      for (const product of expiredProducts) {
        const highestBid = await tx.bid.findFirst({
          where: { productId: product.id },
          orderBy: { bidAmount: 'desc' },
        });

        let updatedStatus = 'ENDED';
        let winnerId = null;

        if (highestBid) {
          const meetsReserve = !product.reservePrice || new Prisma.Decimal(highestBid.bidAmount).gte(new Prisma.Decimal(product.reservePrice));

          if (meetsReserve) {
            updatedStatus = 'PENDING_PAYMENT';
            winnerId = highestBid.userId;

            await tx.notification.create({
              data: {
                userId: highestBid.userId,
                title: 'Chúc mừng! Bạn đã thắng đấu giá',
                message: `Bạn đã thắng đấu giá sản phẩm "${product.title}" với mức giá ${Number(highestBid.bidAmount).toLocaleString('vi-VN')} đ. Vui lòng hoàn tất thanh toán.`,
                type: 'WON'
              }
            });

            await tx.notification.create({
              data: {
                userId: product.sellerId,
                title: 'Phiên đấu giá thành công',
                message: `Phiên đấu giá sản phẩm "${product.title}" đã kết thúc. Người thắng cuộc với mức giá ${Number(highestBid.bidAmount).toLocaleString('vi-VN')} đ.`,
                type: 'SYSTEM'
              }
            });

            logger.info('Auction ended with a winner', {
              productId: product.id,
              winnerId: highestBid.userId,
              winningAmount: Number(highestBid.bidAmount)
            });
          } else {
            updatedStatus = 'UNSOLD';

            const depositAmount = highestBid.isAutoBid && highestBid.maxAutoBidAmount
              ? new Prisma.Decimal(highestBid.maxAutoBidAmount).mul(0.1)
              : new Prisma.Decimal(highestBid.bidAmount).mul(0.1);

            try {
              await releaseEscrow(tx, highestBid.userId, depositAmount, product.id);
            } catch (e) {
              logger.warn('Could not release escrow (may already be released)', { productId: product.id, err: e.message });
            }

            await tx.notification.create({
              data: {
                userId: highestBid.userId,
                title: 'Đấu giá kết thúc — Không đạt giá bảo lưu',
                message: `Phiên đấu giá "${product.title}" kết thúc nhưng không đạt giá bảo lưu. Tiền cọc đã được hoàn trả.`,
                type: 'SYSTEM'
              }
            });

            await tx.notification.create({
              data: {
                userId: product.sellerId,
                title: 'Phiên đấu giá kết thúc — Không đạt giá bảo lưu',
                message: `Sản phẩm "${product.title}" kết thúc nhưng không đạt giá bảo lưu.`,
                type: 'SYSTEM'
              }
            });
          }
        } else {
          updatedStatus = 'UNSOLD';

          await tx.notification.create({
            data: {
              userId: product.sellerId,
              title: 'Phiên đấu giá kết thúc — Không có lượt đặt giá',
              message: `Sản phẩm "${product.title}" kết thúc nhưng không có lượt đặt giá nào.`,
              type: 'SYSTEM'
            }
          });
        }

        // Soft delete: lưu deletedAt để ẩn khỏi catalog công khai
        // Nhưng giữ record cho lịch sử của winner và seller
        const updatedProduct = await tx.product.update({
          where: { id: product.id },
          data: {
            status: updatedStatus,
            winnerId,
            deletedAt: new Date() // Ẩn khỏi catalog công khai
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

    if (transactionResult.length > 0) {
      logger.info('Successfully closed expired auctions', { count: transactionResult.length });
      for (const auction of transactionResult) {
        triggerProductUpdate(auction.productId, auction.currentPrice, auction.endTime, auction.status);
      }
    }
  } catch (error) {
    logger.error('Error running closeExpiredAuctions background worker', error);
  }
});

// ─────────────────────────────────────────────────────────────────────
// CRON 2: Chạy mỗi phút — Tự động kích hoạt phiên đấu giá đến giờ bắt đầu
// ─────────────────────────────────────────────────────────────────────
cron.schedule('* * * * *', async () => {
  const now = new Date();

  try {
    // Tìm sản phẩm APPROVED + DRAFT có startTime đã đến
    const readyToStart = await prisma.product.findMany({
      where: {
        approvalStatus: 'APPROVED',
        status: 'DRAFT',
        startTime: { lte: now },
        deletedAt: null
      }
    });

    if (readyToStart.length === 0) return;

    for (const product of readyToStart) {
      await prisma.product.update({
        where: { id: product.id },
        data: { status: 'ACTIVE' }
      });

      // Notification cho seller khi phiên bắt đầu
      await prisma.notification.create({
        data: {
          userId: product.sellerId,
          title: 'Phiên đấu giá đã bắt đầu',
          message: `Phiên đấu giá sản phẩm "${product.title}" đã chính thức bắt đầu và hiển thị công khai.`,
          type: 'SYSTEM'
        }
      });

      logger.info('Auto-activated auction', { productId: product.id, title: product.title });
    }
  } catch (error) {
    logger.error('Error auto-activating auctions', error);
  }
});

// ─────────────────────────────────────────────────────────────────────
// CRON 3: Chạy mỗi 5 phút — Xóa sản phẩm bị REJECTED quá 6 tiếng
// ─────────────────────────────────────────────────────────────────────
cron.schedule('*/5 * * * *', async () => {
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

  try {
    // Tìm sản phẩm bị rejected quá 6 tiếng VÀ đã đạt giới hạn chỉnh sửa (editCount >= 2)
    // HOẶC rejected quá 6h và không được sửa lại
    const expiredRejected = await prisma.product.findMany({
      where: {
        approvalStatus: 'REJECTED',
        rejectedAt: { lte: sixHoursAgo },
        deletedAt: null // chưa bị xóa
      }
    });

    if (expiredRejected.length === 0) return;

    for (const product of expiredRejected) {
      // Hard delete (hoặc soft delete vĩnh viễn)
      await prisma.product.update({
        where: { id: product.id },
        data: { deletedAt: new Date(), status: 'CANCELLED' }
      });

      // Thông báo cho người bán
      await prisma.notification.create({
        data: {
          userId: product.sellerId,
          title: 'Sản phẩm đã bị xóa tự động',
          message: `Sản phẩm "${product.title}" đã bị xóa tự động do không được cập nhật trong vòng 6 giờ sau khi bị từ chối.`,
          type: 'SYSTEM'
        }
      });

      logger.info('Auto-deleted rejected product after 6h', { productId: product.id, title: product.title });
    }
  } catch (error) {
    logger.error('Error cleaning up rejected products', error);
  }
});


