import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy sản phẩm." },
        { status: 404 }
      );
    }

    // Convert Decimals to numbers for easier consumption on frontend
    const formattedProduct = {
      ...product,
      startPrice: Number(product.startPrice),
      currentPrice: Number(product.currentPrice),
      buyNowPrice: product.buyNowPrice ? Number(product.buyNowPrice) : null,
    };

    return NextResponse.json({
      success: true,
      data: formattedProduct,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Đã xảy ra lỗi không xác định." },
      { status: 500 }
    );
  }
}
