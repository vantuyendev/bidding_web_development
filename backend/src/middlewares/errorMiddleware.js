import ApiError from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

export const errorHandler = (err, req, res, next) => {
  const requestId = req.headers['x-request-id'] || 'system';

  // Handle custom ApiError
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

  // Handle Zod Validation Error
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

  // Handle default fallback unexpected errors
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
