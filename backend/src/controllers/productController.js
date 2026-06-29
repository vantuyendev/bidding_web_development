import prisma from '../models/db.js';

export const getProductDetail = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Không tìm thấy sản phẩm."
      });
    }

    // Convert Decimals to numbers for easier consumption on frontend
    const formattedProduct = {
      ...product,
      startPrice: Number(product.startPrice),
      currentPrice: Number(product.currentPrice),
      buyNowPrice: product.buyNowPrice ? Number(product.buyNowPrice) : null,
    };

    return res.status(200).json({
      success: true,
      data: formattedProduct
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "Đã xảy ra lỗi không xác định."
    });
  }
};
