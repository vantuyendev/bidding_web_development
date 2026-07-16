import prisma from '../models/db.js';
import ApiError from '../utils/ApiError.js';
import { z } from 'zod';

// Helper: Lấy thông tin chuyển khoản từ DB hoặc fallback về env/mặc định
export const getBankSettings = async () => {
  try {
    const settings = await prisma.systemSetting.findMany();
    const settingsMap = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    return {
      bankName: settingsMap['bank_name'] || process.env.ADMIN_BANK_NAME || 'Vietcombank',
      bankAccount: settingsMap['bank_account'] || process.env.ADMIN_BANK_ACCOUNT || '1234567890',
      bankOwner: settingsMap['bank_owner'] || process.env.ADMIN_BANK_OWNER || 'NGUYEN VAN A',
      qrImageUrl: settingsMap['qr_image_url'] || '',
      depositInstructions: settingsMap['deposit_instructions'] || 'Vui lòng thực hiện chuyển khoản ngân hàng theo thông tin bên dưới. Giao dịch sẽ được cộng vào ví của bạn ngay khi Admin xác thực đã nhận tiền.'
    };
  } catch (error) {
    return {
      bankName: process.env.ADMIN_BANK_NAME || 'Vietcombank',
      bankAccount: process.env.ADMIN_BANK_ACCOUNT || '1234567890',
      bankOwner: process.env.ADMIN_BANK_OWNER || 'NGUYEN VAN A',
      qrImageUrl: '',
      depositInstructions: 'Vui lòng thực hiện chuyển khoản ngân hàng theo thông tin bên dưới. Giao dịch sẽ được cộng vào ví của bạn ngay khi Admin xác thực đã nhận tiền.'
    };
  }
};

// GET /api/admin/bank-settings — Lấy cấu hình hiện tại (chỉ Admin)
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

// Zod schema để validate dữ liệu cấu hình nạp tiền
const bankSettingsSchema = z.object({
  bankName: z.string().trim().min(1, { message: "Tên ngân hàng không được để trống." }),
  bankAccount: z.string().trim().min(1, { message: "Số tài khoản không được để trống." }),
  bankOwner: z.string().trim().min(1, { message: "Tên chủ tài khoản không được để trống." }),
  qrImageUrl: z.string().trim().optional().or(z.literal('')),
  depositInstructions: z.string().trim().optional().or(z.literal(''))
});

// PUT /api/admin/bank-settings — Cập nhật cấu hình (chỉ Admin)
export const adminUpdateBankSettings = async (req, res, next) => {
  try {
    const validation = bankSettingsSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ApiError(400, validation.error.errors[0].message);
    }

    const { bankName, bankAccount, bankOwner, qrImageUrl, depositInstructions } = validation.data;

    const data = {
      'bank_name': bankName,
      'bank_account': bankAccount,
      'bank_owner': bankOwner,
      'qr_image_url': qrImageUrl || '',
      'deposit_instructions': depositInstructions || ''
    };

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
