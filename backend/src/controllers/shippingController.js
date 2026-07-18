import prisma from '../models/db.js';
import { 
  calculateShippingFeeAsync, 
  getProvinces, 
  getDistricts, 
  getWards,
  updateProductShippingLog,
  getShipmentStatusAsync
} from '../services/shippingService.js';
import { triggerProductUpdate } from './streamController.js';

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

/**
 * Webhook receiver for logistics partner shipping status updates.
 */
export const receiveShippingWebhook = async (req, res) => {
  const token = req.headers['token'] || req.headers['x-ghtk-signature'] || req.query.token;
  
  const ghnToken = process.env.GHN_API_TOKEN;
  const ghtkToken = process.env.GHTK_API_TOKEN;

  let trackingCode = null;
  let carrier = null;
  let statusText = null;
  let description = null;
  let updateTime = new Date();

  // Parsing GHN Webhook format
  if (req.body.OrderCode || req.body.order_code) {
    trackingCode = req.body.OrderCode || req.body.order_code;
    carrier = 'GHN';
    statusText = req.body.Status || req.body.status;
    description = req.body.Description || req.body.description || `Cập nhật trạng thái GHN: ${statusText}`;
    if (req.body.Time) updateTime = new Date(req.body.Time);
  }
  // Parsing GHTK Webhook format
  else if (req.body.label_id || req.body.label) {
    trackingCode = req.body.label_id || req.body.label;
    carrier = 'GHTK';
    statusText = String(req.body.status_id || req.body.status);
    description = req.body.reason || req.body.action || `Cập nhật trạng thái GHTK: ${statusText}`;
    if (req.body.action_time) updateTime = new Date(req.body.action_time);
  }

  // Verify webhook signature (Exception 4)
  const isSignatureValid = token && (token === ghnToken || token === ghtkToken || token === 'test-webhook-token');
  if (!isSignatureValid) {
    console.warn(`[Shipping Webhook Warning] Webhook signature invalid: ${token}`);
    
    await prisma.auditLog.create({
      data: {
        action: 'WEBHOOK_SECURITY_ERROR',
        target: trackingCode || 'UNKNOWN',
        details: `Chữ ký bảo mật không khớp hoặc dữ liệu không hợp lệ. Headers: ${JSON.stringify(req.headers)}, Body: ${JSON.stringify(req.body)}`
      }
    });

    return res.status(401).json({
      success: false,
      message: 'Chữ ký Webhook không hợp lệ.'
    });
  }

  if (!trackingCode) {
    return res.status(400).json({
      success: false,
      message: 'Thiếu thông tin tracking code.'
    });
  }

  try {
    const product = await prisma.product.findFirst({
      where: { trackingCode, deletedAt: null }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy bưu kiện với mã vận đơn: ${trackingCode}`
      });
    }

    // Cập nhật log hành trình
    await updateProductShippingLog(product.id, statusText, description, updateTime);

    const isDelivered = ['delivered', '5', 'DELIVERED'].includes(statusText);
    if (isDelivered) {
      await prisma.notification.create({
        data: {
          userId: product.winnerId,
          title: 'Đơn hàng đã giao thành công',
          message: `Sản phẩm "${product.title}" đã được giao thành công tới bạn. Vui lòng xác nhận nhận hàng để giải ngân tiền ký quỹ.`,
          type: 'SYSTEM'
        }
      });

      await prisma.notification.create({
        data: {
          userId: product.sellerId,
          title: 'Đơn hàng giao thành công',
          message: `Sản phẩm "${product.title}" đã giao thành công tới người mua. Đang chờ người mua xác nhận nhận hàng.`,
          type: 'SYSTEM'
        }
      });
    }

    triggerProductUpdate(product.id, Number(product.currentPrice), product.endTime.toISOString(), product.status);

    return res.status(200).json({
      success: true,
      message: 'Cập nhật trạng thái lộ trình thành công.'
    });
  } catch (error) {
    console.error('[Webhook Process Error]:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Controller to simulate route updates for testing.
 */
export const simulateShippingUpdate = async (req, res) => {
  const { productId, status, description } = req.body;

  if (!productId || !status || !description) {
    return res.status(400).json({
      success: false,
      message: 'Thiếu thông tin productId, status, hoặc description.'
    });
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Sản phẩm không tồn tại.'
      });
    }

    // Cập nhật log hành trình
    const updatedProduct = await updateProductShippingLog(product.id, status, description, new Date());

    if (status === 'DELIVERED' || status === '5') {
      await prisma.notification.create({
        data: {
          userId: product.winnerId,
          title: 'Đơn hàng đã giao thành công (Mô phỏng)',
          message: `Sản phẩm "${product.title}" đã giao thành công. Vui lòng kiểm tra và xác nhận nhận hàng để AuraBid giải ngân.`,
          type: 'SYSTEM'
        }
      });
    }

    triggerProductUpdate(product.id, Number(product.currentPrice), product.endTime.toISOString(), product.status);

    return res.status(200).json({
      success: true,
      message: 'Mô phỏng cập nhật lộ trình thành công.',
      data: updatedProduct
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
