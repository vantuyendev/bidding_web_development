import { EventEmitter } from 'events';

const notificationEmitter = new EventEmitter();

export default notificationEmitter;

// Hàm hỗ trợ kích hoạt cập nhật thông báo thời gian thực đến luồng hoạt động
export function triggerNotificationSend(userId, notification) {
  notificationEmitter.emit(`notification-${userId}`, notification);
}
