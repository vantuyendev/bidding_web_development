import express from 'express';
import prisma from '../models/db.js';
import { requireAuth, requireAdmin } from '../middlewares/authMiddleware.js';
import { slugify } from '../utils/slugify.js';
import { memoryCache } from '../utils/cache.js';
import ApiError from '../utils/ApiError.js';

const router = express.Router();

// GET /api/categories - Get all categories in the system (with in-memory caching)
router.get('/', async (req, res, next) => {
  try {
    // 1. Kiểm tra dữ liệu trong bộ nhớ đệm (Cache)
    const cachedCategories = memoryCache.get('categories_list');
    if (cachedCategories) {
      return res.status(200).json({
        success: true,
        data: cachedCategories
      });
    }

    // 2. Nếu không có cache, truy vấn từ database
    const categories = await prisma.category.findMany({
      include: {
        attributeKeys: true
      },
      orderBy: { name: 'asc' }
    });

    // 3. Lưu kết quả vào bộ nhớ đệm với TTL = 15 phút (900.000 ms)
    memoryCache.set('categories_list', categories, 15 * 60 * 1000);

    return res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    return next(error);
  }
});

// POST /api/categories - Create a new category dynamically (Admin only)
router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  const { name, attributeKeys } = req.body;

  if (!name || name.trim() === "") {
    return next(new ApiError(400, "Tên danh mục không được để trống."));
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

    // 4. Xóa cache danh mục để cập nhật danh sách mới
    memoryCache.delete('categories_list');

    return res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    return next(error);
  }
});

// DELETE /api/categories/:id - Delete a category (Admin only)
router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  const { id } = req.params;

  try {
    const category = await prisma.category.findUnique({
      where: { id }
    });

    if (!category) {
      throw new ApiError(404, "Không tìm thấy danh mục cần xóa.");
    }

    await prisma.category.delete({
      where: { id }
    });

    // 5. Xóa cache danh mục để cập nhật danh sách mới sau khi xóa
    memoryCache.delete('categories_list');

    return res.status(200).json({
      success: true,
      message: `Đã xóa danh mục "${category.name}" thành công.`
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
