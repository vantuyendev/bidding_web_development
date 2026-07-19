# 🏷️ Hệ Thống Đấu Giá Trực Tuyến

> **Nền tảng đấu giá trực tuyến mô hình C2C (Customer-to-Customer)** cho phép người dùng đăng bán sản phẩm, đặt giá thầu theo thời gian thực, quản lý ví điện tử nội bộ và giải quyết tranh chấp — tất cả thông qua giao diện web hiện đại.

---

## 📑 Mục Lục

- [Tổng Quan Dự Án](#-tổng-quan-dự-án)
- [Công Nghệ Sử Dụng](#-công-nghệ-sử-dụng)
- [Kiến Trúc Hệ Thống](#-kiến-trúc-hệ-thống)
- [Cấu Trúc Thư Mục (Directory Tree)](#-cấu-trúc-thư-mục-directory-tree)
- [Giải Thích Chi Tiết Từng Nhánh](#-giải-thích-chi-tiết-từng-nhánh)
- [Mô Hình Cơ Sở Dữ Liệu](#-mô-hình-cơ-sở-dữ-liệu)
- [Các Tính Năng Chính](#-các-tính-năng-chính)
- [Cơ Chế Nghiệp Vụ Quan Trọng](#-cơ-chế-nghiệp-vụ-quan-trọng)
- [Hướng Dẫn Cài Đặt và Chạy](#-hướng-dẫn-cài-đặt-và-chạy)
- [Biến Môi Trường](#-biến-môi-trường)
- [API Endpoints](#-api-endpoints)
- [Tác Giả](#-tác-giả)

---

## 🎯 Tổng Quan Dự Án

Đây là đồ án web xây dựng **Hệ thống đấu giá trực tuyến** theo mô hình **C2C (Customer-to-Customer)** — nơi người dùng vừa có thể là **Người mua** (đặt giá thầu) vừa có thể trở thành **Người bán** (đăng sản phẩm đấu giá) sau khi hoàn tất quy trình xác minh danh tính **KYC (Know Your Customer)**.

### Mô hình hoạt động

```
┌────────────┐     Đăng sản phẩm      ┌──────────────────┐     Đặt giá thầu     ┌────────────┐
│  NGƯỜI BÁN │ ──────────────────────>│  HỆ THỐNG ĐẤU    │<──────────────────── │  NGƯỜI MUA │
│  (Seller)  │                        │   GIÁ (BidHub)   │                      │  (Buyer)   │
└────────────┘                        └──────────────────┘                      └────────────┘
       │                                       │                                       │
       │  Nhận tiền khi giao hàng thành công   │   Đóng băng tiền vào Ví Escrow        │
       │<──────────────────────────────────────│──────────────────────────────────────>│
       │                                       │                                       │
       │          Tranh chấp? ──> Admin phân xử và hoàn tiền / giải ngân               │
```

---

## 🛠 Công Nghệ Sử Dụng

### Backend
| Công nghệ | Phiên bản | Vai trò |
|---|---|---|
| **Node.js** | 20+ | Runtime JavaScript phía server |
| **Express.js** | 5.x | Framework HTTP xử lý API RESTful |
| **Prisma ORM** | 6.19 | Ánh xạ đối tượng - quan hệ (ORM), tương tác PostgreSQL |
| **PostgreSQL** | 16 | Cơ sở dữ liệu quan hệ chính |
| **Zod** | 4.x | Xác thực & kiểm duyệt dữ liệu đầu vào (Schema Validation) |
| **bcryptjs** | 3.x | Băm (hash) và xác thực mật khẩu người dùng (bcrypt algorithm) |
| **Helmet** | 8.x | Bảo vệ HTTP Headers |
| **express-rate-limit** | 8.x | Giới hạn tần suất gọi API (Rate Limiting) |
| **node-cron** | 4.x | Lập lịch tác vụ nền (Scheduled Jobs) |
| **cookie-session** | 2.x | Quản lý phiên đăng nhập bằng cookie |

### Frontend
| Công nghệ | Phiên bản | Vai trò |
|---|---|---|
| **React** | 19.x | Thư viện giao diện người dùng (UI Library) |
| **Vite** | 8.x | Công cụ build & dev server siêu nhanh |
| **React Router** | 7.x | Điều hướng SPA (Single Page Application) |
| **Tailwind CSS** | 4.x | Framework CSS tiện ích (Utility-first CSS) |
| **Vanilla CSS** | — | Tuỳ biến giao diện nâng cao, animation |

### DevOps & Triển khai
| Công nghệ | Vai trò |
|---|---|
| **Docker** + **Docker Compose** | Container hóa ứng dụng để triển khai nhất quán |
| **Vercel** | Hosting frontend (SPA) |
| **Supabase** | Hosting PostgreSQL cloud (Production) |

---

## 🏗 Kiến Trúc Hệ Thống

Hệ thống tuân theo kiến trúc **Client-Server** phân tách rõ ràng:

```
                         ┌──────────────────────────────────────────┐
                         │              INTERNET / CLIENT           │
                         │         (Trình duyệt người dùng)        │
                         └────────────────┬─────────────────────────┘
                                          │ HTTP / HTTPS
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND (React + Vite)                          │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌─────────────┐    │
│  │ Pages   │  │Components│  │  Context  │  │   API    │  │    CSS      │    │
│  │ (trang) │  │(thành    │  │ (trạng    │  │ (gọi     │  │ (giao diện) │    │
│  │         │  │  phần)   │  │  thái)    │  │  server) │  │             │    │
│  └─────────┘  └──────────┘  └───────────┘  └──────────┘  └─────────────┘    │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │ REST API (JSON)
                                  ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                        BACKEND (Express.js + Node.js)                     │
│  ┌──────────┐  ┌────────────┐  ┌──────────┐  ┌─────────┐  ┌───────────┐   │
│  │  Routes  │─>│ Middleware │─>│Controller│─>│ Service │─>│  Prisma   │   │
│  │(định     │  │(xác thực,  │  │(xử lý    │  │(nghiệp  │  │  ORM      │   │
│  │ tuyến)   │  │ bảo mật)   │  │ logic)   │  │ vụ)     │  │           │   │
│  └──────────┘  └────────────┘  └──────────┘  └─────────┘  └─────┬─────┘   │
│  ┌──────────┐  ┌────────────┐                                   │         │
│  │ Workers  │  │   Utils    │                                   │         │
│  │(tác vụ   │  │(tiện ích   │                                   │         │
│  │ nền)     │  │ dùng chung)│                                   │         │
│  └──────────┘  └────────────┘                                   │         │
└─────────────────────────────────────────────────────────────────┼─────────┘
                                                                  │ SQL
                                                                  ▼
                                                    ┌──────────────────────┐
                                                    │   PostgreSQL 16      │
                                                    │   (Cơ sở dữ liệu)    │
                                                    └──────────────────────┘
```

---

## 📂 Cấu Trúc Thư Mục (Directory Tree)

```
bidding_web_development/
│
├── 📄 docker-compose.yml          # Cấu hình Docker Compose chạy toàn bộ hệ thống
├── 📄 .gitignore                  # Danh sách file/thư mục Git bỏ qua
├── 📄 README.md                   # Tài liệu hướng dẫn dự án (file này)
│
├── 📁 backend/                    # ===== MÃ NGUỒN PHÍA SERVER (API) =====
│   ├── 📄 package.json            # Khai báo thư viện & script chạy backend
│   ├── 📄 Dockerfile              # Đóng gói backend thành Docker image
│   ├── 📄 schema.sql              # Cấu trúc database SQL thuần (tham khảo)
│   ├── 📄 .env                    # Biến môi trường (database URL, secret key...)
│   │
│   ├── 📁 prisma/                 # --- Lớp cơ sở dữ liệu (Database Layer) ---
│   │   ├── 📄 schema.prisma       # Định nghĩa toàn bộ bảng & quan hệ database
│   │   ├── 📄 seed.js             # Script tạo dữ liệu mẫu ban đầu
│   │   └── 📄 set-admin.js        # Script nâng quyền Admin cho tài khoản
│   │
│   └── 📁 src/                    # --- Mã nguồn chính backend ---
│       ├── 📄 server.js           # Điểm khởi chạy server Express
│       │
│       ├── 📁 controllers/        # Xử lý logic nghiệp vụ cho từng API
│       │   ├── 📄 authController.js           # Đăng ký, đăng nhập, đăng xuất
│       │   ├── 📄 userController.js           # Hồ sơ, KYC, ví tiền người dùng
│       │   ├── 📄 productController.js        # CRUD sản phẩm đấu giá
│       │   ├── 📄 bidController.js            # Đặt giá thầu & đấu giá tự động
│       │   ├── 📄 orderController.js          # Quản lý đơn hàng sau đấu giá
│       │   ├── 📄 disputeController.js        # Tranh chấp & xử lý Escrow
│       │   ├── 📄 reviewController.js         # Đánh giá người bán/mua
│       │   ├── 📄 notificationController.js   # Thông báo cho người dùng
│       │   ├── 📄 watchlistController.js      # Danh sách theo dõi sản phẩm
│       │   ├── 📄 streamController.js         # SSE (Server-Sent Events) realtime
│       │   ├── 📄 shippingController.js       # API tính phí vận chuyển
│       │   ├── 📄 orderMessageController.js   # Nhắn tin trong đơn hàng
│       │   ├── 📄 settingController.js        # Cài đặt hệ thống (thông tin ngân hàng nạp tiền)
│       │   └── 📄 adminController.js          # Quản trị hệ thống (Admin)
│       │
│       ├── 📁 routes/             # Định tuyến URL tới Controller tương ứng
│       │   ├── 📄 authRoutes.js               # /api/auth/*
│       │   ├── 📄 userRoutes.js               # /api/users/*
│       │   ├── 📄 productRoutes.js            # /api/products/*
│       │   ├── 📄 bidRoutes.js                # /api/bids/*
│       │   ├── 📄 orderRoutes.js              # /api/orders/*
│       │   ├── 📄 disputeRoutes.js            # /api/disputes/*
│       │   ├── 📄 reviewRoutes.js             # /api/reviews/*
│       │   ├── 📄 notificationRoutes.js       # /api/notifications/*
│       │   ├── 📄 watchlistRoutes.js          # /api/watchlist/*
│       │   ├── 📄 shippingRoutes.js           # /api/shipping/*
│       │   ├── 📄 categoryRoutes.js           # /api/categories/*
│       │   └── 📄 adminRoutes.js              # /api/admin/*
│       │
│       ├── 📁 middlewares/        # Lớp trung gian xử lý trước khi vào Controller
│       │   ├── 📄 authMiddleware.js           # Kiểm tra phiên đăng nhập (Session)
│       │   ├── 📄 errorMiddleware.js          # Bắt lỗi tập trung toàn hệ thống
│       │   └── 📄 xssClean.js                # Lọc mã độc XSS trong dữ liệu đầu vào
│       │
│       ├── 📁 services/           # Tầng nghiệp vụ phức tạp (Business Logic)
│       │   ├── 📄 shippingService.js          # Tính phí ship theo vùng & khối lượng
│       │   └── 📄 walletService.js            # Nạp/rút/đóng băng ví điện tử
│       │
│       ├── 📁 workers/            # Tác vụ chạy nền theo lịch (Background Jobs)
│       │   └── 📄 auctionWorker.js            # Tự động kết thúc phiên đấu giá hết hạn
│       │
│       └── 📁 utils/              # Hàm tiện ích dùng chung
│           ├── 📄 ApiError.js                 # Class lỗi tùy chỉnh (status code + message)
│           ├── 📄 cache.js                    # Bộ nhớ đệm dữ liệu (In-memory Cache)
│           ├── 📄 eventEmitter.js             # Bus sự kiện cho đấu giá realtime
│           ├── 📄 notificationEmitter.js      # Bus sự kiện cho thông báo
│           ├── 📄 logger.js                   # Ghi log hệ thống (Console Logger)
│           └── 📄 slugify.js                  # Chuyển đổi tên thành URL-friendly slug
│
└── 📁 frontend/                   # ===== MÃ NGUỒN PHÍA GIAO DIỆN (UI) =====
    ├── 📄 package.json            # Khai báo thư viện & script chạy frontend
    ├── 📄 vite.config.js          # Cấu hình Vite (proxy API, plugin React)
    ├── 📄 index.html              # Trang HTML gốc (entry point)
    ├── 📄 Dockerfile              # Đóng gói frontend thành Docker image
    ├── 📄 nginx.conf              # Cấu hình Nginx phục vụ SPA trên production
    ├── 📄 vercel.json             # Cấu hình triển khai lên Vercel
    │
    └── 📁 src/                    # --- Mã nguồn chính frontend ---
        ├── 📄 main.jsx            # Điểm khởi chạy ứng dụng React
        ├── 📄 App.jsx             # Component gốc, định tuyến toàn ứng dụng
        ├── 📄 api.js              # Module gọi API backend (fetch wrapper)
        ├── 📄 index.css           # Stylesheet toàn cục (design tokens, animations)
        │
        ├── 📁 context/            # React Context — Quản lý trạng thái toàn cục
        │   ├── 📄 AuthContext.jsx             # Trạng thái đăng nhập/đăng xuất
        │   └── 📄 ThemeContext.jsx            # Trạng thái giao diện Sáng/Tối
        │
        ├── 📁 components/         # Thành phần UI tái sử dụng
        │   ├── 📄 Navbar.jsx                  # Thanh điều hướng chính
        │   ├── 📄 Header.jsx                  # Phần đầu trang
        │   ├── 📄 HeroBanner.jsx              # Banner quảng cáo trang chủ
        │   ├── 📄 CatalogCard.jsx             # Thẻ hiển thị sản phẩm (Catalog)
        │   ├── 📄 CategoryShelf.jsx           # Kệ danh mục sản phẩm
        │   ├── 📄 ProductCard.jsx             # Thẻ hiển thị sản phẩm (chi tiết)
        │   ├── 📄 CountdownTimer.jsx          # Bộ đếm ngược thời gian đấu giá
        │   ├── 📄 CreateAuctionModal.jsx      # Modal tạo phiên đấu giá mới
        │   ├── 📄 ReviewModal.jsx             # Modal đánh giá người bán
        │   ├── 📄 AdminRoute.jsx              # Route bảo vệ trang Admin
        │   ├── 📄 PrivateRoute.jsx            # Route bảo vệ trang yêu cầu đăng nhập
        │   │
        │   ├── 📁 ui/             # Thành phần UI cơ bản (Design System)
        │   │   ├── 📄 Button.jsx              # Nút bấm tùy biến
        │   │   ├── 📄 Input.jsx               # Ô nhập liệu tùy biến
        │   │   ├── 📄 Modal.jsx               # Cửa sổ hộp thoại bật lên
        │   │   ├── 📄 Badge.jsx               # Nhãn trạng thái (tag)
        │   │   ├── 📄 Toast.jsx               # Thông báo nổi (toast notification)
        │   │   ├── 📄 CountdownBadge.jsx      # Nhãn đếm ngược mini
        │   │   ├── 📄 SkeletonCard.jsx        # Hiệu ứng loading (skeleton)
        │   │   └── 📄 WatchlistButton.jsx     # Nút thêm/xóa yêu thích
        │   │
        │   └── 📁 layout/         # Thành phần bố cục trang
        │       ├── 📄 MainLayout.jsx          # Bố cục chính (Header + Content + Footer)
        │       ├── 📄 Footer.jsx              # Chân trang
        │       └── 📄 OfflineBanner.jsx       # Thông báo mất kết nối Internet
        │
        └── 📁 pages/              # Các trang giao diện
            ├── 📄 AuthPage.jsx                # Trang đăng nhập / đăng ký
            ├── 📄 HomePage.jsx                # Trang chủ (sản phẩm nổi bật)
            ├── 📄 ProductDetail.jsx           # Trang chi tiết sản phẩm + đặt thầu
            ├── 📄 UserProfile.jsx             # Trang hồ sơ người dùng
            ├── 📄 DisputeDetail.jsx           # Trang chi tiết tranh chấp
            │
            ├── 📁 catalog/        # Trang danh mục sản phẩm
            │   └── 📄 CatalogPage.jsx         # Duyệt & tìm kiếm sản phẩm
            │
            ├── 📁 dashboard/      # Bảng điều khiển người dùng
            │   ├── 📄 WalletDashboard.jsx     # Quản lý ví tiền (nạp/rút/lịch sử)
            │   ├── 📄 BidHistory.jsx          # Lịch sử đấu giá đã tham gia
            │   ├── 📄 WonAuctions.jsx         # Danh sách đấu giá đã thắng
            │   ├── 📄 SellerListings.jsx      # Quản lý sản phẩm đang bán
            │   ├── 📄 KycSubmission.jsx       # Gửi hồ sơ xác minh người bán (KYC)
            │   ├── 📄 UserDisputes.jsx        # Danh sách tranh chấp của tôi
            │   ├── 📄 NotificationsPage.jsx   # Trang thông báo
            │   ├── 📄 UserSettings.jsx        # Cài đặt tài khoản
            │   └── 📄 Watchlist.jsx           # Danh sách theo dõi yêu thích
            │
            └── 📁 admin/          # Trang quản trị viên (Admin Panel)
                ├── 📄 AdminDashboard.jsx      # Bảng tổng quan hệ thống
                ├── 📄 AdminLayout.jsx         # Bố cục riêng cho trang Admin (sidebar + nav)
                ├── 📄 AdminUsers.jsx          # Quản lý người dùng (ban/unban)
                ├── 📄 AdminAuctions.jsx       # Quản lý phiên đấu giá
                ├── 📄 AdminProductApproval.jsx# Duyệt sản phẩm đăng bán
                ├── 📄 AdminCategories.jsx     # Quản lý danh mục sản phẩm
                ├── 📄 AdminWalletRequests.jsx # Duyệt yêu cầu nạp/rút tiền
                ├── 📄 AdminSettings.jsx       # Cài đặt thông tin ngân hàng & QR nạp tiền
                ├── 📄 KycApproval.jsx         # Duyệt hồ sơ KYC người bán
                ├── 📄 DisputeManagement.jsx   # Quản lý & phân xử tranh chấp
                └── 📄 AdminAuditLogs.jsx      # Nhật ký hoạt động hệ thống
```

---

## 📖 Giải Thích Chi Tiết Từng Nhánh

### 🔵 `backend/` — Máy chủ API (Server-side)

Đây là nơi chứa toàn bộ **logic xử lý phía server**, tiếp nhận và phản hồi các yêu cầu HTTP từ frontend.

#### 📁 `backend/prisma/` — Lớp Cơ Sở Dữ Liệu

| File | Giải thích |
|---|---|
| `schema.prisma` | **Bản thiết kế database.** Định nghĩa tất cả 18 bảng dữ liệu (User, Product, Bid, Transaction, Dispute...) và các mối quan hệ giữa chúng. Prisma ORM đọc file này để tự động sinh ra code truy vấn database (Prisma Client). |
| `seed.js` | **Script khởi tạo dữ liệu mẫu.** Chạy bằng lệnh `npx prisma db seed`, tạo sẵn danh mục sản phẩm, tài khoản demo... để hệ thống có dữ liệu hiển thị ngay sau khi cài đặt. |
| `set-admin.js` | **Script nâng quyền Admin.** Chạy bằng `node prisma/set-admin.js` kèm email, sẽ set trường `isAdmin = true` cho tài khoản đó, cho phép truy cập trang quản trị. |

#### 📁 `backend/src/controllers/` — Bộ Điều Khiển (Controller Layer)

Mỗi controller chịu trách nhiệm **xử lý logic nghiệp vụ** cho một nhóm chức năng cụ thể. Đây là nơi chứa phần lớn code "não bộ" của hệ thống.

| File | Nhóm chức năng | Mô tả chi tiết |
|---|---|---|
| `authController.js` | Xác thực | **Đăng ký**: băm mật khẩu bằng `bcrypt` (cost factor 12) trước khi lưu vào DB. **Đăng nhập**: xác thực mật khẩu bằng `bcrypt.compare()`, tạo session cookie. **Đăng xuất**: xoá session. |
| `userController.js` | Người dùng & KYC | Quản lý hồ sơ cá nhân, **quy trình KYC** (nộp CCCD, ảnh, địa chỉ cửa hàng → Admin duyệt → trở thành Người bán), quản lý ví tiền (nạp/rút/xem số dư). Tích hợp thông tin ngân hàng động từ `SystemSetting`. |
| `productController.js` | Sản phẩm | Tạo, sửa, xoá, tìm kiếm sản phẩm đấu giá. Hỗ trợ lọc theo danh mục, giá, trạng thái. Upload hình ảnh. |
| `bidController.js` | Đấu giá | **Cốt lõi hệ thống.** Xử lý đặt thầu với cơ chế: bước giá biến thiên, khoá dòng database (`FOR UPDATE`), đấu giá tự động (Proxy Bidding), bảo vệ thầu phút chót (Sniping Protection). |
| `orderController.js` | Đơn hàng | Tạo đơn hàng sau khi đấu giá kết thúc, cập nhật trạng thái vận chuyển, xác nhận nhận hàng. |
| `disputeController.js` | Tranh chấp & Escrow | Mở tranh chấp, gửi/đồng bộ bằng chứng (video khui hộp unboxing), **Admin phân xử** (hoàn tiền cho người mua HOẶC giải ngân cho người bán) thông qua cơ chế ví ký quỹ (Escrow). |
| `reviewController.js` | Đánh giá | Người mua/bán đánh giá nhau sau giao dịch (1-5 sao + nhận xét), cập nhật điểm uy tín. |
| `streamController.js` | Thời gian thực | **Server-Sent Events (SSE)** — đẩy dữ liệu đấu giá (giá thầu mới, thời gian...) từ server xuống trình duyệt ngay lập tức mà không cần client hỏi liên tục. |
| `notificationController.js` | Thông báo | Lấy danh sách, đánh dấu đã đọc thông báo (trúng thầu, bị outbid, đơn hàng mới...). |
| `watchlistController.js` | Theo dõi | Thêm/xoá sản phẩm vào danh sách yêu thích để theo dõi giá. |
| `shippingController.js` | Vận chuyển | API endpoint tính phí vận chuyển (uỷ quyền cho `shippingService`). |
| `orderMessageController.js` | Nhắn tin đơn hàng | Cho phép người mua và người bán trao đổi tin nhắn trong đơn hàng. |
| `settingController.js` | Cài đặt hệ thống | **Mới.** Đọc/ghi cài đặt toàn cục (bảng `system_settings`): tên ngân hàng, số tài khoản, tên chủ tài khoản, URL ảnh QR, nội dung hướng dẫn nạp tiền tùy chỉnh. Fallback sang biến `.env` nếu chưa cấu hình. |
| `adminController.js` | Quản trị | Dashboard admin, quản lý người dùng (ban/unban), duyệt sản phẩm, xử lý yêu cầu nạp/rút tiền, nhật ký kiểm toán (Audit Log). |

#### 📁 `backend/src/routes/` — Định Tuyến (Routing Layer)

Ánh xạ **đường dẫn URL** (`/api/bids`, `/api/products`...) tới hàm xử lý tương ứng trong Controller. Mỗi route file khai báo phương thức HTTP (GET/POST/PUT/DELETE) và các middleware bảo vệ (yêu cầu đăng nhập, quyền admin...).

**Luồng xử lý:** `Client → Route → Middleware → Controller → Service → Database`

#### 📁 `backend/src/middlewares/` — Lớp Trung Gian (Middleware Layer)

Middleware là các hàm "chặn cổng" chạy **trước khi** request tới Controller:

| File | Vai trò |
|---|---|
| `authMiddleware.js` | **Kiểm tra phiên đăng nhập.** Đọc session cookie, xác minh `userId` tồn tại. Nếu chưa đăng nhập → trả lỗi 401. |
| `errorMiddleware.js` | **Bộ xử lý lỗi trung tâm.** Bắt tất cả lỗi phát sinh trong hệ thống (lỗi nghiệp vụ `ApiError`, lỗi validation `ZodError`, lỗi payload quá lớn `413`, lỗi server `500`) và trả về phản hồi JSON chuẩn hóa. |
| `xssClean.js` | **Lọc mã độc XSS.** Quét dữ liệu trong `req.body`, `req.query`, `req.params` để loại bỏ các đoạn script nguy hiểm trước khi xử lý. |

#### 📁 `backend/src/services/` — Tầng Nghiệp Vụ (Service Layer)

Tách riêng logic nghiệp vụ phức tạp ra khỏi Controller để code **dễ bảo trì và tái sử dụng**:

| File | Vai trò |
|---|---|
| `shippingService.js` | **Tính phí vận chuyển.** Áp dụng công thức trọng lượng quy đổi (Volumetric Weight) theo chuẩn logistics quốc tế `(D×R×C) / 5000`, so sánh với cân nặng thực (`Math.max`), rồi tra bảng phí theo vùng địa lý (Nội tỉnh / Nội miền / Liên miền). |
| `walletService.js` | **Quản lý ví điện tử.** Xử lý nạp tiền, rút tiền, đóng băng số dư (Escrow), giải phóng tiền đóng băng khi giao dịch hoàn tất. |

#### 📁 `backend/src/workers/` — Tác Vụ Nền (Background Workers)

| File | Vai trò |
|---|---|
| `auctionWorker.js` | **Worker kết thúc đấu giá.** Chạy định kỳ bằng `node-cron`, quét database tìm các phiên đấu giá đã hết thời gian → tự động chuyển trạng thái sang `ENDED`, xác định người thắng cuộc, tạo đơn hàng và thông báo. |

#### 📁 `backend/src/utils/` — Tiện Ích Dùng Chung

| File | Vai trò |
|---|---|
| `ApiError.js` | Class lỗi tuỳ chỉnh kế thừa `Error`, mang theo `statusCode` (400, 401, 403, 404, 500) để middleware lỗi trả về HTTP status chính xác. |
| `cache.js` | Bộ nhớ đệm in-memory (dùng `Map`) lưu trữ tạm dữ liệu truy vấn thường xuyên (danh mục, cấu hình...) để giảm tải database. |
| `eventEmitter.js` | Bus sự kiện dùng Node.js `EventEmitter` để phát sự kiện đấu giá (giá thầu mới, phiên kết thúc) cho SSE controller lắng nghe và đẩy xuống client. |
| `notificationEmitter.js` | Bus sự kiện riêng cho thông báo người dùng (thông báo trúng thầu, bị vượt giá, đơn hàng mới...). |
| `logger.js` | Module ghi log chuẩn hoá (info, warn, error) với timestamp, giúp debug và giám sát hệ thống. |
| `slugify.js` | Chuyển đổi chuỗi tiếng Việt có dấu thành dạng URL thân thiện (VD: `"Điện thoại Samsung"` → `"dien-thoai-samsung"`). |

---

### 🟢 `frontend/` — Giao Diện Người Dùng (Client-side)

Ứng dụng React được build bằng Vite, hiển thị giao diện và tương tác với backend qua REST API.

#### 📁 `frontend/src/context/` — Quản Lý Trạng Thái Toàn Cục

Sử dụng **React Context API** để chia sẻ trạng thái giữa các component mà không cần truyền props nhiều tầng (tránh "prop drilling"):

| File | Vai trò |
|---|---|
| `AuthContext.jsx` | Lưu trạng thái đăng nhập (`user`, `isLoggedIn`), cung cấp hàm `login()`, `logout()`, `checkAuth()` cho toàn bộ ứng dụng. |
| `ThemeContext.jsx` | Quản lý chế độ giao diện Sáng / Tối (Light / Dark mode). |

#### 📁 `frontend/src/components/` — Thành Phần UI Tái Sử Dụng

Các component được thiết kế theo nguyên tắc **tách biệt trách nhiệm**: mỗi component làm đúng một việc và có thể tái sử dụng ở nhiều trang.

- **`ui/`**: Thành phần UI nguyên tử (Button, Input, Modal, Badge, Toast...) — tạo thành **Design System** nhất quán.
- **`layout/`**: Thành phần bố cục (MainLayout bao gồm Header + Content + Footer, OfflineBanner hiện khi mất mạng).
- **Component cấp trang**: Navbar, HeroBanner, CatalogCard, CountdownTimer, CreateAuctionModal...

#### 📁 `frontend/src/pages/` — Các Trang Giao Diện

Mỗi file `.jsx` tương ứng với **một trang** (route) trong ứng dụng:

| Thư mục / File | Trang | Mô tả |
|---|---|---|
| `AuthPage.jsx` | `/auth` | Đăng nhập / Đăng ký tài khoản (gửi email + mật khẩu, xác thực bcrypt phía backend) |
| `HomePage.jsx` | `/` | Trang chủ (banner, sản phẩm nổi bật, danh mục) |
| `ProductDetail.jsx` | `/product/:id` | Chi tiết sản phẩm + khu vực đặt thầu realtime |
| `catalog/CatalogPage.jsx` | `/catalog` | Duyệt & tìm kiếm toàn bộ sản phẩm |
| `dashboard/WalletDashboard.jsx` | `/dashboard/wallet` | Quản lý ví tiền — hiển thị QR nạp tiền tùy chỉnh (hoặc VietQR mặc định) & hướng dẫn chuyển khoản từ cài đặt Admin |
| `dashboard/BidHistory.jsx` | `/dashboard/bids` | Lịch sử tham gia đấu giá |
| `dashboard/SellerListings.jsx` | `/profile/listings` | Quản lý sản phẩm đang bán (dành cho Seller) |
| `dashboard/WonAuctions.jsx` | `/profile/won-auctions` | Danh sách phiên đấu giá đã thắng |
| `dashboard/KycSubmission.jsx` | `/dashboard/kyc` | Gửi hồ sơ xác minh danh tính (KYC) |
| `dashboard/Watchlist.jsx` | `/profile/watchlist` | Danh sách sản phẩm đang theo dõi |
| `admin/AdminDashboard.jsx` | `/admin` | Tổng quan hệ thống (thống kê, biểu đồ) |
| `admin/AdminSettings.jsx` | `/admin/settings` | **Mới.** Cài đặt thông tin ngân hàng & QR code cho trang nạp tiền của người dùng |
| `admin/KycApproval.jsx` | `/admin/kyc` | Admin duyệt / từ chối hồ sơ KYC |
| `admin/DisputeManagement.jsx` | `/admin/disputes` | Admin phân xử tranh chấp |

---

### Bảng chính & ý nghĩa

| Bảng | Ý nghĩa |
|---|---|
| **User** | Người dùng (chứa thông tin ví: `walletBalance`, `frozenBalance`, trạng thái KYC, quyền Admin) |
| **Product** | Sản phẩm đấu giá (giá khởi điểm, giá hiện tại, thời gian bắt đầu/kết thúc, trạng thái) |
| **Category** | Danh mục sản phẩm (Điện tử, Thời trang, Xe cộ...) |
| **Bid** | Lượt đặt giá thầu (ai, sản phẩm nào, giá bao nhiêu, thời điểm nào) |
| **Transaction** | Giao dịch ví tiền (nạp, rút, thanh toán, hoàn tiền — với loại & trạng thái) |
| **WalletRequest** | Yêu cầu nạp/rút tiền chờ Admin duyệt |
| **DisputeTicket** | Phiếu tranh chấp giữa người mua & bán |
| **DisputeMessage** | Tin nhắn / bằng chứng trong phiếu tranh chấp |
| **Review** | Đánh giá sau giao dịch (1-5 sao) |
| **Notification** | Thông báo hệ thống gửi tới người dùng |
| **AuditLog** | Nhật ký kiểm toán ghi lại mọi hành động quan trọng của Admin |
| **Watchlist** | Danh sách sản phẩm người dùng đang theo dõi |
| **SystemSetting** | **Mới.** Bảng key-value lưu cài đặt toàn cục: thông tin ngân hàng, URL ảnh QR, hướng dẫn nạp tiền tùy chỉnh |

---

## ⚡ Các Tính Năng Chính

### 👤 Hệ thống Người dùng
- Đăng ký / Đăng nhập / Đăng xuất (cookie-session)
- **Mật khẩu băm bằng bcrypt** (cost factor 12) — mật khẩu không bao giờ lưu dạng plain-text
- Quản lý hồ sơ cá nhân & avatar
- Xác minh danh tính người bán (KYC) qua CCCD
- Hệ thống ban/unban người dùng vi phạm

### 🏷️ Quản lý Sản phẩm
- CRUD sản phẩm đấu giá với hình ảnh
- Hệ thống danh mục & thuộc tính động
- Duyệt sản phẩm bởi Admin trước khi đăng
- Tìm kiếm & lọc nâng cao

### 🔨 Đấu giá Thời gian thực
- Đặt giá thầu với **bước giá biến thiên** (tự tăng bước giá theo mức giá hiện tại)
- **Đấu giá tự động (Proxy Bidding)**: đặt giá tối đa, hệ thống tự đấu hộ
- **Bảo vệ thầu phút chót (Anti-Sniping)**: tự gia hạn 2 phút nếu có thầu trong 30 giây cuối
- Cập nhật giá realtime qua **Server-Sent Events (SSE)**
- Bộ đếm ngược chính xác tới giây

### 💰 Ví Điện tử & Thanh toán
- Ví nội bộ với nạp/rút/lịch sử giao dịch
- **Cơ chế Escrow (Ký quỹ)**: đóng băng tiền khi đặt thầu, giải phóng khi giao dịch kết thúc
- Admin duyệt yêu cầu nạp/rút tiền
- **Admin cấu hình thông tin ngân hàng nạp tiền**: tên ngân hàng, số tài khoản, ảnh QR tùy chỉnh và hướng dẫn chuyển khoản (lưu trong bảng `system_settings`)

### 🚚 Giao Hàng & Theo Dõi Hành Trình (Test Sandbox)
- **Tích hợp API bưu cục GHN & GHTK**: Tự động tính phí vận chuyển theo khoảng cách địa lý (Nội tỉnh / Nội miền / Liên miền) kết hợp khối lượng quy đổi `(D×R×C) / 5000` của sản phẩm.
- **Đăng ký vận đơn tự động**: Khi người bán bấm gửi hàng, hệ thống tự động kết nối API đối tác logistics để tạo vận đơn và nhận mã tracking.
- **In phiếu giao hàng chuyên nghiệp**: Người bán có thể in trực tiếp nhãn vận đơn từ trình duyệt với bố cục chuẩn hóa và mã vạch (barcode) dựng bằng CSS sắc nét.
- **Webhook cập nhật hành trình tự động**: Nhận dữ liệu cập nhật trạng thái thời gian thực từ các bưu cục vận chuyển để cập nhật lộ trình thực tế cho người dùng theo dõi.
- **Tác vụ đồng bộ nền (Sync Worker)**: Chạy định kỳ để tự động gọi API tra cứu trạng thái bưu kiện trực tiếp đề phòng sự cố gián đoạn Webhook hoặc lỗi chữ ký bảo mật.

### ⚖️ Tranh chấp & Bảo vệ Giao dịch
- Mở tranh chấp khi có vấn đề đơn hàng
- Gửi bằng chứng (hình ảnh, tin nhắn)
- Admin phân xử: hoàn tiền hoặc giải ngân

### 🛡️ Bảo mật
- **bcrypt password hashing**: mật khẩu được băm với salt factor 12, không thể đảo ngược
- **Helmet**: bảo vệ HTTP headers
- **Rate Limiting**: giới hạn 100 req/15 phút/IP
- **XSS Filter**: lọc mã độc đầu vào
- **HPP**: chống ô nhiễm tham số HTTP
- **CORS**: kiểm soát nguồn gốc truy cập
- **Cookie-session** với key ký mã hoá

---

## 🔧 Cơ Chế Nghiệp Vụ Quan Trọng

### 1. Đấu giá với Khoá Dòng (Row Locking)
```
Người A gửi thầu ──┐
                   │   Transaction + SELECT ... FOR UPDATE
Người B gửi thầu ──┤   → Khoá dòng sản phẩm trong database
                   │   → Chỉ 1 người được xử lý tại 1 thời điểm
Người C gửi thầu ──┘   → Tránh xung đột Race Condition
```

### 2. Ví Ký quỹ Escrow
```
Người mua đặt thầu → Tiền bị đóng băng (frozenBalance += amount)
         │
         ├── Giao hàng thành công → Tiền giải ngân cho Người bán
         │
         └── Tranh chấp → Admin phân xử:
                ├── Hoàn tiền → frozenBalance -= amount, walletBalance += amount (Người mua)
                └── Giải ngân → frozenBalance -= amount, walletBalance += amount (Người bán)
```

### 3. Server-Sent Events (SSE)
```
Client mở kết nối HTTP ──────────────────────────────────────> Server
         <── headers: Content-Type: text/event-stream ──────── Server
         <── data: {"newBid": 500000, "user": "Tuyên"} ────── Server (khi có thầu mới)
         <── : heartbeat ──────────────────────────────────── Server (mỗi 30 giây)
         <── data: {"timeExtended": true} ─────────────────── Server (khi gia hạn)
```

### 4. Quy Trình Vận Chuyển và Đồng Bộ Lộ Trình
```
Người Bán bấm ship ──> API đối tác (GHN/GHTK) ──> Nhận Tracking Code ──> Cập nhật status 'SHIPPED'
                             │
                             ├── Webhook hoạt động ──> POST /api/shipping/webhook ──> Cập nhật log hành trình
                             │
                             └── Webhook bị lỗi ──> Sync Worker (2 phút/lần) ──> Tra cứu trực tiếp bưu cục ──┘
```

---

## 🚀 Hướng Dẫn Cài Đặt và Chạy

### Yêu cầu hệ thống
- **Node.js** >= 20.x
- **PostgreSQL** >= 16 (hoặc dùng Docker)
- **npm** >= 10.x

### Cách 1: Chạy thủ công (Development)

```bash
# 1. Clone dự án
git clone https://github.com/vantuyendev/bidding_web_development.git
cd bidding_web_development

# 2. Cài đặt thư viện Backend
cd backend
npm install

# 3. Cấu hình biến môi trường
# Sao chép file .env.example thành .env và điền thông tin database
cp .env.example .env

# 4. Khởi tạo database
npx prisma generate       # Tạo Prisma Client
npx prisma db push         # Đồng bộ schema lên database
npx prisma db seed         # Tạo dữ liệu mẫu

# 5. Chạy Backend (port 5000)
npm run dev

# 6. Mở terminal mới — Cài đặt Frontend
cd ../frontend
npm install

# 7. Chạy Frontend (port 5173)
npm run dev
```

### Cách 2: Chạy bằng Docker Compose

```bash
# Khởi chạy toàn bộ hệ thống (Backend + Frontend + PostgreSQL)
docker-compose up --build

# Frontend: http://localhost:3000
# Backend:  http://localhost:5000
# Database: localhost:5432
```

### Nâng quyền Admin

```bash
cd backend
node prisma/set-admin.js your-email@example.com
```

---

## 🔐 Biến Môi Trường

Tạo file `backend/.env` với nội dung:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/auction_db"
DIRECT_URL="postgresql://user:password@localhost:5432/auction_db"

# Server
PORT=5000
NODE_ENV=development

# Session
SESSION_KEY_1="your-secret-key-1"
SESSION_KEY_2="your-secret-key-2"

# Frontend URL (CORS)
CLIENT_URL="http://localhost:5173"
```

---

## 📡 API Endpoints

| Nhóm | Prefix | Mô tả |
|---|---|---|
| 🔑 Xác thực | `/api/auth` | Đăng ký, đăng nhập, đăng xuất, kiểm tra session |
| 👤 Người dùng | `/api/users` | Hồ sơ, KYC, ví tiền, cài đặt |
| 🏷️ Sản phẩm | `/api/products` | CRUD sản phẩm, tìm kiếm, lọc |
| 🔨 Đấu giá | `/api/bids` | Đặt thầu, lịch sử thầu |
| 📦 Đơn hàng | `/api/orders` | Tạo, cập nhật, nhắn tin đơn hàng |
| ⚖️ Tranh chấp | `/api/disputes` | Mở, cập nhật, phân xử tranh chấp |
| ⭐ Đánh giá | `/api/reviews` | Đánh giá người bán/mua |
| 🔔 Thông báo | `/api/notifications` | Lấy, đánh dấu đã đọc |
| 👁️ Theo dõi | `/api/watchlist` | Thêm/xoá sản phẩm yêu thích |
| 🚚 Vận chuyển | `/api/shipping` | Tính phí vận chuyển |
| 📂 Danh mục | `/api/categories` | Danh sách danh mục & thuộc tính |
| 🛡️ Admin | `/api/admin` | Quản trị hệ thống (yêu cầu quyền Admin) |
| ⚙️ Cài đặt ngân hàng | `GET /api/admin/bank-settings` | Lấy thông tin ngân hàng hiện tại (Admin) |
| ⚙️ Cài đặt ngân hàng | `PUT /api/admin/bank-settings` | Cập nhật thông tin ngân hàng & QR nạp tiền (Admin) |

---

## ✍️ Tác Giả

- **DEV**: Văn Tuyên
- **GitHub**: [vantuyendev](https://github.com/vantuyendev)
- **Project**: Hệ thống đấu giá trực tuyến 

---

> 📌 **Ghi chú**: Toàn bộ mã nguồn đã được bổ sung ghi chú bằng **tiếng Việt** chi tiết, giải thích rõ ràng từng cơ chế nghiệp vụ phức tạp (Escrow, Row Locking, SSE, KYC, Proxy Bidding, Sniping Protection...) để phục vụ việc thuyết trình và bảo vệ đồ án.
