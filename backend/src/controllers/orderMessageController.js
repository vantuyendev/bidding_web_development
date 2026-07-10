import prisma from '../models/db.js';
import productEvents from '../utils/eventEmitter.js';

// GET /api/orders/:id/messages
export const getOrderMessages = async (req, res) => {
  const userId = req.session?.userId;
  const { id: productId } = req.params;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Bạn cần đăng nhập để xem tin nhắn.' });
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({ success: false, error: 'Sản phẩm không tồn tại.' });
    }

    if (!product.winnerId) {
      return res.status(403).json({ success: false, error: 'Phiên đấu giá chưa kết thúc hoặc không có người thắng.' });
    }

    const isWinner = product.winnerId === userId;
    const isSeller = product.sellerId === userId;

    if (!isWinner && !isSeller) {
      return res.status(403).json({ success: false, error: 'Bạn không có quyền truy cập đoạn chat của đơn hàng này.' });
    }

    const messages = await prisma.orderMessage.findMany({
      where: { productId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    return res.status(200).json({
      success: true,
      data: messages
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Đã xảy ra lỗi khi lấy tin nhắn.'
    });
  }
};

// POST /api/orders/:id/messages
export const createOrderMessage = async (req, res) => {
  const userId = req.session?.userId;
  const { id: productId } = req.params;
  const { message } = req.body;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Bạn cần đăng nhập để gửi tin nhắn.' });
  }

  if (!message || message.trim() === '') {
    return res.status(400).json({ success: false, error: 'Nội dung tin nhắn không được để trống.' });
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({ success: false, error: 'Sản phẩm không tồn tại.' });
    }

    if (!product.winnerId) {
      return res.status(403).json({ success: false, error: 'Phiên đấu giá chưa kết thúc hoặc không có người thắng.' });
    }

    const isWinner = product.winnerId === userId;
    const isSeller = product.sellerId === userId;

    if (!isWinner && !isSeller) {
      return res.status(403).json({ success: false, error: 'Bạn không có quyền gửi tin nhắn trong đơn hàng này.' });
    }

    // Block sending messages if status is completed, cancelled, or unsold
    if (['COMPLETED', 'CANCELLED', 'UNSOLD', 'ENDED'].includes(product.status)) {
      return res.status(400).json({
        success: false,
        error: 'Giao dịch đã kết thúc hoặc bị hủy. Không thể gửi thêm tin nhắn mới.'
      });
    }

    const newMessage = await prisma.orderMessage.create({
      data: {
        productId,
        senderId: userId,
        message: message.trim()
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    // Real-time SSE notify
    productEvents.emit(`update-${productId}`, { chatMessage: newMessage });

    return res.status(201).json({
      success: true,
      data: newMessage
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Đã xảy ra lỗi khi gửi tin nhắn.'
    });
  }
};
