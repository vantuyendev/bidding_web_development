import prisma from '../models/db.js';

// POST /api/watchlist - Thêm sản phẩm vào danh sách theo dõi của người dùng hiện tại
export const addToWatchlist = async (req, res) => {
  const userId = req.session?.userId;
  const { productId } = req.body;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Bạn cần đăng nhập để thực hiện.' });
  }

  if (!productId) {
    return res.status(400).json({ success: false, error: 'Thiếu thông tin productId.' });
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy sản phẩm.' });
    }

    const item = await prisma.watchlist.upsert({
      where: {
        userId_productId: {
          userId,
          productId
        }
      },
      update: {},
      create: {
        userId,
        productId
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Đã thêm sản phẩm vào danh sách yêu thích.',
      data: item
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Đã xảy ra lỗi khi thêm vào danh sách yêu thích.'
    });
  }
};

// DELETE /api/watchlist/:productId - Xóa sản phẩm khỏi danh sách theo dõi
export const removeFromWatchlist = async (req, res) => {
  const userId = req.session?.userId;
  const { productId } = req.params;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Bạn cần đăng nhập để thực hiện.' });
  }

  try {
    await prisma.watchlist.deleteMany({
      where: {
        userId,
        productId
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Đã xóa sản phẩm khỏi danh sách yêu thích.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Đã xảy ra lỗi khi xóa khỏi danh sách yêu thích.'
    });
  }
};

// GET /api/watchlist - Lấy sản phẩm trong danh sách theo dõi của người dùng hiện tại
export const getWatchlist = async (req, res) => {
  const userId = req.session?.userId;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Bạn cần đăng nhập để thực hiện.' });
  }

  try {
    const list = await prisma.watchlist.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            category: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedProducts = list.map(item => {
      const p = item.product;
      return p ? {
        ...p,
        startPrice: Number(p.startPrice),
        currentPrice: Number(p.currentPrice),
        buyNowPrice: p.buyNowPrice ? Number(p.buyNowPrice) : null,
        reservePrice: p.reservePrice ? Number(p.reservePrice) : null
      } : null;
    }).filter(Boolean);

    return res.status(200).json({
      success: true,
      data: formattedProducts
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Đã xảy ra lỗi khi tải danh sách yêu thích.'
    });
  }
};
