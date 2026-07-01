import prisma from '../models/db.js';

// GET /api/products - Get all products in the database
export const getProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { startTime: 'desc' },
    });

    // Convert Decimals to numbers for easier consumption on frontend
    const formattedProducts = products.map((product) => ({
      ...product,
      startPrice: Number(product.startPrice),
      currentPrice: Number(product.currentPrice),
      buyNowPrice: product.buyNowPrice ? Number(product.buyNowPrice) : null,
    }));

    return res.status(200).json({
      success: true,
      data: formattedProducts,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "Đã xảy ra lỗi không xác định.",
    });
  }
};

// GET /api/products/:id - Get a product by ID
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

// GET /api/products/categories/:categorySlug/filters - Get dynamic filters for a category
export const getCategoryFilters = async (req, res) => {
  const { categorySlug } = req.params;

  try {
    const category = await prisma.category.findUnique({
      where: { slug: categorySlug },
      include: {
        attributeKeys: true,
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: "Không tìm thấy danh mục ngành hàng."
      });
    }

    // Dynamically retrieve unique options for each attribute key to aid front-end filter generation
    const filtersWithOptions = await Promise.all(category.attributeKeys.map(async (key) => {
      const uniqueValues = await prisma.productAttribute.findMany({
        where: { attributeKeyId: key.id },
        select: { value: true },
        distinct: ['value'],
      });
      return {
        id: key.id,
        name: key.name,
        type: key.type,
        options: uniqueValues.map(v => v.value),
      };
    }));

    return res.status(200).json({
      success: true,
      data: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        filters: filtersWithOptions,
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "Đã xảy ra lỗi không xác định."
    });
  }
};

// GET /api/products/search - Search products with dynamic EAV filters
export const searchProducts = async (req, res) => {
  try {
    const { q, query, categorySlug, categoryId, page = 1, limit = 10 } = req.query;

    const andConditions = [];

    // 1. Text Search (title / description)
    const searchText = query || q;
    if (searchText) {
      andConditions.push({
        OR: [
          { title: { contains: searchText, mode: 'insensitive' } },
          { description: { contains: searchText, mode: 'insensitive' } }
        ]
      });
    }

    // 2. Category filter
    if (categorySlug) {
      andConditions.push({
        category: {
          slug: categorySlug
        }
      });
    } else if (categoryId) {
      andConditions.push({
        categoryId: categoryId
      });
    }

    // 3. Dynamic EAV attributes filtering
    let parsedFilters = {};
    if (req.query.filters) {
      try {
        parsedFilters = typeof req.query.filters === 'string' 
          ? JSON.parse(req.query.filters) 
          : req.query.filters;
      } catch (e) {
        console.error("Lỗi giải mã JSON filters:", e);
      }
    } else {
      // Treat custom query parameters as filters
      const standardParams = ['query', 'q', 'categorySlug', 'categoryId', 'page', 'limit', 'sortBy', 'sortOrder'];
      for (const [key, val] of Object.entries(req.query)) {
        if (!standardParams.includes(key) && val !== undefined && val !== null && val !== '') {
          parsedFilters[key] = val;
        }
      }
    }

    // Convert dynamic attribute filters to Prisma AND some conditions
    for (const [key, val] of Object.entries(parsedFilters)) {
      if (val === undefined || val === null || val === '') continue;

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);

      // Support array filtering (e.g. ram=["8GB", "16GB"] or ram=8GB,16GB)
      const values = Array.isArray(val) 
        ? val 
        : typeof val === 'string' && val.includes(',')
          ? val.split(',').map(s => s.trim())
          : [String(val)];

      if (isUuid) {
        andConditions.push({
          attributes: {
            some: {
              attributeKeyId: key,
              value: { in: values }
            }
          }
        });
      } else {
        andConditions.push({
          attributes: {
            some: {
              attributeKey: {
                name: { equals: key, mode: 'insensitive' }
              },
              value: { in: values }
            }
          }
        });
      }
    }

    // 4. Pagination & Query execution
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const whereClause = andConditions.length > 0 ? { AND: andConditions } : {};

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        include: {
          category: true,
          attributes: {
            include: {
              attributeKey: true
            }
          }
        },
        skip,
        take: limitNum,
        orderBy: { startTime: 'desc' },
      }),
      prisma.product.count({
        where: whereClause
      })
    ]);

    // Format products response
    const formattedProducts = products.map((product) => ({
      ...product,
      startPrice: Number(product.startPrice),
      currentPrice: Number(product.currentPrice),
      buyNowPrice: product.buyNowPrice ? Number(product.buyNowPrice) : null,
      reservePrice: product.reservePrice ? Number(product.reservePrice) : null,
      stepPrice: Number(product.stepPrice),
      attributes: product.attributes.map(attr => ({
        keyId: attr.attributeKeyId,
        keyName: attr.attributeKey.name,
        keyType: attr.attributeKey.type,
        value: attr.value
      }))
    }));

    return res.status(200).json({
      success: true,
      data: formattedProducts,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "Đã xảy ra lỗi không xác định."
    });
  }
};

