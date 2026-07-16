import React from 'react';
import { Link } from 'react-router-dom';

// Biểu tượng danh mục mặc định dạng đường dẫn SVG (nội tuyến — không phụ thuộc bên ngoài)
const CATEGORY_ICONS = {
  default: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  ),
};

// Các cặp màu cho thẻ danh mục (nền, điểm nhấn)
const CATEGORY_COLORS = [
  { bg: 'hsl(196,40%,94%)', accent: 'hsl(196,100%,36%)' },
  { bg: 'hsl(43,60%,94%)',  accent: 'hsl(43,74%,48%)' },
  { bg: 'hsl(12,40%,94%)',  accent: 'hsl(12,60%,50%)' },
  { bg: 'hsl(270,30%,95%)', accent: 'hsl(270,50%,55%)' },
  { bg: 'hsl(152,30%,94%)', accent: 'hsl(152,60%,40%)' },
  { bg: 'hsl(340,30%,95%)', accent: 'hsl(340,60%,55%)' },
  { bg: 'hsl(220,30%,95%)', accent: 'hsl(220,60%,50%)' },
  { bg: 'hsl(30,40%,94%)',  accent: 'hsl(30,70%,50%)' },
];

/**
 * CategoryShelf — Grid of category browse cards
 */
export default function CategoryShelf({ categories = [], onSelect }) {
  if (!categories.length) return null;

  return (
    <section
      id="category-shelf"
      aria-label="Browse by Category"
      className="py-8"
      style={{ borderBottom: '1px solid hsl(0,0%,89%)' }}
    >
      <div className="page-container">
        <h2 className="section-title font-display">Browse by Category</h2>
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          }}
        >
          {categories.slice(0, 12).map((cat, i) => {
            const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
            return (
              <CategoryCard
                key={cat.id}
                category={cat}
                bg={color.bg}
                accent={color.accent}
                onSelect={onSelect}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CategoryCard({ category, bg, accent, onSelect }) {
  const handleClick = (e) => {
    if (onSelect) {
      e.preventDefault();
      onSelect(category);
    }
  };

  return (
    <Link
      to={`/products?category=${category.slug}`}
      onClick={handleClick}
      id={`category-shelf-item-${category.id}`}
      aria-label={`Browse ${category.name}`}
      className="group flex flex-col rounded-lg overflow-hidden bg-[var(--page-card-bg)] border border-[var(--page-border)] cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
      style={{ textDecoration: 'none' }}
    >
      {/* Image area */}
      <div
        className="relative flex items-center justify-center"
        style={{
          background: bg,
          paddingBottom: '66.666%',
        }}
      >
        <div
          className="absolute inset-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
          style={{ color: accent }}
        >
          {CATEGORY_ICONS.default}
        </div>
      </div>

      {/* Label */}
      <div
        className="px-3 py-2.5"
        style={{ borderTop: '1px solid var(--page-border)' }}
      >
        <span
          className="font-display text-sm font-500 leading-tight block"
          style={{
            color: 'var(--page-text)',
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            letterSpacing: '0.02em',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {category.name}
        </span>
        {category.productCount != null && (
          <span
            className="text-[10px] mt-0.5 block"
            style={{ color: 'var(--page-text-muted)' }}
          >
            {category.productCount.toLocaleString()} items
          </span>
        )}
      </div>
    </Link>
  );
}
