import prisma from '../models/db.js';
import { calculateShippingFee } from '../services/shippingService.js';

/**
 * API Controller to estimate shipping fee for a product to a specific destination.
 * 
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const getEstimateFee = async (req, res) => {
  const productId = req.query.productId || req.body.productId;
  const toProvinceId = req.query.toProvinceId || req.body.toProvinceId;
  const toDistrictId = req.query.toDistrictId || req.body.toDistrictId;

  if (!productId) {
    return res.status(400).json({
      success: false,
      error: "Thiếu thông tin productId."
    });
  }

  if (!toProvinceId || !toDistrictId) {
    return res.status(400).json({
      success: false,
      error: "Thiếu thông tin điểm đến (toProvinceId hoặc toDistrictId)."
    });
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Không tìm thấy sản phẩm."
      });
    }

    const shippingFee = calculateShippingFee({
      product,
      toProvinceId,
      toDistrictId
    });

    return res.status(200).json({
      success: true,
      data: {
        productId,
        toProvinceId,
        toDistrictId,
        shippingFee: Number(shippingFee)
      },
      shippingFee: Number(shippingFee)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "Đã xảy ra lỗi khi tính toán phí vận chuyển."
    });
  }
};
