import React from 'react';
import { useParams } from 'react-router-dom';

export default function ProductDetail() {
  const { id } = useParams();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 p-6 text-center">
      <h1 className="text-4xl font-bold text-zinc-900 mb-4">Chi Tiết Sản Phẩm</h1>
      <p className="text-zinc-600 mb-2">Đang hiển thị thông tin chi tiết cho sản phẩm có mã:</p>
      <code className="px-3 py-1.5 bg-zinc-200 text-zinc-800 rounded font-mono text-sm">{id}</code>
    </div>
  );
}
