import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('[SEED] Seeding database with production metadata...');

  // Tạo danh mục sản xuất
  const categoriesData = [
    { id: 'cat-dien-thoai', name: 'Điện thoại', slug: 'dien-thoai' },
    { id: 'cat-laptop', name: 'Laptop & Máy tính', slug: 'laptop-may-tinh' },
    { id: 'cat-dong-ho', name: 'Đồng hồ', slug: 'dong-ho' },
    { id: 'cat-mo-hinh-anime', name: 'Mô hình Anime', slug: 'mo-hinh-anime' },
    { id: 'cat-thiet-bi-am-thanh', name: 'Thiết bị âm thanh', slug: 'thiet-bi-am-thanh' },
    { id: 'cat-may-anh', name: 'Máy ảnh', slug: 'may-anh' },
    { id: 'cat-sach', name: 'Sách & Truyện tranh', slug: 'sach-truyen-tranh' },
    { id: 'cat-nhac-cu', name: 'Nhạc cụ', slug: 'nhac-cu' },
    { id: 'cat-do-co', name: 'Đồ cổ & Sưu tầm', slug: 'do-co' },
    { id: 'cat-trang-suc-da-quy', name: 'Trang sức & Đá quý', slug: 'trang-suc-da-quy' },
    { id: 'cat-xe-dap-the-thao', name: 'Xe đạp & Thể thao', slug: 'xe-dap-the-thao' }
  ];

  for (const cat of categoriesData) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name },
      create: cat,
    });
    console.log(`[SEED] Created/Verified category: ${cat.name} (${cat.slug})`);
  }

  // Tạo khóa thuộc tính sản xuất
  const attributeKeysData = [
    // Điện thoại
    { id: 'key-dt-brand', categoryId: 'cat-dien-thoai', name: 'Hãng sản xuất', type: 'SELECT' },
    { id: 'key-dt-ram', categoryId: 'cat-dien-thoai', name: 'Dung lượng RAM', type: 'SELECT' },
    // Laptop & Máy tính
    { id: 'key-lt-brand', categoryId: 'cat-laptop', name: 'Hãng sản xuất', type: 'SELECT' },
    { id: 'key-lt-ram', categoryId: 'cat-laptop', name: 'Dung lượng RAM', type: 'SELECT' },
    { id: 'key-lt-cpu', categoryId: 'cat-laptop', name: 'Bộ vi xử lý (CPU)', type: 'SELECT' },
    { id: 'key-lt-storage', categoryId: 'cat-laptop', name: 'Loại ổ cứng', type: 'SELECT' },
    // Đồng hồ
    { id: 'key-dh-brand', categoryId: 'cat-dong-ho', name: 'Hãng sản xuất', type: 'SELECT' },
    { id: 'key-dh-origin', categoryId: 'cat-dong-ho', name: 'Xuất xứ', type: 'TEXT' },
    // Mô hình Anime
    { id: 'key-an-scale', categoryId: 'cat-mo-hinh-anime', name: 'Tỷ lệ', type: 'TEXT' },
    { id: 'key-an-brand', categoryId: 'cat-mo-hinh-anime', name: 'Hãng sản xuất', type: 'SELECT' },
    { id: 'key-an-box', categoryId: 'cat-mo-hinh-anime', name: 'Tình trạng Box', type: 'TEXT' },
    // Thiết bị âm thanh
    { id: 'key-at-brand', categoryId: 'cat-thiet-bi-am-thanh', name: 'Hãng sản xuất', type: 'SELECT' },
    { id: 'key-at-conn', categoryId: 'cat-thiet-bi-am-thanh', name: 'Loại kết nối', type: 'SELECT' },
    { id: 'key-at-feat', categoryId: 'cat-thiet-bi-am-thanh', name: 'Tính năng', type: 'TEXT' },
    // Máy ảnh
    { id: 'key-ma-brand', categoryId: 'cat-may-anh', name: 'Hãng sản xuất', type: 'SELECT' },
    { id: 'key-ma-res', categoryId: 'cat-may-anh', name: 'Độ phân giải', type: 'TEXT' },
    { id: 'key-ma-lens', categoryId: 'cat-may-anh', name: 'Kèm ống kính', type: 'SELECT' },
    // Sách & Truyện tranh
    { id: 'key-s-pub', categoryId: 'cat-sach', name: 'Nhà xuất bản', type: 'TEXT' },
    { id: 'key-s-auth', categoryId: 'cat-sach', name: 'Tác giả', type: 'TEXT' },
    { id: 'key-s-format', categoryId: 'cat-sach', name: 'Hình thức', type: 'SELECT' },
    // Nhạc cụ
    { id: 'key-nc-brand', categoryId: 'cat-nhac-cu', name: 'Thương hiệu', type: 'SELECT' },
    { id: 'key-nc-type', categoryId: 'cat-nhac-cu', name: 'Loại nhạc cụ', type: 'SELECT' },
    { id: 'key-nc-origin', categoryId: 'cat-nhac-cu', name: 'Xuất xứ', type: 'TEXT' },
    // Đồ cổ & Sưu tầm
    { id: 'key-dc-period', categoryId: 'cat-do-co', name: 'Thời kỳ', type: 'TEXT' },
    { id: 'key-dc-material', categoryId: 'cat-do-co', name: 'Chất liệu', type: 'TEXT' },
    { id: 'key-dc-status', categoryId: 'cat-do-co', name: 'Tình trạng', type: 'TEXT' },
    // Trang sức & Đá quý
    { id: 'key-ts-metal', categoryId: 'cat-trang-suc-da-quy', name: 'Chất liệu kim loại', type: 'SELECT' },
    { id: 'key-ts-gem', categoryId: 'cat-trang-suc-da-quy', name: 'Loại đá quý', type: 'SELECT' },
    { id: 'key-ts-weight', categoryId: 'cat-trang-suc-da-quy', name: 'Trọng lượng', type: 'TEXT' },
    // Xe đạp & Thể thao
    { id: 'key-xd-brand', categoryId: 'cat-xe-dap-the-thao', name: 'Thương hiệu', type: 'SELECT' },
    { id: 'key-xd-sport', categoryId: 'cat-xe-dap-the-thao', name: 'Loại thể thao', type: 'SELECT' },
    { id: 'key-xd-size', categoryId: 'cat-xe-dap-the-thao', name: 'Kích cỡ', type: 'TEXT' }
  ];

  for (const key of attributeKeysData) {
    await prisma.attributeKey.upsert({
      where: { id: key.id },
      update: { name: key.name, type: key.type, categoryId: key.categoryId },
      create: key,
    });
    console.log(`[SEED] Created/Verified attribute key: ${key.name} (ID: ${key.id})`);
  }

  console.log('[SEED] Production seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('[SEED] Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
