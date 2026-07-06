import { EventEmitter } from 'events';

const notificationEmitter = new EventEmitter();

export default notificationEmitter;

// Helper to trigger real-time notification update to active stream
export function triggerNotificationSend(userId, notification) {
  notificationEmitter.emit(`notification-${userId}`, notification);
}
