import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('[SEED] Seeding database with mock data...');

  // Create Mock User
  const user = await prisma.user.upsert({
    where: { email: 'mock_user@example.com' },
    update: {},
    create: {
      id: '4a4b27c6-7de1-460d-bc78-8314ffba99c0',
      email: 'mock_user@example.com',
      passwordHash: '$2b$10$mockpasswordhashplaceholder',
      balance: 10000000.00,
    },
  });

  console.log(`[SEED] Created/Verified mock user: ${user.email} (ID: ${user.id})`);

  // Create Mock Products
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
      endTime: new Date(now.getTime() + 10 * 60 * 1000), // active for 10 minutes
      status: 'ACTIVE',
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
      endTime: new Date(now.getTime() + 2 * 60 * 1000), // active for 2 minutes (great for testing worker closing!)
      status: 'ACTIVE',
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
    }
  ];

  for (const prod of products) {
    await prisma.product.upsert({
      where: { id: prod.id },
      update: {},
      create: prod,
    });
    console.log(`[SEED] Created/Verified product: ${prod.title} (ID: ${prod.id})`);
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
