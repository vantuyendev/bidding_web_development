import prisma from '../models/db.js';

// POST /api/reviews - Create a review for an ended product transaction
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
      // 1. Fetch product
      const product = await tx.product.findUnique({
        where: { id: productId }
      });

      if (!product) {
        throw new Error('Sản phẩm không tồn tại.');
      }

      // 2. Verify status is ENDED
      if (product.status !== 'ENDED') {
        throw new Error('Chỉ có thể đánh giá sản phẩm sau khi phiên đấu giá đã kết thúc.');
      }

      // 3. Find highest bid to identify the winner (Buyer)
      const highestBid = await tx.bid.findFirst({
        where: { productId },
        orderBy: { bidAmount: 'desc' }
      });

      const isSeller = product.sellerId === reviewerId;
      const isWinner = highestBid && highestBid.userId === reviewerId;

      if (!isSeller && !isWinner) {
        throw new Error('Bạn không có quyền đánh giá sản phẩm này. Chỉ người bán hoặc người mua thắng cuộc mới được quyền đánh giá.');
      }

      // 4. Ensure product hasn't been reviewed yet
      const existingReview = await tx.review.findUnique({
        where: { productId }
      });

      if (existingReview) {
        throw new Error('Giao dịch của sản phẩm này đã được đánh giá trước đó.');
      }

      // 5. Determine target user (who receives the review)
      const targetUserId = isWinner ? product.sellerId : highestBid.userId;

      // 6. Create the review
      const review = await tx.review.create({
        data: {
          reviewerId,
          targetUserId,
          productId,
          rating: ratingVal,
          comment: comment || null
        }
      });

      // 7. Recalculate target user's reputation score
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
