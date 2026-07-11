import prisma from '../models/db.js';
import ApiError from '../utils/ApiError.js';
import { slugify } from '../utils/slugify.js';

// GET /api/products - Get all products in the database (with query optimization)
export const getProducts = async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        approvalStatus: 'APPROVED',
        status: 'ACTIVE',
        endTime: { gt: new Date() },
        deletedAt: null
      },
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
        approvalStatus: true,
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
        },
        review: true
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
      } : null,
      review: product.review || null
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

    // Only return approved and active products that haven't ended yet
    andConditions.push({
      approvalStatus: 'APPROVED',
      status: 'ACTIVE',
      endTime: { gt: new Date() },
      deletedAt: null
    });

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
      startTime, // NEW: seller-chosen start time
      endTime,
      weight,
      length,
      width,
      height,
      provinceId,
      districtId,
      attributes, // expects array or object map
    } = req.body;

    // Validate endTime: max 48 hours from startTime
    const chosenStart = startTime ? new Date(startTime) : new Date();
    const chosenEnd = new Date(endTime);
    const maxEndTime = new Date(chosenStart.getTime() + 48 * 60 * 60 * 1000);
    if (chosenEnd > maxEndTime) {
      throw new ApiError(400, 'Thời gian kết thúc đấu giá không được vượt quá 48 giờ kể từ thời điểm bắt đầu.');
    }
    if (chosenEnd <= chosenStart) {
      throw new ApiError(400, 'Thời gian kết thúc phải sau thời điểm bắt đầu.');
    }

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
          // startTime: seller can choose start time; default is now
          startTime: startTime ? new Date(startTime) : new Date(),
          endTime: new Date(endTime),
          weight: weight ? Number(weight) : undefined,
          length: length ? Number(length) : undefined,
          width: width ? Number(width) : undefined,
          height: height ? Number(height) : undefined,
          provinceId: provinceId || undefined,
          districtId: districtId || undefined,
          sellerId: userId,
          // New: Products start as DRAFT and PENDING_REVIEW until admin approves
          status: 'DRAFT',
          approvalStatus: 'PENDING_REVIEW',
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

// GET /api/products/seller — Danh sách sản phẩm của seller (bao gồm DRAFT và lịch sử)
export const getSellerProducts = async (req, res, next) => {
  const userId = req.session?.userId;
  if (!userId) return next(new ApiError(401, 'Bạn cần đăng nhập.'));

  try {
    const { includeHistory } = req.query;
    const where = { sellerId: userId };
    // Lịch sử (ended/completed) chỉ hiển thị khi includeHistory=true
    if (includeHistory !== 'true') {
      where.deletedAt = null;
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        _count: { select: { bids: true } }
      },
      orderBy: { startTime: 'desc' }
    });

    return res.json({
      success: true,
      data: products.map(p => ({
        ...p,
        startPrice: Number(p.startPrice),
        currentPrice: Number(p.currentPrice),
        buyNowPrice: p.buyNowPrice ? Number(p.buyNowPrice) : null,
        bidCount: p._count.bids
      }))
    });
  } catch (error) {
    return next(error);
  }
};

// PUT /api/products/:id — Chỉnh sửa sản phẩm (chỉ seller, chỉ khi PENDING_REVIEW/REJECTED, max 2 lần)
export const updateProduct = async (req, res, next) => {
  const userId = req.session?.userId;
  if (!userId) return next(new ApiError(401, 'Bạn cần đăng nhập.'));

  const { id: productId } = req.params;

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { attributes: true }
    });

    if (!product) throw new ApiError(404, 'Không tìm thấy sản phẩm.');
    if (product.sellerId !== userId) throw new ApiError(403, 'Bạn không có quyền chỉnh sửa sản phẩm này.');

    // Chỉ cho phép sửa khi sản phẩm đang PENDING_REVIEW hoặc bị REJECTED
    if (!['PENDING_REVIEW', 'REJECTED'].includes(product.approvalStatus)) {
      throw new ApiError(400, 'Chỉ có thể chỉnh sửa sản phẩm đang chờ duyệt hoặc bị từ chối.');
    }

    // Kiểm tra giới hạn chỉnh sửa (tối đa 2 lần)
    if (product.editCount >= 2) {
      throw new ApiError(400, 'Bạn đã đạt giới hạn chỉnh sửa (tối đa 2 lần). Sản phẩm sẽ bị xóa nếu không được duyệt.');
    }

    const {
      title, description, imageUrl,
      // startPrice KHÔNG được chỉnh sửa
      buyNowPrice, reservePrice, stepPrice,
      categoryId, startTime, endTime,
      weight, length, width, height,
      provinceId, districtId, attributes
    } = req.body;

    // Validate endTime nếu có thay đổi
    if (endTime) {
      const chosenStart = startTime ? new Date(startTime) : (product.startTime || new Date());
      const chosenEnd = new Date(endTime);
      const maxEndTime = new Date(chosenStart.getTime() + 48 * 60 * 60 * 1000);
      if (chosenEnd > maxEndTime) {
        throw new ApiError(400, 'Thời gian kết thúc đấu giá không được vượt quá 48 giờ kể từ thời điểm bắt đầu.');
      }
    }

    const updatedProduct = await prisma.$transaction(async (tx) => {
      // Xóa attributes cũ nếu có attributes mới
      if (attributes) {
        await tx.productAttribute.deleteMany({ where: { productId } });
      }

      // Tạo danh sách attributes mới
      const parsedAttributes = [];
      if (attributes) {
        const attributeList = Array.isArray(attributes)
          ? attributes
          : typeof attributes === 'object'
            ? Object.entries(attributes).map(([keyId, val]) => ({ attributeKeyId: keyId, value: val }))
            : [];

        for (const attr of attributeList) {
          if (!attr.value || String(attr.value).trim() === '') continue;
          if (attr.attributeKeyId) {
            parsedAttributes.push({
              productId,
              attributeKeyId: attr.attributeKeyId,
              value: String(attr.value).trim()
            });
          }
        }

        if (parsedAttributes.length > 0) {
          await tx.productAttribute.createMany({ data: parsedAttributes });
        }
      }

      const prod = await tx.product.update({
        where: { id: productId },
        data: {
          ...(title && { title }),
          ...(description !== undefined && { description }),
          ...(imageUrl !== undefined && { imageUrl }),
          ...(buyNowPrice !== undefined && { buyNowPrice: buyNowPrice ? Number(buyNowPrice) : null }),
          ...(reservePrice !== undefined && { reservePrice: reservePrice ? Number(reservePrice) : null }),
          ...(stepPrice && { stepPrice: Number(stepPrice) }),
          ...(categoryId && { categoryId }),
          ...(startTime && { startTime: new Date(startTime) }),
          ...(endTime && { endTime: new Date(endTime) }),
          ...(weight && { weight: Number(weight) }),
          ...(length && { length: Number(length) }),
          ...(width && { width: Number(width) }),
          ...(height && { height: Number(height) }),
          ...(provinceId && { provinceId }),
          ...(districtId && { districtId }),
          // Tăng editCount và chuyển lại PENDING_REVIEW nếu trước đó bị REJECTED
          editCount: { increment: 1 },
          approvalStatus: 'PENDING_REVIEW',
          rejectionReason: null,
          rejectedAt: null
        }
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'UPDATE_PRODUCT',
          target: productId,
          details: JSON.stringify({ editCount: prod.editCount, title: prod.title })
        }
      });

      return prod;
    });

    return res.json({
      success: true,
      message: `Đã cập nhật sản phẩm. Sản phẩm đang chờ Admin duyệt lại (lần chỉnh sửa ${updatedProduct.editCount}/2).`,
      data: {
        ...updatedProduct,
        startPrice: Number(updatedProduct.startPrice),
        currentPrice: Number(updatedProduct.currentPrice),
        editCount: updatedProduct.editCount,
        approvalStatus: updatedProduct.approvalStatus
      }
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
