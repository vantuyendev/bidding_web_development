import express from 'express';
import { requireAuth, requireAdmin } from '../middlewares/authMiddleware.js';
import {
  adminGetStats,
  adminGetAllUsers,
  adminBanUser,
  adminGetActiveAuctions,
  adminCancelAuction,
  adminGetWalletRequests,
  adminConfirmWalletRequest,
  adminGetPendingProducts,
  adminApproveProduct,
  adminGetAuditLogs
} from '../controllers/adminController.js';
import {
  adminGetPendingKyc,
  adminApproveKyc
} from '../controllers/userController.js';
import {
  adminGetBankSettings,
  adminUpdateBankSettings
} from '../controllers/settingController.js';

const router = express.Router();

// Tất cả các tuyến đường admin đều yêu cầu xác thực và vai trò admin
router.use(requireAuth);
router.use(requireAdmin);

// Thống kê
router.get('/stats', adminGetStats);

// Quản lý người dùng
router.get('/users', adminGetAllUsers);
router.post('/users/:id/ban', adminBanUser);

// Quản lý KYC (được chuyển từ tuyến đường người dùng)
router.get('/kyc-pending', adminGetPendingKyc);
router.post('/approve-kyc', adminApproveKyc);

// Quản lý đấu giá
router.get('/auctions', adminGetActiveAuctions);
router.post('/auctions/:id/cancel', adminCancelAuction);

// Quản lý yêu cầu ví
router.get('/wallet-requests', adminGetWalletRequests);
router.post('/wallet-requests/:id/confirm', adminConfirmWalletRequest);

// Phê duyệt sản phẩm
router.get('/products', adminGetPendingProducts);
router.post('/products/:id/approve', adminApproveProduct);

// Cấu hình chuyển khoản (nạp tiền)
router.get('/bank-settings', adminGetBankSettings);
router.put('/bank-settings', adminUpdateBankSettings);

// Nhật ký hoạt động (Audit logs)
router.get('/audit-logs', adminGetAuditLogs);

export default router;
