import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { triggerProductUpdate } from "@/app/api/products/[id]/live/route";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. Security Check (Cron Secret)
    const authHeader = request.headers.get("authorization");
    const { searchParams } = new URL(request.url);
    const bypassSecret = searchParams.get("bypass") === "true";

    const expectedSecret = process.env.CRON_SECRET || "default_cron_secret_123";

    // In production, enforce authentication if CRON_SECRET is configured
    const isAuth = authHeader === `Bearer ${expectedSecret}` || 
                   (process.env.NODE_ENV !== "production" && bypassSecret) || 
                   (!process.env.CRON_SECRET && !authHeader); // local fallback if env not set

    if (!isAuth && process.env.CRON_SECRET) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid CRON_SECRET token." },
        { status: 401 }
      );
    }

    const now = new Date();
    const closedResults: Array<{
      productId: string;
      title: string;
      winnerUserId: string | null;
      winningAmount: number | null;
      status: string;
    }> = [];

    // 2. Execute DB updates inside a transaction for complete data integrity
    const transactionResult = await prisma.$transaction(async (tx) => {
      // Step A: Find all active products whose bidding time has expired
      const expiredProducts = await tx.product.findMany({
        where: {
          endTime: {
            lte: now,
          },
          status: {
            in: ["active", "ACTIVE"],
          },
        },
      });

      if (expiredProducts.length === 0) {
        return null;
      }

      // Step B: Loop through and close each expired auction
      for (const product of expiredProducts) {
        // Query the highest bid for this product
        const highestBid = await tx.bid.findFirst({
          where: {
            productId: product.id,
          },
          orderBy: {
            bidAmount: "desc",
          },
        });

        // Update status of product to "ENDED"
        const updatedProduct = await tx.product.update({
          where: { id: product.id },
          data: { status: "ENDED" },
        });

        if (highestBid) {
          console.log(
            `[CRON] Sản phẩm ${product.title} đã đóng. Người thắng cuộc: User ID ${highestBid.userId} với mức giá ${highestBid.bidAmount}.`
          );
        } else {
          console.log(
            `[CRON] Sản phẩm ${product.title} đã kết thúc nhưng không có lượt đặt giá nào.`
          );
        }

        closedResults.push({
          productId: product.id,
          title: product.title,
          winnerUserId: highestBid ? highestBid.userId : null,
          winningAmount: highestBid ? Number(highestBid.bidAmount) : null,
          status: updatedProduct.status, // "ENDED"
        });
      }

      return closedResults;
    });

    if (!transactionResult) {
      return NextResponse.json({
        success: true,
        message: "Không có sản phẩm nào cần chốt.",
        closedCount: 0,
      });
    }

    // 3. Emit SSE real-time updates for all closed auctions AFTER database transaction succeeds
    // This allows active client browser EventSources to lock the bidding buttons immediately.
    for (const auction of transactionResult) {
      triggerProductUpdate(
        auction.productId,
        auction.winningAmount || 0,
        now.toISOString(),
        auction.status // Pass "ENDED" status to close client interface
      );
    }

    return NextResponse.json({
      success: true,
      message: `Đã chốt thành công ${transactionResult.length} phiên đấu giá hết hạn.`,
      closedCount: transactionResult.length,
      closedAuctions: transactionResult,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Đã xảy ra lỗi khi chốt phiên đấu giá." },
      { status: 500 }
    );
  }
}
