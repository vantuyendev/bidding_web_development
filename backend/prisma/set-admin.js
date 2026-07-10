/**
 * Script thiết lập tài khoản Admin
 * 
 * Cách dùng:
 *   node prisma/set-admin.js <email>
 *   node prisma/set-admin.js admin@yourdomain.com
 * 
 * Hoặc để liệt kê tất cả admin hiện tại:
 *   node prisma/set-admin.js --list
 * 
 * Hoặc để thu hồi quyền admin:
 *   node prisma/set-admin.js --revoke <email>
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('❌ Thiếu tham số. Xem hướng dẫn ở đầu file.');
    process.exit(1);
  }

  // --list: Liệt kê tất cả admin
  if (args[0] === '--list') {
    const admins = await prisma.user.findMany({
      where: { isAdmin: true },
      select: { id: true, email: true, name: true, createdAt: true }
    });
    if (admins.length === 0) {
      console.log('⚠️  Chưa có tài khoản Admin nào trong hệ thống.');
    } else {
      console.log(`✅ Danh sách ${admins.length} Admin:`);
      admins.forEach(a => console.log(`  - [${a.id}] ${a.email} (${a.name || 'chưa đặt tên'})`));
    }
    return;
  }

  // --revoke <email>: Thu hồi quyền admin
  if (args[0] === '--revoke') {
    const email = args[1];
    if (!email) {
      console.log('❌ Vui lòng cung cấp email: node set-admin.js --revoke <email>');
      process.exit(1);
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`❌ Không tìm thấy người dùng với email: ${email}`);
      process.exit(1);
    }
    await prisma.user.update({ where: { email }, data: { isAdmin: false } });
    console.log(`✅ Đã thu hồi quyền Admin của: ${email}`);
    return;
  }

  // Cấp quyền admin cho email
  const email = args[0];
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log(`❌ Không tìm thấy người dùng với email: ${email}`);
    console.log('   Hãy đăng ký tài khoản trước, sau đó chạy lại script này.');
    process.exit(1);
  }
  if (user.isAdmin) {
    console.log(`⚠️  Tài khoản ${email} đã là Admin rồi.`);
    return;
  }
  await prisma.user.update({ where: { email }, data: { isAdmin: true } });
  console.log(`✅ Đã cấp quyền Admin cho: ${email}`);
  console.log(`   ID: ${user.id}`);
}

main()
  .catch(e => {
    console.error('❌ Lỗi:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
