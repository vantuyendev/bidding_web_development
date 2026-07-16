import ApiError from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

/**
 * MIDDLEWARE XỬ LÝ LỖI TẬP TRUNG (Centralized Error Handler Middleware)
 * - Nó là gì: Một hàm middleware đặc biệt trong Express.js được đăng ký cuối cùng trong luồng request.
 *   Express quy ước: Một middleware có đúng 4 tham số (err, req, res, next) sẽ được coi là Error Handler.
 * - Để làm gì:
 *   1. Tránh sập ứng dụng (Robustness): Bất kể lỗi nào xảy ra ở các router hay controller khác (khi ta gọi 
 *      next(error) hoặc throw error), nó đều tự động nhảy về đây xử lý, giúp server không bao giờ bị tắt đột ngột.
 *   2. Chuẩn hóa cấu trúc lỗi (Consistency): Định dạng mọi lỗi thành dạng JSON thống nhất `{ success: false, error: ... }` 
 *      giúp client (Frontend) dễ dàng bắt lỗi và hiển thị lên giao diện.
 *   3. Ghi nhật ký tập trung (Centralized Logging): Lưu trữ thông tin lỗi vào hệ thống log kèm theo requestId để dễ dàng 
 *      tra vết khi vận hành hệ thống.
 */
export const errorHandler = (err, req, res, next) => {
  const requestId = req.headers['x-request-id'] || 'system';

  // 1. Xử lý lỗi ApiError tùy chỉnh (Lỗi nghiệp vụ chủ động ném ra, ví dụ: 401 Chưa đăng nhập, 404 Không tìm thấy sản phẩm)
  if (err instanceof ApiError) {
    logger.warn(`API Error [${err.statusCode}]: ${err.message}`, {
      requestId,
      path: req.path,
      method: req.method,
    });
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
  }

  // 2. Xử lý lỗi xác thực của Zod (Zod Validation Error)
  // - Xảy ra khi dữ liệu người dùng gửi lên không khớp với định dạng Schema đã định nghĩa (ví dụ: thiếu email, mật khẩu quá ngắn)
  if (err instanceof z.ZodError) {
    const errorDetails = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));
    logger.warn('Validation Failed', {
      requestId,
      path: req.path,
      method: req.method,
      details: errorDetails
    });
    return res.status(400).json({
      success: false,
      error: 'Dữ liệu đầu vào không hợp lệ.',
      details: errorDetails
    });
  }

  // 3. Xử lý thực thể yêu cầu quá lớn (Payload Too Large - Lỗi 413)
  // - Thường xảy ra khi người dùng tải lên ảnh sản phẩm dạng Base64 vượt quá giới hạn thiết lập của Express body-parser.
  if (err.status === 413 || err.type === 'entity.too.large') {
    logger.warn(`Request entity too large: ${err.message}`, {
      requestId,
      path: req.path,
      method: req.method,
    });
    return res.status(413).json({
      success: false,
      error: 'Dung lượng ảnh hoặc dữ liệu quá lớn. Vui lòng chọn ảnh nhỏ hơn 10MB.'
    });
  }

  // 4. Xử lý các lỗi bất ngờ mặc định (Internal Server Error - Lỗi 500)
  // - Là những lỗi lập trình chưa lường trước được (ví dụ: lỗi cú pháp SQL, lỗi kết nối DB, biến bị null/undefined).
  // - Ẩn chi tiết lỗi kỹ thuật ở môi trường production để bảo mật, chỉ ghi vào log hệ thống và báo lỗi chung chung cho người dùng.
  logger.error(`Unexpected Server Error: ${err.message || err}`, err, {
    requestId,
    path: req.path,
    method: req.method,
  });

  return res.status(500).json({
    success: false,
    error: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.'
  });
};
