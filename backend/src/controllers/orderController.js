import prisma from '../models/db.js';
import { Prisma } from '@prisma/client';
import { calculateShippingFee } from '../services/shippingService.js';
import { triggerProductUpdate } from './streamController.js';
import ApiError from '../utils/ApiError.js';

// POST /api/products/:id/checkout
export const checkoutProduct = async (req, res, next) => {
  const userId = req.session?.userId;
  const { id: productId } = req.params;
  const { winnerName, winnerPhone, winnerAddress, toProvinceId, toDistrictId } = req.body;

  if (!userId) {
    return next(new ApiError(401, 'Bạn cần đăng nhập để thanh toán.'));
  }

  if (!winnerName || !winnerPhone || !winnerAddress || !toProvinceId || !toDistrictId) {
    return next(new ApiError(400, 'Vui lòng cung cấp đầy đủ thông tin giao hàng.'));
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Row-lock product - Tối ưu hóa selective SELECT thay vì SELECT *
      const products = await tx.$queryRaw`
        SELECT id, status, winner_id, weight, length, width, height, province_id, current_price, seller_id, title FROM "products" WHERE id = ${productId} FOR UPDATE
      `;
      if (!products || products.length === 0) {
        throw new ApiError(404, 'Sản phẩm không tồn tại.');
      }
      const product = products[0];

      if (product.status !== 'PENDING_PAYMENT') {
        throw new ApiError(400, 'Sản phẩm không ở trạng thái chờ thanh toán.');
      }

      if (product.winner_id !== userId) {
        throw new ApiError(403, 'Bạn không phải là người chiến thắng phiên đấu giá này.');
      }

      // Format product for calculateShippingFee service
      const productForFee = {
        weight: product.weight,
        length: product.length,
        width: product.width,
        height: product.height,
        provinceId: product.province_id
      };

      const shippingFee = calculateShippingFee({
        product: productForFee,
        toProvinceId,
        toDistrictId
      });

      const remainingAmount = new Prisma.Decimal(product.current_price).mul(0.9);
      const totalDue = remainingAmount.plus(shippingFee);

      // Lock user balance
      const buyer = await tx.user.findUnique({
        where: { id: userId },
        select: { walletBalance: true, frozenBalance: true }
      });

      if (!buyer) {
        throw new ApiError(404, 'Không tìm thấy người mua.');
      }

      if (new Prisma.Decimal(buyer.walletBalance).lt(totalDue)) {
        throw new ApiError(400, `Số dư ví không đủ để thanh toán 90% còn lại và phí ship (cần ${Number(totalDue).toLocaleString('vi-VN')} đ).`);
      }

      // Freeze 90% + shipping fee (moving from walletBalance to frozenBalance)
      await tx.user.update({
        where: { id: userId },
        data: {
          walletBalance: new Prisma.Decimal(buyer.walletBalance).minus(totalDue),
          frozenBalance: new Prisma.Decimal(buyer.frozenBalance).plus(totalDue)
        }
      });

      // Log transaction
      await tx.transaction.create({
        data: {
          userId,
          amount: totalDue,
          type: 'HOLD_ESCROW',
          status: 'COMPLETED',
          productId: product.id
        }
      });

      // Update product status, address info
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: {
          status: 'PAID',
          winnerName,
          winnerPhone,
          winnerAddress,
          shippingFee: shippingFee,
          provinceId: toProvinceId, // save destination province
          districtId: toDistrictId // save destination district
        }
      });

      // Create notification for seller
      await tx.notification.create({
        data: {
          userId: product.seller_id,
          title: 'Đơn hàng đã được thanh toán',
          message: `Người mua đã hoàn tất thanh toán 90% còn lại cho sản phẩm "${product.title}". Vui lòng tiến hành giao hàng.`,
          type: 'SYSTEM'
        }
      });

      return {
        product: updatedProduct,
        shippingFee: Number(shippingFee),
        totalDue: Number(totalDue)
      };
    });

    triggerProductUpdate(productId, Number(result.product.currentPrice), result.product.endTime.toISOString(), result.product.status);

    return res.status(200).json({
      success: true,
      message: 'Thanh toán 90% và phí ship thành công. Aura Bid đã đóng băng số tiền này để ký quỹ.',
      data: result
    });
  } catch (error) {
    return next(error);
  }
};

// POST /api/products/:id/ship
export const shipProduct = async (req, res, next) => {
  const userId = req.session?.userId;
  const { id: productId } = req.params;

  if (!userId) {
    return next(new ApiError(401, 'Yêu cầu đăng nhập.'));
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      throw new ApiError(404, 'Sản phẩm không tồn tại.');
    }

    if (product.sellerId !== userId) {
      throw new ApiError(403, 'Bạn không phải là người bán của sản phẩm này.');
    }

    if (product.status !== 'PAID') {
      throw new ApiError(400, 'Đơn hàng chưa được thanh toán hoặc đã giao.');
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: { status: 'SHIPPED' }
    });

    // Create notification for winner
    await prisma.notification.create({
      data: {
        userId: product.winnerId,
        title: 'Đơn hàng đang được giao',
        message: `Sản phẩm "${product.title}" đã được người bán gửi đi.`,
        type: 'SYSTEM'
      }
    });

    triggerProductUpdate(productId, Number(updatedProduct.currentPrice), updatedProduct.endTime.toISOString(), updatedProduct.status);

    return res.status(200).json({
      success: true,
      message: 'Xác nhận gửi hàng thành công.',
      data: updatedProduct
    });
  } catch (error) {
    return next(error);
  }
};

// POST /api/products/:id/receive
export const receiveProduct = async (req, res, next) => {
  const userId = req.session?.userId;
  const { id: productId } = req.params;

  if (!userId) {
    return next(new ApiError(401, 'Yêu cầu đăng nhập.'));
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId }
      });

      if (!product) {
        throw new ApiError(404, 'Sản phẩm không tồn tại.');
      }

      if (product.winnerId !== userId) {
        throw new ApiError(403, 'Bạn không phải là người mua đơn hàng này.');
      }

      if (product.status !== 'SHIPPED') {
        throw new ApiError(400, 'Đơn hàng chưa được vận chuyển hoặc đã hoàn tất.');
      }

      // Calculate total amount to transfer to seller (100% price + shipping fee)
      const currentPrice = new Prisma.Decimal(product.currentPrice);
      const shippingFee = new Prisma.Decimal(product.shippingFee || 0);
      const totalEscrow = currentPrice.plus(shippingFee);

      // Verify buyer frozen balance is enough
      const buyer = await tx.user.findUnique({
        where: { id: userId },
        select: { frozenBalance: true }
      });

      if (!buyer) {
        throw new ApiError(404, 'Không tìm thấy người mua.');
      }

      if (new Prisma.Decimal(buyer.frozenBalance).lt(totalEscrow)) {
        throw new ApiError(400, 'Lỗi đồng bộ: Số dư đóng băng của người mua không đủ.');
      }

      // Deduct from buyer frozen balance
      await tx.user.update({
        where: { id: userId },
        data: {
          frozenBalance: new Prisma.Decimal(buyer.frozenBalance).minus(totalEscrow)
        }
      });

      // Credit to seller walletBalance
      const seller = await tx.user.findUnique({
        where: { id: product.sellerId },
        select: { walletBalance: true }
      });
      if (!seller) {
        throw new ApiError(404, 'Không tìm thấy người bán.');
      }
      await tx.user.update({
        where: { id: product.sellerId },
        data: {
          walletBalance: new Prisma.Decimal(seller.walletBalance).plus(totalEscrow)
        }
      });

      // Log transaction logs
      await tx.transaction.create({
        data: {
          userId,
          amount: totalEscrow,
          type: 'PAYMENT',
          status: 'COMPLETED',
          productId: product.id
        }
      });
      await tx.transaction.create({
        data: {
          userId: product.sellerId,
          amount: totalEscrow,
          type: 'RELEASE_ESCROW',
          status: 'COMPLETED',
          productId: product.id
        }
      });

      // Update product status
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { status: 'COMPLETED' }
      });

      // Create notification for seller
      await tx.notification.create({
        data: {
          userId: product.sellerId,
          title: 'Giao dịch hoàn tất thành công',
          message: `Người mua đã xác nhận nhận hàng. Số tiền ${Number(totalEscrow).toLocaleString('vi-VN')} đ ký quỹ đã được giải ngân vào ví của bạn.`,
          type: 'SYSTEM'
        }
      });

      return updatedProduct;
    });

    triggerProductUpdate(productId, Number(result.currentPrice), result.endTime.toISOString(), result.status);

    return res.status(200).json({
      success: true,
      message: 'Xác nhận đã nhận hàng thành công. Số tiền ký quỹ đã được giải ngân cho người bán.',
      data: result
    });
  } catch (error) {
    return next(error);
  }
};
