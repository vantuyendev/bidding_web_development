import { EventEmitter } from 'events';

const productEvents = new EventEmitter();

export default productEvents;

// Helper to trigger events to all active SSE streams for a specific product
export function triggerProductUpdate(productId, currentPrice, endTime, status) {
  productEvents.emit(`update-${productId}`, { currentPrice, endTime, status });
}
