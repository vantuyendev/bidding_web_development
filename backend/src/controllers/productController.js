import prisma from '../models/db.js';
import ApiError from '../utils/ApiError.js';
import { slugify } from '../utils/slugify.js';

// GET /api/products - Get all products in the database (with query optimization)
export const getProducts = async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { startTime: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        startPrice: true,
        currentPrice: true,
        buyNowPrice: true,
        startTime: true,
        endTime: true,
        status: true,
        categoryId: true,
        sellerId: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        seller: {
          select: {
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            bids: true
          }
        }
      }
    });

    // Convert Decimals to numbers for easier consumption on frontend
    const formattedProducts = products.map((product) => ({
      ...product,
      startPrice: Number(product.startPrice),
      currentPrice: Number(product.currentPrice),
      buyNowPrice: product.buyNowPrice ? Number(product.buyNowPrice) : null,
      bidCount: product._count?.bids ?? 0,
      sellerName: product.seller?.name || product.seller?.email || null,
      categoryName: product.category?.name || null,
      categorySlug: product.category?.slug || null
    }));

    return res.status(200).json({
      success: true,
      data: formattedProducts,
    });
  } catch (error) {
    return next(error);
  }
};

// GET /api/products/:id - Get a product by ID (enriched with EAV specs, bids, seller, etc.)
export const getProductDetail = async (req, res, next) => {
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
      throw new ApiError(404, "Không tìm thấy sản phẩm.");
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
    return next(error);
  }
};

// GET /api/products/categories/:categorySlug/filters - Get dynamic filters for a category
export const getCategoryFilters = async (req, res, next) => {
  const { categorySlug } = req.params;

  try {
    const category = await prisma.category.findUnique({
      where: { slug: categorySlug },
      include: {
        attributeKeys: true,
      },
    });

    if (!category) {
      throw new ApiError(404, "Không tìm thấy danh mục ngành hàng.");
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
    return next(error);
  }
};

// GET /api/products/search - Search products with dynamic EAV filters (with query optimization)
export const searchProducts = async (req, res, next) => {
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
        select: {
          id: true,
          title: true,
          description: true,
          imageUrl: true,
          startPrice: true,
          currentPrice: true,
          buyNowPrice: true,
          startTime: true,
          endTime: true,
          status: true,
          categoryId: true,
          sellerId: true,
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
    return next(error);
  }
};

// POST /api/products - Create a new product for bidding (Seller only)
export const createProduct = async (req, res, next) => {
  try {
    const userId = req.session.userId;

    // 1. Kiểm duyệt quyền Người bán
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.isVerifiedSeller === false) {
      throw new ApiError(403, 'Bạn cần xác minh tài khoản để trở thành Người bán hợp lệ trước khi đăng bài.');
    }

    // 2. Xử lý dữ liệu đầu vào
    const {
      title,
      description,
      imageUrl,
      startPrice,
      buyNowPrice,
      reservePrice,
      stepPrice,
      categoryId,
      newCategoryName,
      endTime,
      weight,
      length,
      width,
      height,
      provinceId,
      districtId,
      attributes, // expects array or object map
    } = req.body;

    // Gán currentPrice bằng đúng với startPrice, sellerId ép cứng từ session
    const product = await prisma.$transaction(async (tx) => {
      let actualCategoryId = categoryId;
      
      // Nếu là tạo danh mục mới
      if (categoryId === 'new' && newCategoryName) {
        let slug = slugify(newCategoryName);
        
        // Kiểm tra trùng lặp slug
        let existingCategory = await tx.category.findUnique({
          where: { slug }
        });
        
        if (existingCategory) {
          let suffix = 1;
          let checkSlug = `${slug}-${suffix}`;
          while (await tx.category.findUnique({ where: { slug: checkSlug } })) {
            suffix++;
            checkSlug = `${slug}-${suffix}`;
          }
          slug = checkSlug;
        }

        const newCategory = await tx.category.create({
          data: {
            name: newCategoryName.trim(),
            slug
          }
        });
        actualCategoryId = newCategory.id;
      }

      // Xử lý các attributes động (cả có sẵn và tạo mới tên khoá)
      const parsedAttributes = [];
      if (attributes) {
        const attributeList = Array.isArray(attributes)
          ? attributes
          : typeof attributes === 'object'
            ? Object.entries(attributes).map(([keyId, val]) => ({ attributeKeyId: keyId, value: val }))
            : [];

        for (const attr of attributeList) {
          if (attr.value === undefined || attr.value === null || String(attr.value).trim() === '') continue;

          let keyId = attr.attributeKeyId;
          
          // Nếu thuộc tính động tự do (chỉ có tên khoá attributeKeyName mà chưa có ID)
          if (!keyId && attr.attributeKeyName) {
            let key = await tx.attributeKey.findFirst({
              where: {
                categoryId: actualCategoryId,
                name: { equals: attr.attributeKeyName.trim(), mode: 'insensitive' }
              }
            });
            
            if (!key) {
              key = await tx.attributeKey.create({
                data: {
                  categoryId: actualCategoryId,
                  name: attr.attributeKeyName.trim(),
                  type: attr.attributeKeyType || 'TEXT'
                }
              });
            }
            keyId = key.id;
          }

          if (keyId) {
            parsedAttributes.push({
              attributeKeyId: keyId,
              value: String(attr.value).trim()
            });
          }
        }
      }

      const prod = await tx.product.create({
        data: {
          title,
          description,
          imageUrl: imageUrl || undefined,
          startPrice: Number(startPrice),
          currentPrice: Number(startPrice),
          buyNowPrice: buyNowPrice ? Number(buyNowPrice) : null,
          reservePrice: reservePrice ? Number(reservePrice) : null,
          stepPrice: stepPrice ? Number(stepPrice) : undefined,
          categoryId: actualCategoryId,
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

      // Tạo Audit Log cho Product Creation
      await tx.auditLog.create({
        data: {
          userId,
          action: 'CREATE_PRODUCT',
          target: prod.id,
          ipAddress: req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || null,
          userAgent: req.headers['user-agent'] || null,
          details: JSON.stringify({
            title: prod.title,
            startPrice: Number(prod.startPrice)
          })
        }
      });

      return prod;
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
    return next(error);
  }
};

// GET /api/products/:id/bids - Get bid history for a product
export const getProductBids = async (req, res, next) => {
  const { id } = req.params;

  try {
    const bids = await prisma.bid.findMany({
      where: { productId: id },
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
    });

    const formattedBids = bids.map(bid => ({
      ...bid,
      bidAmount: Number(bid.bidAmount),
      maxAutoBidAmount: bid.maxAutoBidAmount ? Number(bid.maxAutoBidAmount) : null,
      user: {
        id: bid.user.id,
        email: bid.user.email
      }
    }));

    return res.status(200).json({
      success: true,
      data: formattedBids
    });
  } catch (error) {
    return next(error);
  }
};

