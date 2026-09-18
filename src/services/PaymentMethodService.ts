import PaymentMethod from "../models/PaymentMethod";
import { ApiError } from "../utils/apiErrors";

interface PaymentMethodInput {
  provider?: "paystack" | "stripe" | "flutterwave" | "other";
  provider_reference?: string;
  tokenized_reference?: string;
  authorization_code?: string;
  token?: string;
  method_type?: "card" | "bank" | "mobile_money" | "ussd" | "other";
  type?: "card" | "bank" | "mobile_money" | "ussd" | "other";
  brand?: string;
  last4?: string;
  exp_month?: number;
  exp_year?: number;
  bank_name?: string;
  account_name?: string;
  is_default?: boolean;
}

function referenceFrom(input: PaymentMethodInput): string | undefined {
  return input.provider_reference || input.tokenized_reference || input.authorization_code || input.token;
}

function serialize(method: any): Record<string, unknown> {
  return {
    id: String(method._id),
    provider: method.provider,
    provider_reference: method.providerReference,
    method_type: method.methodType,
    brand: method.brand,
    last4: method.last4,
    exp_month: method.expMonth,
    exp_year: method.expYear,
    bank_name: method.bankName,
    account_name: method.accountName,
    is_default: method.isDefault,
    created_at: method.createdAt,
    updated_at: method.updatedAt,
  };
}

class PaymentMethodService {
  async list(userId: string) {
    const methods = await PaymentMethod.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 }).lean();
    return methods.map(serialize);
  }

  async get(userId: string, methodId: string) {
    const method = await PaymentMethod.findOne({ _id: methodId, user: userId }).lean();
    if (!method) throw new ApiError(404, "Payment method not found", "PAYMENT_METHOD_NOT_FOUND");
    return serialize(method);
  }

  private async unsetDefault(userId: string): Promise<void> {
    await PaymentMethod.updateMany({ user: userId, isDefault: true }, { $set: { isDefault: false } });
  }

  private async promoteFirst(userId: string): Promise<void> {
    const next = await PaymentMethod.findOne({ user: userId }).sort({ createdAt: 1 });
    if (next) {
      next.isDefault = true;
      await next.save();
    }
  }

  async create(userId: string, input: PaymentMethodInput) {
    const providerReference = referenceFrom(input);
    if (!providerReference) {
      throw new ApiError(400, "A tokenized provider reference is required", "TOKENIZED_REFERENCE_REQUIRED");
    }
    const hasMethod = await PaymentMethod.exists({ user: userId });
    if (input.is_default || !hasMethod) await this.unsetDefault(userId);
    const method = await PaymentMethod.create({
      user: userId,
      provider: input.provider || "paystack",
      providerReference,
      methodType: input.method_type || input.type || "card",
      brand: input.brand,
      last4: input.last4,
      expMonth: input.exp_month,
      expYear: input.exp_year,
      bankName: input.bank_name,
      accountName: input.account_name,
      isDefault: input.is_default || !hasMethod,
    });
    return serialize(method);
  }

  async update(userId: string, methodId: string, input: PaymentMethodInput) {
    const method = await PaymentMethod.findOne({ _id: methodId, user: userId });
    if (!method) throw new ApiError(404, "Payment method not found", "PAYMENT_METHOD_NOT_FOUND");
    const wasDefault = method.isDefault;
    const reference = referenceFrom(input);
    if (input.provider !== undefined) method.provider = input.provider;
    if (reference !== undefined) method.providerReference = reference;
    if (input.method_type !== undefined || input.type !== undefined) method.methodType = input.method_type || input.type!;
    if (input.brand !== undefined) method.brand = input.brand;
    if (input.last4 !== undefined) method.last4 = input.last4;
    if (input.exp_month !== undefined) method.expMonth = input.exp_month;
    if (input.exp_year !== undefined) method.expYear = input.exp_year;
    if (input.bank_name !== undefined) method.bankName = input.bank_name;
    if (input.account_name !== undefined) method.accountName = input.account_name;
    if (input.is_default === true) await this.unsetDefault(userId);
    if (input.is_default !== undefined) method.isDefault = input.is_default;
    await method.save();
    if (wasDefault && input.is_default === false) await this.promoteFirst(userId);
    return serialize(method);
  }

  async remove(userId: string, methodId: string): Promise<void> {
    const method = await PaymentMethod.findOneAndDelete({ _id: methodId, user: userId });
    if (!method) throw new ApiError(404, "Payment method not found", "PAYMENT_METHOD_NOT_FOUND");
    if (method.isDefault) await this.promoteFirst(userId);
  }

  async setDefault(userId: string, methodId: string) {
    const method = await PaymentMethod.findOne({ _id: methodId, user: userId });
    if (!method) throw new ApiError(404, "Payment method not found", "PAYMENT_METHOD_NOT_FOUND");
    await this.unsetDefault(userId);
    method.isDefault = true;
    await method.save();
    return serialize(method);
  }
}

export default new PaymentMethodService();
