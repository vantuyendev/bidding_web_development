import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('[SEED] Seeding database with mock data...');

  // Create Mock Users
  const users = [
    {
      id: 'buyer-1-id-placeholder-1111',
      email: 'buyer1@example.com',
      passwordHash: '$2b$10$mockpasswordhashplaceholder',
      balance: 15000000.00,
    },
    {
      id: 'buyer-2-id-placeholder-2222',
      email: 'buyer2@example.com',
      passwordHash: '$2b$10$mockpasswordhashplaceholder',
      balance: 20000000.00,
    }
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user,
    });
    console.log(`[SEED] Created/Verified mock user: ${user.email} (ID: ${user.id})`);
  }

  // Create Mock Categories
  const categoriesData = [
    { id: 'cat-dien-thoai', name: 'Điện thoại', slug: 'dien-thoai' },
    { id: 'cat-dong-ho', name: 'Đồng hồ', slug: 'dong-ho' },
    { id: 'cat-mo-hinh-anime', name: 'Mô hình Anime', slug: 'mo-hinh-anime' }
  ];

  for (const cat of categoriesData) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name },
      create: cat,
    });
    console.log(`[SEED] Created/Verified category: ${cat.name} (${cat.slug})`);
  }

  // Create Mock Attribute Keys
  const attributeKeysData = [
    // Điện thoại
    { id: 'key-dt-brand', categoryId: 'cat-dien-thoai', name: 'Hãng sản xuất', type: 'SELECT' },
    { id: 'key-dt-ram', categoryId: 'cat-dien-thoai', name: 'Dung lượng RAM', type: 'SELECT' },
    // Đồng hồ
    { id: 'key-dh-brand', categoryId: 'cat-dong-ho', name: 'Hãng sản xuất', type: 'SELECT' },
    { id: 'key-dh-origin', categoryId: 'cat-dong-ho', name: 'Xuất xứ', type: 'TEXT' },
    // Mô hình Anime
    { id: 'key-an-scale', categoryId: 'cat-mo-hinh-anime', name: 'Tỷ lệ', type: 'TEXT' },
    { id: 'key-an-brand', categoryId: 'cat-mo-hinh-anime', name: 'Hãng sản xuất', type: 'SELECT' },
    { id: 'key-an-box', categoryId: 'cat-mo-hinh-anime', name: 'Tình trạng Box', type: 'TEXT' }
  ];

  for (const key of attributeKeysData) {
    await prisma.attributeKey.upsert({
      where: { id: key.id },
      update: { name: key.name, type: key.type, categoryId: key.categoryId },
      create: key,
    });
    console.log(`[SEED] Created/Verified attribute key: ${key.name} (ID: ${key.id})`);
  }

  // Create Mock Products (Art & Tech)
  const now = new Date();
  const products = [
    {
      id: 'iphone-15-pro',
      title: 'iPhone 15 Pro Max 256GB',
      description: 'Điện thoại di động flagship mới nhất của Apple với khung Titan, chip A17 Pro và hệ thống camera zoom quang học 5x.',
      imageUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500&auto=format&fit=crop&q=60',
      startPrice: 28000000.00,
      currentPrice: 28000000.00,
      buyNowPrice: 32000000.00,
      startTime: now,
      endTime: new Date(now.getTime() + 60 * 60 * 1000), // active for 1 hour
      status: 'ACTIVE',
      categoryId: 'cat-dien-thoai',
      attributes: [
        { attributeKeyId: 'key-dt-brand', value: 'Apple' },
        { attributeKeyId: 'key-dt-ram', value: '8GB' }
      ]
    },
    {
      id: 'macbook-pro-m3',
      title: 'MacBook Pro 14" M3 Pro 18GB/512GB',
      description: 'Máy tính xách tay chuyên nghiệp MacBook Pro với chip M3 Pro mới nhất, màn hình Liquid Retina XDR và màu Space Black.',
      imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&auto=format&fit=crop&q=60',
      startPrice: 45000000.00,
      currentPrice: 45000000.00,
      buyNowPrice: 52000000.00,
      startTime: now,
      endTime: new Date(now.getTime() + 10 * 60 * 1000), // active for 10 minutes
      status: 'ACTIVE',
      categoryId: 'cat-dien-thoai',
      attributes: [
        { attributeKeyId: 'key-dt-brand', value: 'Apple' },
        { attributeKeyId: 'key-dt-ram', value: '18GB' }
      ]
    },
    {
      id: 'playstation-5',
      title: 'Sony PlayStation 5 Slim Edition',
      description: 'Máy chơi game thế hệ mới PlayStation 5 phiên bản Slim với ổ cứng SSD tốc độ siêu cao và tay cầm phản hồi xúc giác DualSense.',
      imageUrl: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=500&auto=format&fit=crop&q=60',
      startPrice: 12000000.00,
      currentPrice: 12000000.00,
      buyNowPrice: 15000000.00,
      startTime: now,
      endTime: new Date(now.getTime() - 5 * 60 * 1000), // already ended
      status: 'ENDED',
      categoryId: 'cat-dien-thoai',
      attributes: [
        { attributeKeyId: 'key-dt-brand', value: 'Sony' }
      ]
    },
    {
      id: 'ipad-pro-m4',
      title: 'iPad Pro 13" M4 Ultra-thin OLED',
      description: 'Máy tính bảng cao cấp nhất của Apple với màn hình Tandem OLED siêu sáng, chip M4 cực mạnh và độ mỏng kỷ lục.',
      imageUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500&auto=format&fit=crop&q=60',
      startPrice: 32000000.00,
      currentPrice: 32000000.00,
      buyNowPrice: 36000000.00,
      startTime: now,
      endTime: new Date(now.getTime() + 2 * 60 * 60 * 1000), // active for 2 hours
      status: 'ACTIVE',
      categoryId: 'cat-dien-thoai',
      attributes: [
        { attributeKeyId: 'key-dt-brand', value: 'Apple' },
        { attributeKeyId: 'key-dt-ram', value: '8GB' }
      ]
    },
    {
      id: 'sony-headphones',
      title: 'Sony WH-1000XM5 ANC Headphones',
      description: 'Tai nghe chụp tai chống ồn hàng đầu thế giới với hệ thống chống ồn Auto NC Optimizer, 8 micro và chất lượng âm thanh đỉnh cao.',
      imageUrl: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=500&auto=format&fit=crop&q=60',
      startPrice: 7000000.00,
      currentPrice: 7000000.00,
      buyNowPrice: 8500000.00,
      startTime: now,
      endTime: new Date(now.getTime() + 4 * 60 * 60 * 1000), // active for 4 hours
      status: 'ACTIVE',
      categoryId: 'cat-dien-thoai',
      attributes: [
        { attributeKeyId: 'key-dt-brand', value: 'Sony' }
      ]
    },
    {
      id: 'painting-golden-autumn',
      title: 'Tranh Sơn Dầu "Mùa Thu Vàng"',
      description: 'Tác phẩm nghệ thuật vẽ tay độc bản của họa sĩ Việt Nam nổi tiếng, sử dụng chất liệu sơn dầu cao cấp trên vải toan, kích thước 80x100cm.',
      imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=500&auto=format&fit=crop&q=60',
      startPrice: 15000000.00,
      currentPrice: 15000000.00,
      buyNowPrice: 22000000.00,
      startTime: now,
      endTime: new Date(now.getTime() + 3 * 60 * 60 * 1000), // active for 3 hours
      status: 'ACTIVE',
      categoryId: 'cat-mo-hinh-anime',
      attributes: [
        { attributeKeyId: 'key-an-scale', value: '1/1' },
        { attributeKeyId: 'key-an-box', value: 'No Box' }
      ]
    },
    {
      id: 'statue-buddha',
      title: 'Tượng Phật Gỗ Trầm Hương Cổ',
      description: 'Tượng Phật được điêu khắc thủ công tinh xảo từ khối gỗ trầm hương tự nhiên niên đại trên 50 năm, tỏa hương thơm thanh khiết dịu nhẹ.',
      imageUrl: 'https://images.unsplash.com/photo-1609137144814-722cb54c5f94?w=500&auto=format&fit=crop&q=60',
      startPrice: 85000000.00,
      currentPrice: 85000000.00,
      buyNowPrice: null,
      startTime: now,
      endTime: new Date(now.getTime() + 5 * 60 * 60 * 1000), // active for 5 hours
      status: 'ACTIVE',
      categoryId: 'cat-mo-hinh-anime',
      attributes: [
        { attributeKeyId: 'key-an-scale', value: '1/1' },
        { attributeKeyId: 'key-an-box', value: 'No Box' }
      ]
    },
    {
      id: 'ceramic-plate',
      title: 'Đĩa Gốm Sứ Bát Tràng Vẽ Tay',
      description: 'Độc bản gốm sứ từ làng cổ Bát Tràng vẽ họa tiết sơn thủy hữu tình bằng mực men lam truyền thống, đường kính 40cm có chân đế gỗ.',
      imageUrl: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=500&auto=format&fit=crop&q=60',
      startPrice: 3500000.00,
      currentPrice: 3500000.00,
      buyNowPrice: 5000000.00,
      startTime: now,
      endTime: new Date(now.getTime() + 30 * 60 * 1000), // active for 30 mins
      status: 'ACTIVE',
      categoryId: 'cat-dong-ho',
      attributes: [
        { attributeKeyId: 'key-dh-brand', value: 'Bát Tràng' },
        { attributeKeyId: 'key-dh-origin', value: 'Việt Nam' }
      ]
    },
    {
      id: 'odo-clock',
      title: 'Đồng Hồ Cổ Odo Pháp 1950',
      description: 'Đồng hồ tủ cổ nguyên bản sản xuất từ Pháp năm 1950, cơ chế lên dây cót, phát nhạc Westminster 8 búa 8 gông ngân vang cực hay.',
      imageUrl: 'https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?w=500&auto=format&fit=crop&q=60',
      startPrice: 42000000.00,
      currentPrice: 42000000.00,
      buyNowPrice: 50000000.00,
      startTime: now,
      endTime: new Date(now.getTime() - 2 * 60 * 60 * 1000), // ended 2 hours ago
      status: 'ENDED',
      categoryId: 'cat-dong-ho',
      attributes: [
        { attributeKeyId: 'key-dh-brand', value: 'Odo' },
        { attributeKeyId: 'key-dh-origin', value: 'Pháp' }
      ]
    },
    {
      id: 'mechanical-keyboard',
      title: 'Bàn Phím Cơ Custom Angry Miao Cyberboard',
      description: 'Bàn phím cơ cao cấp lấy cảm hứng từ Cybertruck, màn hình LED Matrix tùy biến ở cạnh trước, vỏ nhôm nguyên khối anodized.',
      imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&auto=format&fit=crop&q=60',
      startPrice: 18000000.00,
      currentPrice: 18000000.00,
      buyNowPrice: 22000000.00,
      startTime: now,
      endTime: new Date(now.getTime() + 24 * 60 * 60 * 1000), // active for 24 hours
      status: 'ACTIVE',
      categoryId: 'cat-dien-thoai',
      attributes: [
        { attributeKeyId: 'key-dt-brand', value: 'Angry Miao' }
      ]
    }
  ];

  for (const prod of products) {
    const { attributes, ...productData } = prod;
    await prisma.product.upsert({
      where: { id: prod.id },
      update: {
        title: productData.title,
        description: productData.description,
        imageUrl: productData.imageUrl,
        startPrice: productData.startPrice,
        currentPrice: productData.currentPrice,
        buyNowPrice: productData.buyNowPrice,
        startTime: productData.startTime,
        endTime: productData.endTime,
        status: productData.status,
        categoryId: productData.categoryId,
      },
      create: productData,
    });
    console.log(`[SEED] Created/Verified product: ${productData.title} (ID: ${productData.id})`);

    if (attributes && attributes.length > 0) {
      for (const attr of attributes) {
        await prisma.productAttribute.upsert({
          where: {
            productId_attributeKeyId: {
              productId: prod.id,
              attributeKeyId: attr.attributeKeyId
            }
          },
          update: {
            value: attr.value
          },
          create: {
            productId: prod.id,
            attributeKeyId: attr.attributeKeyId,
            value: attr.value
          }
        });
      }
      console.log(`[SEED] Seeded ${attributes.length} attributes for product: ${prod.id}`);
    }
  }

  console.log('[SEED] Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('[SEED] Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
