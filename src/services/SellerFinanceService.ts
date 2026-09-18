import crypto from "crypto";
import mongoose from "mongoose";
import Wallet from "../models/Wallet";
import WalletTransaction from "../models/WalletTransaction";
import SellerBankAccount from "../models/SellerBankAccount";
import Withdrawal from "../models/Withdrawal";
import PaystackService from "./PaystackService";
import { ApiError } from "../utils/apiErrors";

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function encryptionKey(): Buffer {
  const secret = process.env.BANK_ACCOUNT_ENCRYPTION_KEY || process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new ApiError(500, "Bank-account encryption is not configured", "CONFIG_ERROR");
  return crypto.createHash("sha256").update(secret).digest();
}

function encrypt(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

function decrypt(value: string): string {
  const [iv, authTag, encrypted] = value.split(".");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(authTag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}

function makeReference(prefix: string): string {
  return `FM_${prefix}_${Date.now()}_${crypto.randomBytes(5).toString("hex")}`;
}

function walletView(wallet: any) {
  return {
    id: String(wallet._id),
    currency: wallet.currency,
    available_balance: wallet.availableBalance,
    pending_balance: wallet.pendingBalance,
    total_earned: wallet.totalEarned,
    total_withdrawn: wallet.totalWithdrawn,
    updated_at: wallet.updatedAt,
  };
}

function transactionView(transaction: any) {
  return {
    id: String(transaction._id),
    type: transaction.type,
    amount: transaction.amount,
    balance_before: transaction.balanceBefore,
    balance_after: transaction.balanceAfter,
    reference: transaction.reference,
    description: transaction.description,
    metadata: transaction.metadata,
    created_at: transaction.createdAt,
  };
}

function bankView(account: any) {
  return {
    id: String(account._id),
    bank_code: account.bankCode,
    bank_name: account.bankName,
    account_name: account.accountName,
    account_number_last4: account.accountNumberLast4,
    is_verified: account.isVerified,
    is_default: account.isDefault,
    verified_at: account.verifiedAt,
    created_at: account.createdAt,
    updated_at: account.updatedAt,
  };
}

function withdrawalView(withdrawal: any) {
  return {
    id: String(withdrawal._id),
    amount: withdrawal.amount,
    fee: withdrawal.fee,
    total_debit: withdrawal.totalDebit,
    currency: withdrawal.currency,
    status: withdrawal.status,
    reference: withdrawal.reference,
    provider_transfer_code: withdrawal.providerTransferCode,
    failure_reason: withdrawal.failureReason,
    processed_at: withdrawal.processedAt,
    created_at: withdrawal.createdAt,
    updated_at: withdrawal.updatedAt,
  };
}

class SellerFinanceService {
  async getOrCreateWallet(sellerId: string, session?: mongoose.ClientSession) {
    let query = Wallet.findOne({ seller: sellerId });
    if (session) query = query.session(session);
    let wallet = await query;
    if (!wallet) {
      const created = await Wallet.create([{ seller: sellerId, currency: "NGN" }], session ? { session } : undefined);
      wallet = created[0];
    }
    return wallet;
  }

  async wallet(sellerId: string) {
    return walletView(await this.getOrCreateWallet(sellerId));
  }

  async transactions(sellerId: string, query: { page?: number; per_page?: number; type?: string }) {
    const page = query.page || 1;
    const perPage = query.per_page || 20;
    const filter: Record<string, unknown> = { seller: sellerId };
    if (query.type) filter.type = query.type;
    const [total, rows] = await Promise.all([
      WalletTransaction.countDocuments(filter),
      WalletTransaction.find(filter).sort({ createdAt: -1 }).skip((page - 1) * perPage).limit(perPage).lean(),
    ]);
    return {
      transactions: rows.map(transactionView),
      meta: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) },
    };
  }

  async transaction(sellerId: string, transactionId: string) {
    const row = await WalletTransaction.findOne({ _id: transactionId, seller: sellerId }).lean();
    if (!row) throw new ApiError(404, "Wallet transaction not found", "TRANSACTION_NOT_FOUND");
    return transactionView(row);
  }

  async transactionReceipt(sellerId: string, transactionId: string) {
    const transaction = await WalletTransaction.findOne({ _id: transactionId, seller: sellerId }).lean();
    if (!transaction) throw new ApiError(404, "Wallet transaction not found", "TRANSACTION_NOT_FOUND");
    return {
      receipt_number: transaction.reference,
      issued_at: transaction.createdAt,
      transaction: transactionView(transaction),
    };
  }

  async listBankAccounts(sellerId: string) {
    const rows = await SellerBankAccount.find({ seller: sellerId }).sort({ isDefault: -1, createdAt: -1 }).lean();
    return { bank_accounts: rows.map(bankView) };
  }

  async getBankAccount(sellerId: string, accountId: string) {
    const account = await SellerBankAccount.findOne({ _id: accountId, seller: sellerId }).lean();
    if (!account) throw new ApiError(404, "Bank account not found", "BANK_ACCOUNT_NOT_FOUND");
    return bankView(account);
  }

  async createBankAccount(sellerId: string, input: { account_number: string; bank_code: string; bank_name?: string; is_default?: boolean }) {
    const accountNumber = input.account_number.trim();
    const count = await SellerBankAccount.countDocuments({ seller: sellerId });
    const account = await SellerBankAccount.create({
      seller: sellerId,
      bankCode: input.bank_code.trim(),
      bankName: input.bank_name?.trim(),
      accountNumberEncrypted: encrypt(accountNumber),
      accountNumberLast4: accountNumber.slice(-4),
      isDefault: Boolean(input.is_default) || count === 0,
    });
    if (account.isDefault) {
      await SellerBankAccount.updateMany({ seller: sellerId, _id: { $ne: account._id } }, { $set: { isDefault: false } });
    }
    return bankView(account);
  }

  async updateBankAccount(sellerId: string, accountId: string, input: { account_number?: string; bank_code?: string; bank_name?: string }) {
    const account = await SellerBankAccount.findOne({ _id: accountId, seller: sellerId }).select("+accountNumberEncrypted");
    if (!account) throw new ApiError(404, "Bank account not found", "BANK_ACCOUNT_NOT_FOUND");
    if (input.account_number) {
      account.accountNumberEncrypted = encrypt(input.account_number.trim());
      account.accountNumberLast4 = input.account_number.trim().slice(-4);
      account.isVerified = false;
      account.recipientCode = undefined;
      account.verifiedAt = undefined;
    }
    if (input.bank_code) {
      account.bankCode = input.bank_code.trim();
      account.isVerified = false;
      account.recipientCode = undefined;
      account.verifiedAt = undefined;
    }
    if (input.bank_name !== undefined) account.bankName = input.bank_name.trim();
    await account.save();
    return bankView(account);
  }

  async deleteBankAccount(sellerId: string, accountId: string) {
    const account = await SellerBankAccount.findOneAndDelete({ _id: accountId, seller: sellerId });
    if (!account) throw new ApiError(404, "Bank account not found", "BANK_ACCOUNT_NOT_FOUND");
    if (account.isDefault) {
      const replacement = await SellerBankAccount.findOne({ seller: sellerId }).sort({ isVerified: -1, createdAt: -1 });
      if (replacement) {
        replacement.isDefault = true;
        await replacement.save();
      }
    }
    return { message: "Bank account removed successfully" };
  }

  async setDefaultBankAccount(sellerId: string, accountId: string) {
    const account = await SellerBankAccount.findOne({ _id: accountId, seller: sellerId });
    if (!account) throw new ApiError(404, "Bank account not found", "BANK_ACCOUNT_NOT_FOUND");
    if (!account.isVerified) throw new ApiError(409, "Verify the bank account before making it default", "BANK_ACCOUNT_UNVERIFIED");
    await SellerBankAccount.updateMany({ seller: sellerId }, { $set: { isDefault: false } });
    account.isDefault = true;
    await account.save();
    return bankView(account);
  }

  async verifyBankAccount(sellerId: string, accountId: string) {
    const account = await SellerBankAccount.findOne({ _id: accountId, seller: sellerId }).select("+accountNumberEncrypted");
    if (!account) throw new ApiError(404, "Bank account not found", "BANK_ACCOUNT_NOT_FOUND");
    const resolved = await PaystackService.resolveBankAccount(account.bankCode, decrypt(account.accountNumberEncrypted));
    const recipient = await PaystackService.createTransferRecipient({
      name: resolved.account_name,
      accountNumber: decrypt(account.accountNumberEncrypted),
      bankCode: account.bankCode,
    });
    account.accountName = resolved.account_name;
    account.recipientCode = recipient.recipient_code;
    account.isVerified = true;
    account.verifiedAt = new Date();
    await account.save();
    return bankView(account);
  }

  async chargeWallet(sellerId: string, amount: number, description: string, metadata?: Record<string, unknown>) {
    if (amount < 0) throw new ApiError(400, "Charge amount cannot be negative", "INVALID_AMOUNT");
    const referenceValue = makeReference("CHARGE");
    const session = await mongoose.startSession();
    let result: any;
    try {
      await session.withTransaction(async () => {
        const wallet = await Wallet.findOneAndUpdate(
          { seller: sellerId, availableBalance: { $gte: amount } },
          { $inc: { availableBalance: -amount } },
          { new: true, session }
        );
        if (!wallet) throw new ApiError(409, "Insufficient wallet balance", "INSUFFICIENT_BALANCE");
        const before = money(wallet.availableBalance + amount);
        const [transaction] = await WalletTransaction.create([{
          seller: sellerId,
          wallet: wallet._id,
          type: "promotion",
          amount,
          balanceBefore: before,
          balanceAfter: wallet.availableBalance,
          reference: referenceValue,
          description,
          metadata,
        }], { session });
        result = { wallet, transaction };
      });
    } finally {
      await session.endSession();
    }
    return result;
  }

  calculateWithdrawalFee(amount: number): number {
    const flat = Number(process.env.WITHDRAWAL_FEE_FLAT || 0);
    const percent = Number(process.env.WITHDRAWAL_FEE_PERCENT || 0);
    return money(flat + amount * percent / 100);
  }

  async withdrawalQuote(sellerId: string, amount: number, bankAccountId?: string) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ApiError(400, "Withdrawal amount must be greater than zero", "INVALID_AMOUNT");
    }
    const wallet = await this.getOrCreateWallet(sellerId);
    const account = bankAccountId
      ? await SellerBankAccount.findOne({ _id: bankAccountId, seller: sellerId })
      : await SellerBankAccount.findOne({ seller: sellerId, isDefault: true });
    if (!account) throw new ApiError(404, "A bank account is required", "BANK_ACCOUNT_NOT_FOUND");
    if (!account.isVerified || !account.recipientCode) {
      throw new ApiError(409, "Verify a bank account before withdrawing", "BANK_ACCOUNT_UNVERIFIED");
    }
    const fee = this.calculateWithdrawalFee(amount);
    return {
      amount: money(amount),
      fee,
      total_debit: money(amount + fee),
      currency: wallet.currency,
      available_balance: wallet.availableBalance,
      sufficient_balance: wallet.availableBalance >= amount + fee,
      bank_account_id: String(account._id),
    };
  }

  async createWithdrawal(sellerId: string, input: { amount: number; bank_account_id?: string; reason?: string }) {
    const quote = await this.withdrawalQuote(sellerId, input.amount, input.bank_account_id);
    const account = await SellerBankAccount.findOne({
      _id: quote.bank_account_id,
      seller: sellerId,
      isVerified: true,
    });
    if (!account || !account.recipientCode) throw new ApiError(409, "Bank account is not ready for withdrawals", "BANK_ACCOUNT_UNVERIFIED");

    const reference = makeReference("WITHDRAWAL");
    let withdrawal: any;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const wallet = await Wallet.findOneAndUpdate(
          { seller: sellerId, availableBalance: { $gte: quote.total_debit } },
          { $inc: { availableBalance: -quote.total_debit, totalWithdrawn: quote.amount } },
          { new: true, session }
        );
        if (!wallet) throw new ApiError(409, "Insufficient wallet balance", "INSUFFICIENT_BALANCE");
        const balanceBefore = money(wallet.availableBalance + quote.total_debit);
        const [transaction] = await WalletTransaction.create([{
          seller: sellerId,
          wallet: wallet._id,
          type: "withdrawal",
          amount: quote.total_debit,
          balanceBefore,
          balanceAfter: wallet.availableBalance,
          reference: `${reference}_DEBIT`,
          description: input.reason || "Seller withdrawal",
          metadata: { withdrawal_reference: reference },
        }], { session });
        const [created] = await Withdrawal.create([{
          seller: sellerId,
          wallet: wallet._id,
          bankAccount: account._id,
          amount: quote.amount,
          fee: quote.fee,
          totalDebit: quote.total_debit,
          currency: quote.currency,
          reference,
          status: "pending",
        }], { session });
        withdrawal = created;
        void transaction;
      });
    } finally {
      await session.endSession();
    }

    try {
      const provider = await PaystackService.initiateTransfer({
        amount: quote.amount,
        recipient: account.recipientCode,
        reference,
        reason: input.reason || "FortuneMart seller withdrawal",
        currency: quote.currency,
      });
      withdrawal.status = provider.status === "success" ? "success" : "processing";
      withdrawal.providerTransferCode = provider.transfer_code ? String(provider.transfer_code) : undefined;
      withdrawal.providerResponse = provider;
      withdrawal.processedAt = provider.status === "success" ? new Date() : undefined;
      await withdrawal.save();
    } catch (error) {
      const refundSession = await mongoose.startSession();
      try {
        await refundSession.withTransaction(async () => {
          const wallet = await Wallet.findByIdAndUpdate(
            withdrawal.wallet,
            { $inc: { availableBalance: withdrawal.totalDebit, totalWithdrawn: -withdrawal.amount } },
            { new: true, session: refundSession }
          );
          if (!wallet) throw new ApiError(500, "Wallet reversal failed", "WALLET_REVERSAL_FAILED");
          await WalletTransaction.create([{
            seller: sellerId,
            wallet: wallet._id,
            type: "refund",
            amount: withdrawal.totalDebit,
            balanceBefore: wallet.availableBalance - withdrawal.totalDebit,
            balanceAfter: wallet.availableBalance,
            reference: `${reference}_REFUND`,
            description: "Withdrawal provider failure reversal",
            metadata: { withdrawal_reference: reference },
          }], { session: refundSession });
          withdrawal.status = "failed";
          withdrawal.failureReason = error instanceof Error ? error.message : "Payout provider failed";
          await withdrawal.save({ session: refundSession });
        });
      } finally {
        await refundSession.endSession();
      }
      throw error;
    }
    return withdrawalView(withdrawal);
  }

  async withdrawals(sellerId: string, query: { page?: number; per_page?: number; status?: string }) {
    const page = query.page || 1;
    const perPage = query.per_page || 20;
    const filter: Record<string, unknown> = { seller: sellerId };
    if (query.status) filter.status = query.status;
    const [total, rows] = await Promise.all([
      Withdrawal.countDocuments(filter),
      Withdrawal.find(filter).sort({ createdAt: -1 }).skip((page - 1) * perPage).limit(perPage).lean(),
    ]);
    return { withdrawals: rows.map(withdrawalView), meta: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) } };
  }

  async withdrawal(sellerId: string, withdrawalId: string) {
    const row = await Withdrawal.findOne({ _id: withdrawalId, seller: sellerId }).lean();
    if (!row) throw new ApiError(404, "Withdrawal not found", "WITHDRAWAL_NOT_FOUND");
    return withdrawalView(row);
  }

  async withdrawalReceipt(sellerId: string, withdrawalId: string) {
    const row = await Withdrawal.findOne({ _id: withdrawalId, seller: sellerId }).lean();
    if (!row) throw new ApiError(404, "Withdrawal not found", "WITHDRAWAL_NOT_FOUND");
    return { receipt_number: row.reference, issued_at: row.createdAt, withdrawal: withdrawalView(row) };
  }
}

export default new SellerFinanceService();
