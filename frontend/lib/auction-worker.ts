import cron from "node-cron";
import prisma from "./db";

// Helper function to close all expired active auctions
export async function closeExpiredAuctions() {
  const now = new Date();
  console.log(`[CRON WORKER] Running closeExpiredAuctions check at ${now.toISOString()}...`);

  try {
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
      console.log("[CRON WORKER] No expired active auctions found to close.");
      return;
    }

    console.log(`[CRON WORKER] Found ${expiredProducts.length} expired active auctions. Processing...`);

    for (const product of expiredProducts) {
      // Find the highest bid
      const highestBid = await prisma.bid.findFirst({
        where: {
          productId: product.id,
        },
        orderBy: {
          bidAmount: "desc",
        },
      });

      // Update product status to 'ended'
      await prisma.product.update({
        where: { id: product.id },
        data: { status: "ended" },
      });

      if (highestBid) {
        console.log(
          `[AUCTION] Sản phẩm "${product.title}" (ID: ${product.id}) đã kết thúc. Người thắng cuộc: User "${highestBid.userId}" với giá ${Number(highestBid.bidAmount).toLocaleString("vi-VN")} đ.`
        );
      } else {
        console.log(
          `[AUCTION] Sản phẩm "${product.title}" (ID: ${product.id}) đã kết thúc. Không có người tham gia đặt giá.`
        );
      }
    }
  } catch (error) {
    console.error("[CRON WORKER] Error running closeExpiredAuctions:", error);
  }
}

// Setup background schedule (Runs every minute: '* * * * *')
export function startAuctionWorker() {
  console.log("[CRON WORKER] Starting background auction worker scheduler...");
  cron.schedule("* * * * *", async () => {
    await closeExpiredAuctions();
  });
}
