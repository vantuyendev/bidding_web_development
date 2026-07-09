import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-neutral-200 dark:bg-neutral-950 dark:border-neutral-900 transition-colors duration-300 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-1.5 no-underline">
              <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
                <rect width="28" height="28" rx="6" fill="hsl(196,100%,36%)" />
                <path d="M8 20L14 8l6 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10.5 16h7" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="font-display font-extrabold text-base text-neutral-900 dark:text-white tracking-tight">
                aura<span className="text-[hsl(196,100%,36%)]">bid</span>
              </span>
            </Link>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 leading-relaxed">
              Sàn đấu giá trực tuyến uy tín và minh bạch. Kết nối người mua và người bán với công nghệ đấu giá thời gian thực vượt trội.
            </p>
          </div>

          {/* Catalog Columns */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white mb-4">
              Danh mục
            </h4>
            <ul className="space-y-2 text-xs text-neutral-400 dark:text-neutral-500">
              <li><Link to="/?category=do-dien-tu" className="hover:text-[hsl(196,100%,36%)] transition-colors">Đồ điện tử</Link></li>
              <li><Link to="/?category=thoi-trang" className="hover:text-[hsl(196,100%,36%)] transition-colors">Thời trang</Link></li>
              <li><Link to="/?category=xe-co" className="hover:text-[hsl(196,100%,36%)] transition-colors">Xe cộ</Link></li>
              <li><Link to="/?category=sach-va-suu-tam" className="hover:text-[hsl(196,100%,36%)] transition-colors">Sách & Sưu tầm</Link></li>
            </ul>
          </div>

          {/* Support Columns */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white mb-4">
              Hỗ trợ khách hàng
            </h4>
            <ul className="space-y-2 text-xs text-neutral-400 dark:text-neutral-500">
              <li><a href="#how-to-win" className="hover:text-[hsl(196,100%,36%)] transition-colors">Hướng dẫn thắng đấu giá</a></li>
              <li><a href="#faq" className="hover:text-[hsl(196,100%,36%)] transition-colors">Câu hỏi thường gặp</a></li>
              <li><a href="#rules" className="hover:text-[hsl(196,100%,36%)] transition-colors">Quy chế hoạt động</a></li>
              <li><a href="#dispute" className="hover:text-[hsl(196,100%,36%)] transition-colors">Chính sách tranh chấp</a></li>
            </ul>
          </div>

          {/* Newsletter Column */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white mb-4">
              Bản tin đấu giá
            </h4>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              Đăng ký để nhận thông báo về các phiên đấu giá hot nhất.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Email của bạn"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-transparent text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-400"
              />
              <button className="bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-bold px-4 py-2 rounded-xl text-xs hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer">
                Gửi
              </button>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-neutral-100 dark:border-neutral-900 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-neutral-400">
          <p>© {new Date().getFullYear()} AuraBid Inc. Bảo lưu mọi quyền.</p>
          <div className="flex gap-6">
            <a href="#privacy" className="hover:text-neutral-600 dark:hover:text-white transition-colors">Quyền riêng tư</a>
            <a href="#terms" className="hover:text-neutral-600 dark:hover:text-white transition-colors">Điều khoản dịch vụ</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
