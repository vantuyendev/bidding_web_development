import cron from 'node-cron';
import prisma from '../models/db.js';
import { getShipmentStatusAsync, updateProductShippingLog } from '../services/shippingService.js';
import { triggerProductUpdate } from '../controllers/streamController.js';
import { logger } from '../utils/logger.js';

logger.info('Background shipping sync worker loaded');

// Chạy định kỳ mỗi 2 phút để đồng bộ lộ trình của các vận đơn đang giao hàng (SHIPPED)
cron.schedule('*/2 * * * *', async () => {
  logger.info('[Shipping Sync Worker] Bắt đầu đồng bộ lộ trình vận chuyển...');

  try {
    const activeShipments = await prisma.product.findMany({
      where: {
        status: 'SHIPPED',
        trackingCode: { not: null },
        deletedAt: null
      }
    });

    if (activeShipments.length === 0) {
      logger.info('[Shipping Sync Worker] Không có vận đơn nào cần đồng bộ.');
      return;
    }

    for (const product of activeShipments) {
      logger.info(`[Shipping Sync Worker] Đang kiểm tra mã vận đơn ${product.trackingCode} (${product.shippingCarrier})`);

      const syncResult = await getShipmentStatusAsync(
        product.trackingCode,
        product.shippingCarrier,
        product.createdAt
      );

      if (syncResult.success && syncResult.logs) {
        let hasNewLog = false;
        
        for (const log of syncResult.logs) {
          const updated = await updateProductShippingLog(
            product.id,
            log.status,
            log.description,
            new Date(log.time)
          );
          if (updated) {
            hasNewLog = true;
          }
        }

        // Nếu đối tác đã giao hàng thành công (DELIVERED hoặc 5), gửi thông báo cho Buyer
        const isDelivered = ['DELIVERED', '5', 'delivered'].includes(syncResult.currentStatus);
        if (isDelivered && hasNewLog) {
          await prisma.notification.create({
            data: {
              userId: product.winnerId,
              title: 'Đơn hàng đã được giao thành công',
              message: `Sản phẩm "${product.title}" đã được giao thành công. Vui lòng kiểm tra bưu kiện và bấm "Xác nhận nhận hàng" để giải ngân ký quỹ.`,
              type: 'SYSTEM'
            }
          });
          await prisma.notification.create({
            data: {
              userId: product.sellerId,
              title: 'Giao hàng thành công',
              message: `Đơn vị vận chuyển báo đã giao sản phẩm "${product.title}" thành công. Đang chờ người thắng cuộc xác nhận.`,
              type: 'SYSTEM'
            }
          });
        }

        if (hasNewLog) {
          triggerProductUpdate(product.id, Number(product.currentPrice), product.endTime.toISOString(), product.status);
        }
      }
    }
  } catch (err) {
    logger.error('[Shipping Sync Worker] Lỗi tiến trình đồng bộ:', err);
  }
});
