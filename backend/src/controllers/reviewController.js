import prisma from '../models/db.js';

// POST /api/reviews - Tạo đánh giá cho giao dịch sản phẩm đã kết thúc
export const createReview = async (req, res) => {
  const reviewerId = req.session.userId;
  const { productId, rating, comment } = req.body;

  if (!productId) {
    return res.status(400).json({
      success: false,
      error: 'Vui lòng cung cấp mã sản phẩm (productId).'
    });
  }

  const ratingVal = parseInt(rating, 10);
  if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 5) {
    return res.status(400).json({
      success: false,
      error: 'Đánh giá (rating) phải là số nguyên từ 1 đến 5 sao.'
    });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Lấy thông tin sản phẩm
      const product = await tx.product.findUnique({
        where: { id: productId }
      });

      if (!product) {
        throw new Error('Sản phẩm không tồn tại.');
      }

      // 2. Xác minh trạng thái là ĐÃ HOÀN THÀNH
      if (product.status !== 'COMPLETED') {
        throw new Error('Chỉ có thể đánh giá đối tác sau khi đã hoàn thành nhận hàng.');
      }

      // 3. Tìm lượt đấu giá cao nhất để xác định người thắng (Người mua)
      const highestBid = await tx.bid.findFirst({
        where: { productId },
        orderBy: { bidAmount: 'desc' }
      });

      const isSeller = product.sellerId === reviewerId;
      const isWinner = highestBid && highestBid.userId === reviewerId;

      if (!isSeller && !isWinner) {
        throw new Error('Bạn không có quyền đánh giá sản phẩm này. Chỉ người bán hoặc người mua thắng cuộc mới được quyền đánh giá.');
      }

      // 4. Đảm bảo sản phẩm chưa được đánh giá
      const existingReview = await tx.review.findUnique({
        where: { productId }
      });

      if (existingReview) {
        throw new Error('Giao dịch của sản phẩm này đã được đánh giá trước đó.');
      }

      // 5. Xác định người dùng mục tiêu (người nhận đánh giá)
      const targetUserId = isWinner ? product.sellerId : highestBid.userId;

      // 6. Tạo đánh giá
      const review = await tx.review.create({
        data: {
          reviewerId,
          targetUserId,
          productId,
          rating: ratingVal,
          comment: comment || null
        }
      });

      // 7. Tính toán lại điểm uy tín của người dùng mục tiêu
      const reviews = await tx.review.aggregate({
        where: { targetUserId },
        _avg: { rating: true }
      });

      const newReputation = reviews._avg.rating || 5.0;

      await tx.user.update({
        where: { id: targetUserId },
        data: { reputationScore: newReputation }
      });

      return review;
    });

    return res.status(201).json({
      success: true,
      message: 'Gửi đánh giá đối tác thành công!',
      data: result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message || 'Đã xảy ra lỗi khi tạo đánh giá.'
    });
  }
};
