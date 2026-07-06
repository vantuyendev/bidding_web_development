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

// GET /api/products/:id - Get a product by ID (enriched with EAV specs, bids, seller, etc.)
export const getProductDetail = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        attributes: {
          include: {
            attributeKey: true
          }
        },
        bids: {
          include: {
            user: {
              select: {
                id: true,
                email: true
              }
            }
          },
          orderBy: {
            bidTime: 'desc'
          }
        },
        seller: {
          select: {
            id: true,
            email: true,
            reputationScore: true,
            isVerifiedSeller: true,
            _count: {
              select: {
                soldProducts: true
              }
            }
          }
        }
      }
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
      reservePrice: product.reservePrice ? Number(product.reservePrice) : null,
      stepPrice: Number(product.stepPrice),
      shippingFee: product.shippingFee ? Number(product.shippingFee) : null,
      weight: Number(product.weight),
      attributes: product.attributes ? product.attributes.map(attr => ({
        keyId: attr.attributeKeyId,
        keyName: attr.attributeKey.name,
        keyType: attr.attributeKey.type,
        value: attr.value
      })) : [],
      bids: product.bids ? product.bids.map(bid => ({
        ...bid,
        bidAmount: Number(bid.bidAmount),
        maxAutoBidAmount: bid.maxAutoBidAmount ? Number(bid.maxAutoBidAmount) : null,
        user: {
          id: bid.user.id,
          email: bid.user.email
        }
      })) : [],
      seller: product.seller ? {
        ...product.seller,
        reputationScore: Number(product.seller.reputationScore),
        soldCount: product.seller._count.soldProducts
      } : null
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

// POST /api/products - Create a new product for bidding (Seller only)
export const createProduct = async (req, res) => {
  try {
    const userId = req.session.userId;

    // 1. Kiểm duyệt quyền Người bán
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.isVerifiedSeller === false) {
      return res.status(403).json({
        success: false,
        error: 'Bạn cần xác minh tài khoản để trở thành Người bán hợp lệ trước khi đăng bài.',
      });
    }

    // 2. Xử lý dữ liệu đầu vào
    const {
      title,
      description,
      startPrice,
      buyNowPrice,
      reservePrice,
      stepPrice,
      categoryId,
      endTime,
      weight,
      length,
      width,
      height,
      provinceId,
      districtId,
      attributes, // expects array or object map
    } = req.body;

    // Parse attributes correctly
    let parsedAttributes = [];
    if (attributes) {
      if (Array.isArray(attributes)) {
        parsedAttributes = attributes.filter(a => a.attributeKeyId && a.value !== undefined && a.value !== null && a.value !== '');
      } else if (typeof attributes === 'object') {
        parsedAttributes = Object.entries(attributes)
          .filter(([_, val]) => val !== undefined && val !== null && val !== '')
          .map(([keyId, val]) => ({
            attributeKeyId: keyId,
            value: String(val)
          }));
      }
    }

    // Gán currentPrice bằng đúng với startPrice, sellerId ép cứng từ session
    const product = await prisma.product.create({
      data: {
        title,
        description,
        startPrice: Number(startPrice),
        currentPrice: Number(startPrice),
        buyNowPrice: buyNowPrice ? Number(buyNowPrice) : null,
        reservePrice: reservePrice ? Number(reservePrice) : null,
        stepPrice: stepPrice ? Number(stepPrice) : undefined,
        categoryId,
        endTime: new Date(endTime),
        weight: weight ? Number(weight) : undefined,
        length: length ? Number(length) : undefined,
        width: width ? Number(width) : undefined,
        height: height ? Number(height) : undefined,
        provinceId: provinceId || undefined,
        districtId: districtId || undefined,
        sellerId: userId,
        attributes: parsedAttributes.length > 0 ? {
          create: parsedAttributes
        } : undefined
      },
    });

    // Format response (convert Decimals to numbers for frontend consumption)
    const formattedProduct = {
      ...product,
      startPrice: Number(product.startPrice),
      currentPrice: Number(product.currentPrice),
      buyNowPrice: product.buyNowPrice ? Number(product.buyNowPrice) : null,
      reservePrice: product.reservePrice ? Number(product.reservePrice) : null,
      stepPrice: Number(product.stepPrice),
    };

    return res.status(201).json({
      success: true,
      data: formattedProduct,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Đã xảy ra lỗi khi tạo sản phẩm.',
    });
  }
};

