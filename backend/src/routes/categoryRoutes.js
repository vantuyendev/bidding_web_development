import express from 'express';
import prisma from '../models/db.js';

const router = express.Router();

// GET /api/categories - Get all categories in the system
router.get('/', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        attributeKeys: true
      },
      orderBy: { name: 'asc' }
    });
    return res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "Đã xảy ra lỗi khi lấy danh sách danh mục."
    });
  }
});

export default router;
