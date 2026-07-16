import express from 'express';
import { requireAuth, requireNotBanned } from '../middlewares/authMiddleware.js';
import { 
  getUserProfile, 
  verifySeller, 
  depositFunds, 
  withdrawFunds,
  getUserWalletRequests,
  submitKyc,
  getPublicUserProfile,
  cancelWalletRequest,
  getWonAuctions,
  getUserTransactionHistory,
  updateProfile
} from '../controllers/userController.js';

const router = express.Router();

// GET /profile - Lấy thông tin chi tiết hồ sơ người dùng đang đăng nhập (được bảo vệ)
router.get('/profile', requireAuth, getUserProfile);

// PUT /profile - Cập nhật tên hiển thị và ảnh đại diện (được bảo vệ)
router.put('/profile', requireAuth, requireNotBanned, updateProfile);


// POST /verify-seller - Đặt người dùng hiện tại làm người bán đã xác minh (được bảo vệ)
router.post('/verify-seller', requireAuth, requireNotBanned, verifySeller);

// POST /deposit - Tạo yêu cầu nạp tiền (được bảo vệ)
router.post('/deposit', requireAuth, requireNotBanned, depositFunds);

// POST /withdraw - Tạo yêu cầu rút tiền (được bảo vệ)
router.post('/withdraw', requireAuth, requireNotBanned, withdrawFunds);

// GET /wallet-requests - Lấy lịch sử yêu cầu ví của người dùng (được bảo vệ)
router.get('/wallet-requests', requireAuth, getUserWalletRequests);

// DELETE /wallet-requests/:id - Hủy yêu cầu ví đang chờ duyệt (được bảo vệ)
router.delete('/wallet-requests/:id', requireAuth, requireNotBanned, cancelWalletRequest);

// GET /won-auctions - Lấy danh sách sản phẩm đấu giá thắng của người dùng (được bảo vệ)
router.get('/won-auctions', requireAuth, getWonAuctions);

// GET /transactions - Lấy lịch sử giao dịch của người dùng (được bảo vệ)
router.get('/transactions', requireAuth, getUserTransactionHistory);

// POST /submit-kyc - Nộp hồ sơ KYC để nâng cấp lên người bán (được bảo vệ)
router.post('/submit-kyc', requireAuth, requireNotBanned, submitKyc);

// GET /:id - Lấy hồ sơ công khai và đánh giá của một người dùng (người bán)
router.get('/:id', getPublicUserProfile);

export default router;
