import productEvents from '../utils/eventEmitter.js';

/**
 * CƠ CHẾ TRUYỀN DỮ LIỆU THỜI GIAN THỰC BẰNG SERVER-SENT EVENTS (SSE) (streamProductEvents)
 * - Nó là gì: SSE là một tiêu chuẩn HTML5 cho phép Server đẩy dữ liệu trực tiếp, chủ động đến Client (trình duyệt)
 *   thông qua một kết nối HTTP duy nhất được duy trì liên tục ('Connection': 'keep-alive').
 * - Tại sao dùng SSE thay vì WebSockets:
 *   1. Đơn giản & Chạy trên HTTP tiêu chuẩn: Không cần cấu hình giao thức ws:// phức tạp, tương thích tốt với firewall/proxy.
 *   2. Đẩy một chiều (Unidirectional): Trong đấu giá, trình duyệt chỉ cần nhận cập nhật giá mới từ Server, 
 *      còn hành động đặt giá vẫn được gửi qua HTTP POST API bình thường. SSE hoàn toàn đáp ứng tốt nhu cầu này.
 *   3. Tự động kết nối lại (Auto-reconnect): Trình duyệt tự động kết nối lại nếu kết nối bị đứt.
 */
export const streamProductEvents = (req, res) => {
  const { id } = req.params;

  // THIẾT LẬP CÁC HEADER ĐẶC THÙ CHO SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream', // Định dạng luồng sự kiện bắt buộc của SSE
    'Cache-Control': 'no-cache',         // Yêu cầu trình duyệt không lưu cache dữ liệu thầu
    'Connection': 'keep-alive',          // Giữ kết nối HTTP luôn mở
    'X-Accel-Buffering': 'no'            // Quan trọng: Chỉ thị cho Nginx/reverse proxy đẩy dữ liệu lập tức, không lưu đệm (buffer)
  });

  // Đẩy ký tự xuống dòng để hoàn tất bắt tay (handshake) kết nối ban đầu
  res.write('\n');

  // Hàm định dạng thông điệp gửi thầu theo chuẩn SSE: event: [tên]\ndata: [chuỗi JSON]\n\n
  const sendEvent = (event, data) => {
    try {
      const eventString = event ? `event: ${event}\n` : '';
      res.write(`${eventString}data: ${JSON.stringify(data)}\n\n`);
    } catch (e) {
      // Luồng có thể đã đóng bởi client
    }
  };

  // Gửi sự kiện xác nhận kết nối thành công để Client biết kết nối đã thông suốt
  sendEvent('connected', { message: 'SSE connection established successfully', productId: id });

  // Đăng ký Listener sự kiện lắng nghe cập nhật sản phẩm từ EventEmitter
  const onUpdate = (data) => {
    sendEvent(undefined, data); // Gửi giá mới về client dưới dạng message mặc định
  };

  const eventName = `update-${id}`;
  productEvents.on(eventName, onUpdate);

  // CƠ CHẾ GIỮ NHỊP TIM (Heartbeat / Keep-alive ping)
  // - Tại sao cần: Các proxy, Cloudflare hoặc Load Balancer thường tự động ngắt kết nối HTTP nếu không có 
  //   dữ liệu truyền tải qua lại trong khoảng 30s-60s.
  // - Cách giải quyết: Cứ mỗi 15 giây, server gửi xuống một gói tin rỗng ('heartbeat') để thông báo kết nối vẫn sống.
  const heartbeat = setInterval(() => {
    sendEvent('heartbeat', { time: new Date().toISOString() });
  }, 15000);

  // DỌN DẸP BỘ NHỚ KHI ĐÓNG KẾT NỐI (req.on('close'))
  // - Tại sao cần: Khi người dùng tắt tab hoặc chuyển trang, kết nối sẽ đóng.
  // - Cách giải quyết: Phải hủy Interval nhịp tim và gỡ bỏ Event Listener thầu của sản phẩm đó trong RAM.
  //   Nếu không dọn dẹp, ứng dụng sẽ bị rò rỉ bộ nhớ (Memory Leak) dẫn tới sập server sau một thời gian chạy.
  req.on('close', () => {
    clearInterval(heartbeat);
    productEvents.off(eventName, onUpdate);
    res.end();
  });
};

// Hàm kích hoạt phát sự kiện cập nhật giá đấu thầu mới đến các luồng SSE đang nghe
export const triggerProductUpdate = (productId, currentPrice, endTime, status, bid) => {
  productEvents.emit(`update-${productId}`, { currentPrice, endTime, status, bid });
};

