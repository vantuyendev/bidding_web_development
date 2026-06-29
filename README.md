# 🔨 Bidding Web Application (Ứng Dụng Đấu Giá Trực Tuyến)

Ứng dụng đấu giá trực tuyến hoàn chỉnh với giao diện hiện đại, cập nhật thời gian thực qua Server-Sent Events (SSE), bảo mật phiên đăng nhập cấp độ ngân hàng (banking-grade security), chống spam đặt giá/brute-force và thiết kế responsive tối ưu.

---

## ⚠️ LƯU Ý QUAN TRỌNG CHO GIÁO VIÊN KHI CHẤM BÀI

> [!IMPORTANT]
> **Hệ thống Backend được triển khai trên gói Free của Render.com:**
> - Máy chủ Render sẽ tự động chuyển sang chế độ **"Ngủ" (Sleep/Idled)** nếu không có lượt truy cập nào trong vòng **15 phút**.
> - **Lần gọi API đầu tiên** (khi mở trang web lần đầu hoặc sau 15 phút không dùng) sẽ mất khoảng **40 - 50 giây** để Render khởi động lại máy chủ (Spin Up).
> - Sau khi máy chủ đã "thức dậy", mọi tính năng đấu giá, đăng nhập, đặt giá thời gian thực sẽ chạy cực kỳ mượt mà và phản hồi ngay lập tức.
> - *Vui lòng đợi khoảng 1 phút ở lần truy cập đầu tiên nếu giao diện tải chậm, đây là cơ chế hoạt động của Render gói miễn phí chứ không phải lỗi của ứng dụng.*

---

## 🚀 Hướng Dẫn Triển Khai Lên Mạng (Deployment)

### BƯỚC 1: Cấu hình Cơ sở dữ liệu Online
1. Truy cập [Neon.tech](https://neon.tech) hoặc [Supabase.com](https://supabase.com) và đăng nhập bằng tài khoản GitHub.
2. Tạo một Project Postgres mới.
3. Sao chép chuỗi kết nối (**Connection String**) có định dạng:
   `postgresql://user:password@host/dbname?sslmode=require`
4. Cập nhật file [backend/.env](file:///C:/Users/Tuyen/Downloads/bidding_web_development/backend/.env):
   ```env
   DATABASE_URL="chuỗi_kết_nối_vừa_copy"
   ```
5. Mở terminal tại thư mục [backend](file:///C:/Users/Tuyen/Downloads/bidding_web_development/backend) và chạy lệnh:
   ```bash
   npx prisma db push
   ```
   Lệnh này sẽ tự động khởi tạo toàn bộ cấu trúc bảng (`users`, `products`, `bids`) trên database online.

### BƯỚC 2: Triển khai Backend lên Render.com
1. Đăng nhập vào [Render.com](https://render.com) bằng GitHub.
2. Chọn **New** -> **Web Service**.
3. Kết nối với kho lưu trữ (repository) GitHub của dự án `bidding_web_development`.
4. Thiết lập các thông số sau:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npx prisma generate`
   - **Start Command**: `node src/server.js`
5. Nhấp vào **Advanced** -> **Add Environment Variable** để thêm các biến môi trường:
   - `DATABASE_URL`: Dán chuỗi kết nối ở Bước 1 vào.
   - `SESSION_SECRET`: Nhập một chuỗi bảo mật bất kỳ (Ví dụ: `ma-bao-mat-bidding-app-123`).
   - `NODE_ENV`: `production`
6. Bấm **Deploy**. Sau vài phút, Render sẽ cấp cho bạn một URL Backend (Ví dụ: `https://auction-api-xyz.onrender.com`).

### BƯỚC 3: Triển khai Frontend lên Vercel.com
1. Đăng nhập vào [Vercel.com](https://vercel.com) bằng GitHub.
2. Chọn **Add New** -> **Project**.
3. Chọn repository `bidding_web_development` của bạn.
4. Ở phần **Root Directory**, nhấn nút **Edit** và chọn thư mục `frontend`.
5. Mở rộng phần **Environment Variables**, thêm biến sau:
   - **Key**: `VITE_API_URL`
   - **Value**: Dán đường dẫn Backend của bạn từ Bước 2 kèm hậu tố `/api` (Ví dụ: `https://auction-api-xyz.onrender.com/api`).
6. Bấm **Deploy**. Vercel sẽ tự động xây dựng ứng dụng và cấp cho bạn một đường dẫn (Ví dụ: `https://my-auction-frontend.vercel.app`). Đây chính là đường dẫn để gửi cho giáo viên!

### Bước Cuối Cùng: Cấu hình CORS an toàn
1. Khi đã có link Vercel ở Bước 3 (Ví dụ: `https://my-auction-frontend.vercel.app`), hãy quay lại trang quản trị Render.com của dịch vụ Backend.
2. Vào phần **Environment Variables** (Biến môi trường) của Backend.
3. Thêm một biến mới:
   - **Key**: `FRONTEND_URL`
   - **Value**: Dán link Vercel của bạn vào (Ví dụ: `https://my-auction-frontend.vercel.app` - *lưu ý không để dấu `/` ở cuối*).
4. Lưu cấu hình và Render sẽ tự động deploy lại phiên bản mới với cấu hình CORS bảo mật hoàn chỉnh.

---

## 🛠️ Hướng Dẫn Chạy Dưới Local (Development)

### Yêu cầu hệ thống
- Đã cài đặt [Node.js](https://nodejs.org) (phiên bản 18+)
- Đã cài đặt [Docker](https://www.docker.com/) (để chạy database Postgres nhanh chóng)

### Các bước khởi chạy nhanh:
1. **Khởi động database Postgres bằng Docker**:
   Chạy lệnh sau tại thư mục gốc dự án:
   ```bash
   docker-compose up -d
   ```
2. **Khởi chạy Backend**:
   Di chuyển vào thư mục `backend`:
   ```bash
   cd backend
   npm install
   npx prisma db push
   npm run dev
   ```
   *Backend sẽ chạy tại `http://localhost:5000`*

3. **Khởi chạy Frontend**:
   Di chuyển vào thư mục `frontend`:
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```
   *Frontend sẽ chạy tại `http://localhost:5173` và tự động proxy các request `/api` sang Backend.*
