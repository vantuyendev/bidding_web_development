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

const router = express.Router();

// All admin routes require authentication and admin role
router.use(requireAuth);
router.use(requireAdmin);

// Stats
router.get('/stats', adminGetStats);

// User management
router.get('/users', adminGetAllUsers);
router.post('/users/:id/ban', adminBanUser);

// KYC management (moved from user routes)
router.get('/kyc-pending', adminGetPendingKyc);
router.post('/approve-kyc', adminApproveKyc);

// Auction management
router.get('/auctions', adminGetActiveAuctions);
router.post('/auctions/:id/cancel', adminCancelAuction);

// Wallet request management
router.get('/wallet-requests', adminGetWalletRequests);
router.post('/wallet-requests/:id/confirm', adminConfirmWalletRequest);

// Product approval
router.get('/products', adminGetPendingProducts);
router.post('/products/:id/approve', adminApproveProduct);

// Audit logs
router.get('/audit-logs', adminGetAuditLogs);

export default router;
