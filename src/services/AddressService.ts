import Address from "../models/Address";
import { ApiError } from "../utils/apiErrors";

interface AddressInput {
  recipient_name?: string;
  full_name?: string;
  name?: string;
  phone?: string;
  address_line1?: string;
  address_line_1?: string;
  address?: string;
  address_line2?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  zip_code?: string;
  country?: string;
  landmark?: string;
  address_type?: "home" | "work" | "other";
  type?: "home" | "work" | "other";
  is_default?: boolean;
}

function normalize(input: AddressInput, partial = false): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const values: Record<string, unknown> = {
    recipientName: input.recipient_name || input.full_name || input.name,
    phone: input.phone,
    addressLine1: input.address_line1 || input.address_line_1 || input.address,
    addressLine2: input.address_line2 || input.address_line_2,
    city: input.city,
    state: input.state,
    postalCode: input.postal_code || input.zip_code,
    country: input.country,
    landmark: input.landmark,
    addressType: input.address_type || input.type,
    isDefault: input.is_default,
  };
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && (!partial || value !== "")) result[key] = value;
  }
  return result;
}

function serialize(address: any): Record<string, unknown> {
  return {
    id: String(address._id),
    recipient_name: address.recipientName,
    phone: address.phone,
    address_line1: address.addressLine1,
    address_line2: address.addressLine2,
    city: address.city,
    state: address.state,
    postal_code: address.postalCode,
    country: address.country,
    landmark: address.landmark,
    address_type: address.addressType,
    is_default: address.isDefault,
    created_at: address.createdAt,
    updated_at: address.updatedAt,
  };
}

class AddressService {
  async list(userId: string) {
    const addresses = await Address.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 }).lean();
    return addresses.map(serialize);
  }

  async get(userId: string, addressId: string) {
    const address = await Address.findOne({ _id: addressId, user: userId }).lean();
    if (!address) throw new ApiError(404, "Address not found", "ADDRESS_NOT_FOUND");
    return serialize(address);
  }

  private async unsetDefault(userId: string): Promise<void> {
    await Address.updateMany({ user: userId, isDefault: true }, { $set: { isDefault: false } });
  }

  private async promoteFirst(userId: string): Promise<void> {
    const next = await Address.findOne({ user: userId }).sort({ createdAt: 1 });
    if (next) {
      next.isDefault = true;
      await next.save();
    }
  }

  async create(userId: string, input: AddressInput) {
    const data = normalize(input);
    const hasAddress = await Address.exists({ user: userId });
    if (input.is_default || !hasAddress) {
      await this.unsetDefault(userId);
      data.isDefault = true;
    }
    const address = await Address.create({ user: userId, ...data });
    return serialize(address);
  }

  async update(userId: string, addressId: string, input: AddressInput) {
    const address = await Address.findOne({ _id: addressId, user: userId });
    if (!address) throw new ApiError(404, "Address not found", "ADDRESS_NOT_FOUND");
    const wasDefault = address.isDefault;
    const data = normalize(input, true);
    if (input.is_default === true) await this.unsetDefault(userId);
    Object.assign(address, data);
    await address.save();
    if (wasDefault && input.is_default === false) await this.promoteFirst(userId);
    return serialize(address);
  }

  async remove(userId: string, addressId: string): Promise<void> {
    const address = await Address.findOneAndDelete({ _id: addressId, user: userId });
    if (!address) throw new ApiError(404, "Address not found", "ADDRESS_NOT_FOUND");
    if (address.isDefault) await this.promoteFirst(userId);
  }

  async setDefault(userId: string, addressId: string) {
    const address = await Address.findOne({ _id: addressId, user: userId });
    if (!address) throw new ApiError(404, "Address not found", "ADDRESS_NOT_FOUND");
    await this.unsetDefault(userId);
    address.isDefault = true;
    await address.save();
    return serialize(address);
  }
}

export default new AddressService();
