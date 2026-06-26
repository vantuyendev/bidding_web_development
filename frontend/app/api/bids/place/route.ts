import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

export async function POST(request: Request) {
  // 1. Giả lập Xác thực (Authentication Mock)
  const userId = "4a4b27c6-7de1-460d-bc78-8314ffba99c0";

  try {
    // 2. Đọc Request Body
    const { productId, bidAmount } = await request.json();

    if (!productId || bidAmount === undefined || bidAmount === null) {
      return NextResponse.json(
        { success: false, error: "Thiếu productId hoặc bidAmount trong request body." },
        { status: 400 }
      );
    }

    // Chuyển đổi bidAmount thành đối tượng Decimal để so sánh chính xác
    const bidDecimal = new Decimal(bidAmount);

    if (bidDecimal.isNaN() || bidDecimal.isNegative()) {
      return NextResponse.json(
        { success: false, error: "Giá trị đặt giá không hợp lệ." },
        { status: 400 }
      );
    }

    // 3. Thực hiện Database Transaction bảo mật cao
    const result = await prisma.$transaction(async (tx) => {
      // Đảm bảo user giả lập tồn tại trong DB để tránh lỗi khoá ngoại (Foreign Key Constraint)
      await tx.user.upsert({
        where: { id: userId },
        update: {},
        create: {
          id: userId,
          email: `mock_user_${userId.slice(0, 8)}@example.com`,
          passwordHash: "$2b$10$mockpasswordhashplaceholder",
          balance: new Decimal(10000000.00),
        },
      });

      // Row-level Locking: Khoá hàng sản phẩm để chống Race Condition khi nhiều người cùng bid
      const products = await tx.$queryRaw<any[]>`
        SELECT * FROM "products" WHERE id = ${productId} FOR UPDATE
      `;

      if (!products || products.length === 0) {
        throw new Error("Sản phẩm không tồn tại");
      }

      const product = products[0];
      const now = new Date();
      const endTime = new Date(product.end_time);

      // Kiểm tra thời gian kết thúc đấu giá
      if (now > endTime) {
        throw new Error("Buổi đấu giá đã kết thúc");
      }

      // Kiểm tra giá đặt (phải lớn hơn giá hiện tại)
      const currentPriceDecimal = new Decimal(product.current_price);
      if (bidDecimal.lte(currentPriceDecimal)) {
        throw new Error("Giá đặt phải lớn hơn giá hiện tại");
      }

      // Tạo lượt đặt giá mới
      await tx.bid.create({
        data: {
          productId: product.id,
          userId: userId,
          bidAmount: bidDecimal,
          status: "success",
        },
      });

      // Chống cướp đấu giá giây cuối (Sniping Protection)
      const timeRemainingMs = endTime.getTime() - now.getTime();
      let newEndTime: Date | undefined = undefined;

      // Nếu thời gian còn lại dưới 30 giây (và lớn hơn hoặc bằng 0), cộng thêm 2 phút
      if (timeRemainingMs > 0 && timeRemainingMs < 30 * 1000) {
        newEndTime = new Date(endTime.getTime() + 2 * 60 * 1000);
      }

      // Cập nhật thông tin sản phẩm (currentPrice và endTime mới nếu có)
      const updatedProduct = await tx.product.update({
        where: { id: product.id },
        data: {
          currentPrice: bidDecimal,
          ...(newEndTime ? { endTime: newEndTime } : {}),
        },
      });

      return {
        currentPrice: updatedProduct.currentPrice,
        endTime: updatedProduct.endTime,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Đặt giá thành công",
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Đã xảy ra lỗi không xác định." },
      { status: 400 }
    );
  }
}
