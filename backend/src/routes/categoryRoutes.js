import express from 'express';
import prisma from '../models/db.js';
import { requireAuth, requireAdmin } from '../middlewares/authMiddleware.js';
import { slugify } from '../utils/slugify.js';

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

// POST /api/categories - Create a new category dynamically (Admin only)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { name, attributeKeys } = req.body;

  if (!name || name.trim() === "") {
    return res.status(400).json({
      success: false,
      error: "Tên danh mục không được để trống."
    });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      let slug = slugify(name);
      
      // Kiểm tra trùng lặp slug và thêm hậu tố nếu cần
      const existing = await tx.category.findUnique({
        where: { slug }
      });
      
      if (existing) {
        let suffix = 1;
        let checkSlug = `${slug}-${suffix}`;
        while (await tx.category.findUnique({ where: { slug: checkSlug } })) {
          suffix++;
          checkSlug = `${slug}-${suffix}`;
        }
        slug = checkSlug;
      }

      // Tạo danh mục kèm các attributeKeys
      const newCategory = await tx.category.create({
        data: {
          name: name.trim(),
          slug,
          attributeKeys: attributeKeys && Array.isArray(attributeKeys) ? {
            create: attributeKeys
              .filter(k => k.name && k.name.trim() !== "")
              .map(k => ({
                name: k.name.trim(),
                type: k.type || "TEXT"
              }))
          } : undefined
        },
        include: {
          attributeKeys: true
        }
      });

      return newCategory;
    });

    return res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "Đã xảy ra lỗi khi tạo danh mục mới."
    });
  }
});

// DELETE /api/categories/:id - Delete a category (Admin only)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const category = await prisma.category.findUnique({
      where: { id }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: "Không tìm thấy danh mục cần xóa."
      });
    }

    await prisma.category.delete({
      where: { id }
    });

    return res.status(200).json({
      success: true,
      message: `Đã xóa danh mục "${category.name}" thành công.`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "Đã xảy ra lỗi khi xóa danh mục."
    });
  }
});

export default router;

