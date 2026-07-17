import prisma from '../models/db.js';
import { 
  calculateShippingFeeAsync, 
  getProvinces, 
  getDistricts, 
  getWards 
} from '../services/shippingService.js';

/**
 * API Controller to estimate shipping fee for a product to a specific destination.
 * Support multiple carriers: GHN and GHTK
 * 
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const getEstimateFee = async (req, res) => {
  const productId = req.query.productId || req.body.productId;
  const toProvinceId = req.query.toProvinceId || req.body.toProvinceId;
  const toDistrictId = req.query.toDistrictId || req.body.toDistrictId;
  const toWardId = req.query.toWardId || req.body.toWardId;

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

    // Calculate GHN Estimate
    const ghnFee = await calculateShippingFeeAsync({
      product,
      toProvinceId,
      toDistrictId,
      toWardId,
      carrier: 'GHN'
    });

    // Calculate GHTK Estimate
    const ghtkFee = await calculateShippingFeeAsync({
      product,
      toProvinceId,
      toDistrictId,
      toWardId,
      carrier: 'GHTK'
    });

    return res.status(200).json({
      success: true,
      estimates: [
        { carrier: 'GHN', name: 'Giao Hàng Nhanh (GHN Sandbox)', fee: Number(ghnFee) },
        { carrier: 'GHTK', name: 'Giao Hàng Tiết Kiệm (GHTK Sandbox)', fee: Number(ghtkFee) }
      ],
      // Maintain backward compatibility for clients expecting single shippingFee field
      shippingFee: Number(ghnFee)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "Đã xảy ra lỗi khi tính toán phí vận chuyển."
    });
  }
};

/**
 * API Controller to fetch provinces
 */
export const getProvincesController = async (req, res) => {
  try {
    const data = await getProvinces();
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "Đã xảy ra lỗi khi tải danh sách Tỉnh/Thành."
    });
  }
};

/**
 * API Controller to fetch districts by province ID
 */
export const getDistrictsController = async (req, res) => {
  const provinceId = req.query.provinceId;

  if (!provinceId) {
    return res.status(400).json({
      success: false,
      error: "Thiếu thông tin provinceId."
    });
  }

  try {
    const data = await getDistricts(provinceId);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "Đã xảy ra lỗi khi tải danh sách Quận/Huyện."
    });
  }
};

/**
 * API Controller to fetch wards by district ID
 */
export const getWardsController = async (req, res) => {
  const districtId = req.query.districtId;

  if (!districtId) {
    return res.status(400).json({
      success: false,
      error: "Thiếu thông tin districtId."
    });
  }

  try {
    const data = await getWards(districtId);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "Đã xảy ra lỗi khi tải danh sách Phường/Xã."
    });
  }
};
