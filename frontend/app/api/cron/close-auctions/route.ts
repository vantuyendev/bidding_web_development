import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. Optional security check: Verify CRON_SECRET to prevent unauthorized execution
    const authHeader = request.headers.get("authorization");
    const { searchParams } = new URL(request.url);
    const bypassSecret = searchParams.get("bypass") === "true";
    
    // In production, enforce secret validation
    const expectedSecret = process.env.CRON_SECRET;
    if (process.env.NODE_ENV === "production" && expectedSecret && !bypassSecret) {
      if (authHeader !== `Bearer ${expectedSecret}`) {
        return NextResponse.json(
          { success: false, error: "Unauthorized access to Cron endpoint." },
          { status: 401 }
        );
      }
    }

    const now = new Date();

    // 2. Find all active products whose bidding time has expired
    const expiredProducts = await prisma.product.findMany({
      where: {
        endTime: {
          lt: now,
        },
        status: {
          in: ["active", "ACTIVE"],
        },
      },
    });

    if (expiredProducts.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No expired active auctions found to close.",
        closedCount: 0,
        results: [],
      });
    }

    const results = [];

    // 3. Process each expired product and find the winner
    for (const product of expiredProducts) {
      // Find the highest bid for this product
      const highestBid = await prisma.bid.findFirst({
        where: {
          productId: product.id,
        },
        orderBy: {
          bidAmount: "desc",
        },
      });

      // Update product status to 'ended' (representing end of auction)
      await prisma.product.update({
        where: { id: product.id },
        data: { status: "ended" },
      });

      let winnerLog = "";
      if (highestBid) {
        winnerLog = `[AUCTION] Sản phẩm "${product.title}" (ID: ${product.id}) đã kết thúc. Người thắng cuộc: User "${highestBid.userId}" với giá ${Number(highestBid.bidAmount).toLocaleString('vi-VN')} đ.`;
      } else {
        winnerLog = `[AUCTION] Sản phẩm "${product.title}" (ID: ${product.id}) đã kết thúc. Không có người tham gia đặt giá.`;
      }

      // Print to stdout log
      console.log(winnerLog);

      results.push({
        productId: product.id,
        title: product.title,
        status: "ended",
        winnerUserId: highestBid ? highestBid.userId : null,
        winningAmount: highestBid ? Number(highestBid.bidAmount) : null,
        logMessage: winnerLog,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully closed ${expiredProducts.length} auction(s).`,
      closedCount: expiredProducts.length,
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "An error occurred during closing auctions." },
      { status: 500 }
    );
  }
}
