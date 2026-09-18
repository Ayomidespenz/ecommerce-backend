import axios, { AxiosError } from "axios";
import { ApiError } from "../utils/apiErrors";

const PAYSTACK_URL = "https://api.paystack.co";

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new ApiError(503, "Paystack is not configured", "PAYMENT_PROVIDER_NOT_CONFIGURED");
  return key;
}

function headers() {
  return { Authorization: `Bearer ${secretKey()}`, "Content-Type": "application/json" };
}

function providerError(error: unknown): ApiError {
  const axiosError = error as AxiosError<{ message?: string }>;
  const message = axiosError.response?.data?.message || "Payment provider request failed";
  return new ApiError(502, message, "PAYMENT_PROVIDER_ERROR");
}

class PaystackService {
  async initialize(params: { email: string; amount: number; currency: string; reference: string; metadata: Record<string, unknown> }) {
    try {
      const response = await axios.post(`${PAYSTACK_URL}/transaction/initialize`, {
        email: params.email,
        amount: Math.round(params.amount * 100),
        currency: params.currency,
        reference: params.reference,
        metadata: params.metadata,
      }, { headers: headers(), timeout: 15000 });
      if (!response.data?.status || !response.data?.data) throw new ApiError(502, response.data?.message || "Paystack initialization failed", "PAYMENT_PROVIDER_ERROR");
      return response.data.data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw providerError(error);
    }
  }

  async verify(reference: string) {
    try {
      const response = await axios.get(`${PAYSTACK_URL}/transaction/verify/${encodeURIComponent(reference)}`, { headers: headers(), timeout: 15000 });
      if (!response.data?.status || !response.data?.data) throw new ApiError(502, response.data?.message || "Paystack verification failed", "PAYMENT_PROVIDER_ERROR");
      return response.data.data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw providerError(error);
    }
  }

  async resolveBankAccount(bankCode: string, accountNumber: string) {
    try {
      const response = await axios.get(`${PAYSTACK_URL}/bank/resolve`, {
        params: { bank_code: bankCode, account_number: accountNumber },
        headers: headers(),
        timeout: 15000,
      });
      if (!response.data?.status || !response.data?.data) {
        throw new ApiError(502, response.data?.message || "Bank account resolution failed", "BANK_PROVIDER_ERROR");
      }
      return response.data.data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw providerError(error);
    }
  }

  async createTransferRecipient(params: { name: string; accountNumber: string; bankCode: string }) {
    try {
      const response = await axios.post(`${PAYSTACK_URL}/transferrecipient`, {
        type: "nuban",
        name: params.name,
        account_number: params.accountNumber,
        bank_code: params.bankCode,
        currency: "NGN",
      }, { headers: headers(), timeout: 15000 });
      if (!response.data?.status || !response.data?.data) {
        throw new ApiError(502, response.data?.message || "Transfer recipient creation failed", "BANK_PROVIDER_ERROR");
      }
      return response.data.data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw providerError(error);
    }
  }

  async initiateTransfer(params: { amount: number; recipient: string; reference: string; reason: string; currency: string }) {
    try {
      const response = await axios.post(`${PAYSTACK_URL}/transfer`, {
        source: "balance",
        amount: Math.round(params.amount * 100),
        recipient: params.recipient,
        reference: params.reference,
        reason: params.reason,
        currency: params.currency,
      }, { headers: headers(), timeout: 15000 });
      if (!response.data?.status || !response.data?.data) {
        throw new ApiError(502, response.data?.message || "Transfer initiation failed", "PAYOUT_PROVIDER_ERROR");
      }
      return response.data.data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw providerError(error);
    }
  }

  async refund(transaction: string, amount?: number) {
    try {
      const payload: Record<string, unknown> = { transaction };
      if (amount !== undefined) payload.amount = Math.round(amount * 100);
      const response = await axios.post(`${PAYSTACK_URL}/refund`, payload, { headers: headers(), timeout: 15000 });
      if (!response.data?.status || !response.data?.data) throw new ApiError(502, response.data?.message || "Paystack refund failed", "REFUND_PROVIDER_ERROR");
      return response.data.data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw providerError(error);
    }
  }
}

export default new PaystackService();
