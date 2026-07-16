/**
 * settingController.js — Bộ điều khiển Cài đặt Hệ thống
 *
 * Quản lý các cấu hình toàn cục được lưu trong bảng `system_settings` (cấu trúc key-value).
 * Hiện tại hỗ trợ nhóm cài đặt: thông tin ngân hàng nạp tiền (tên ngân hàng, số tài khoản,
 * tên chủ tài khoản, URL ảnh QR tùy chỉnh, hướng dẫn chuyển khoản).
 *
 * Luồng ưu tiên khi đọc cài đặt (Fallback chain):
 *   1. Giá trị lưu trong bảng `system_settings` (DB) — nguồn tin cậy nhất
 *   2. Biến môi trường trong file `.env` (ADMIN_BANK_NAME, ADMIN_BANK_ACCOUNT, ...)
 *   3. Giá trị mặc định cứng (hardcoded defaults) — đảm bảo hệ thống không bị lỗi khi chưa cấu hình
 */

import prisma from '../models/db.js';
import ApiError from '../utils/ApiError.js';
import { z } from 'zod';

/**
 * Helper nội bộ: Lấy toàn bộ thông tin ngân hàng nạp tiền.
 * Hàm này được gọi bởi cả route Admin và controller nạp tiền của user.
 *
 * @returns {Object} Đối tượng chứa: bankName, bankAccount, bankOwner, qrImageUrl, depositInstructions
 */
export const getBankSettings = async () => {
  try {
    // Lấy toàn bộ cài đặt từ DB và chuyển sang dạng Map {key: value} để tra cứu nhanh
    const settings = await prisma.systemSetting.findMany();
    const settingsMap = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    // Trả về giá trị từ DB, nếu chưa có thì fallback sang .env, cuối cùng dùng mặc định
    return {
      bankName: settingsMap['bank_name'] || process.env.ADMIN_BANK_NAME || 'Vietcombank',
      bankAccount: settingsMap['bank_account'] || process.env.ADMIN_BANK_ACCOUNT || '1234567890',
      bankOwner: settingsMap['bank_owner'] || process.env.ADMIN_BANK_OWNER || 'NGUYEN VAN A',
      qrImageUrl: settingsMap['qr_image_url'] || '',
      depositInstructions: settingsMap['deposit_instructions'] || 'Vui lòng thực hiện chuyển khoản ngân hàng theo thông tin bên dưới. Giao dịch sẽ được cộng vào ví của bạn ngay khi Admin xác thực đã nhận tiền.'
    };
  } catch (error) {
    // Nếu DB lỗi, fallback hoàn toàn về biến môi trường và mặc định cứng
    return {
      bankName: process.env.ADMIN_BANK_NAME || 'Vietcombank',
      bankAccount: process.env.ADMIN_BANK_ACCOUNT || '1234567890',
      bankOwner: process.env.ADMIN_BANK_OWNER || 'NGUYEN VAN A',
      qrImageUrl: '',
      depositInstructions: 'Vui lòng thực hiện chuyển khoản ngân hàng theo thông tin bên dưới. Giao dịch sẽ được cộng vào ví của bạn ngay khi Admin xác thực đã nhận tiền.'
    };
  }
};

// GET /api/admin/bank-settings — Lấy cấu hình ngân hàng hiện tại (chỉ Admin)
export const adminGetBankSettings = async (req, res, next) => {
  try {
    const settings = await getBankSettings();
    return res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Zod schema xác thực dữ liệu cấu hình nạp tiền trước khi ghi vào DB.
 * - bankName, bankAccount, bankOwner: bắt buộc, không được rỗng
 * - qrImageUrl: tùy chọn — có thể là chuỗi rỗng (bỏ qua QR tùy chỉnh, dùng VietQR mặc định)
 *   hoặc một URL hợp lệ đến ảnh QR do Admin tự tạo/tải lên.
 * - depositInstructions: tùy chọn — nội dung hướng dẫn chuyển khoản tùy chỉnh
 */
const bankSettingsSchema = z.object({
  bankName: z.string().trim().min(1, { message: "Tên ngân hàng không được để trống." }),
  bankAccount: z.string().trim().min(1, { message: "Số tài khoản không được để trống." }),
  bankOwner: z.string().trim().min(1, { message: "Tên chủ tài khoản không được để trống." }),
  qrImageUrl: z.string().trim().optional().or(z.literal('')),
  depositInstructions: z.string().trim().optional().or(z.literal(''))
});

/**
 * PUT /api/admin/bank-settings — Cập nhật cấu hình ngân hàng (chỉ Admin)
 *
 * Chiến lược lưu trữ: dùng `upsert` cho từng key riêng lẻ trong bảng `system_settings`.
 * - Nếu key chưa tồn tại → tạo mới (CREATE)
 * - Nếu key đã tồn tại → cập nhật giá trị (UPDATE)
 * Cách này cho phép thêm key mới trong tương lai mà không cần migration DB.
 */
export const adminUpdateBankSettings = async (req, res, next) => {
  try {
    // Xác thực dữ liệu đầu vào bằng Zod schema
    const validation = bankSettingsSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ApiError(400, validation.error.errors[0].message);
    }

    const { bankName, bankAccount, bankOwner, qrImageUrl, depositInstructions } = validation.data;

    // Ánh xạ tên trường JS → tên key trong bảng system_settings
    const data = {
      'bank_name': bankName,
      'bank_account': bankAccount,
      'bank_owner': bankOwner,
      'qr_image_url': qrImageUrl || '',
      'deposit_instructions': depositInstructions || ''
    };

    // Upsert từng cặp key-value vào bảng system_settings
    const keys = Object.keys(data);
    for (const key of keys) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value: data[key] },
        create: { key, value: data[key] }
      });
    }

    return res.json({
      success: true,
      message: 'Cập nhật cấu hình chuyển khoản thành công.'
    });
  } catch (error) {
    return next(error);
  }
};


