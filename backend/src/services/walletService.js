import { Prisma } from '@prisma/client';

/**
 * Giữ cọc (Hold Escrow)
 * @param {object} tx - Prisma transaction client context
 * @param {string} userId - ID of the user
 * @param {number|Prisma.Decimal|string} amount - Amount to freeze
 */
export async function holdEscrow(tx, userId, amount) {
  if (!tx) {
    throw new Error("Transaction client context (tx) là bắt buộc.");
  }
  if (!userId) {
    throw new Error("userId là bắt buộc.");
  }
  if (amount === undefined || amount === null) {
    throw new Error("amount là bắt buộc.");
  }

  const amountDecimal = new Prisma.Decimal(amount);

  // Lấy thông tin user hiện tại
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { id: true, walletBalance: true, frozenBalance: true }
  });

  if (!user) {
    throw new Error("Người dùng không tồn tại");
  }

  const walletBalance = user.walletBalance !== undefined && user.walletBalance !== null
    ? new Prisma.Decimal(user.walletBalance)
    : new Prisma.Decimal(0);

  const frozenBalance = user.frozenBalance !== undefined && user.frozenBalance !== null
    ? new Prisma.Decimal(user.frozenBalance)
    : new Prisma.Decimal(0);

  // Kiểm tra số dư ví khả dụng
  if (walletBalance.lt(amountDecimal)) {
    throw new Error("Số dư ví không đủ để đặt cọc");
  }

  // Trừ amount ở walletBalance và cộng amount vào frozenBalance của User đó
  const newWalletBalance = walletBalance.minus(amountDecimal);
  const newFrozenBalance = frozenBalance.plus(amountDecimal);

  await tx.user.update({
    where: { id: userId },
    data: {
      walletBalance: newWalletBalance,
      frozenBalance: newFrozenBalance
    }
  });

  // Tạo một bản ghi mới trong bảng Transaction với type: "HOLD_ESCROW"
  await tx.transaction.create({
    data: {
      userId: userId,
      amount: amountDecimal,
      type: "HOLD_ESCROW",
      status: "COMPLETED"
    }
  });
}

/**
 * Hoàn cọc (Release Escrow)
 * @param {object} tx - Prisma transaction client context
 * @param {string} userId - ID of the user
 * @param {number|Prisma.Decimal|string} amount - Amount to release
 */
export async function releaseEscrow(tx, userId, amount) {
  if (!tx) {
    throw new Error("Transaction client context (tx) là bắt buộc.");
  }
  if (!userId) {
    throw new Error("userId là bắt buộc.");
  }
  if (amount === undefined || amount === null) {
    throw new Error("amount là bắt buộc.");
  }

  const amountDecimal = new Prisma.Decimal(amount);

  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { id: true, walletBalance: true, frozenBalance: true }
  });

  if (!user) {
    throw new Error("Người dùng không tồn tại");
  }

  const walletBalance = user.walletBalance !== undefined && user.walletBalance !== null
    ? new Prisma.Decimal(user.walletBalance)
    : new Prisma.Decimal(0);

  const frozenBalance = user.frozenBalance !== undefined && user.frozenBalance !== null
    ? new Prisma.Decimal(user.frozenBalance)
    : new Prisma.Decimal(0);

  // Trừ amount ở frozenBalance và cộng trả lại amount vào walletBalance của User
  const newFrozenBalance = frozenBalance.minus(amountDecimal);
  if (newFrozenBalance.lt(0)) {
    throw new Error("Số dư đóng băng không đủ để hoàn trả");
  }
  const newWalletBalance = walletBalance.plus(amountDecimal);

  await tx.user.update({
    where: { id: userId },
    data: {
      walletBalance: newWalletBalance,
      frozenBalance: newFrozenBalance
    }
  });

  // Tạo một bản ghi mới trong bảng Transaction với type: "RELEASE_ESCROW"
  await tx.transaction.create({
    data: {
      userId: userId,
      amount: amountDecimal,
      type: "RELEASE_ESCROW",
      status: "COMPLETED"
    }
  });
}

