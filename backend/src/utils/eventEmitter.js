import { EventEmitter } from 'events';

const productEvents = new EventEmitter();

export default productEvents;

// Hàm hỗ trợ phát sự kiện đến tất cả các luồng SSE đang hoạt động cho một sản phẩm cụ thể
export function triggerProductUpdate(productId, currentPrice, endTime, status) {
  productEvents.emit(`update-${productId}`, { currentPrice, endTime, status });
}
