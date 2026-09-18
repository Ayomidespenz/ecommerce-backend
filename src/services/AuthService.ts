import bcrypt from "bcryptjs";
import crypto from "crypto";
import mongoose from "mongoose";
import User, { UserDocument, UserRole } from "../models/User";
import Device, { DeviceDocument } from "../models/Device";
import OtpVerification, { OtpPurpose } from "../models/OtpVerification";
import RefreshToken from "../models/RefreshToken";
import tokenService, { TokenResult } from "./tokenService";
import { sendEmail, sendSms, generateOtpCode } from "./notifier";
import { ApiError } from "../utils/apiErrors";

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  registrationId: string;
  status: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  avatar?: string;
  createdAt?: Date;
}

export interface AuthPayload {
  user: PublicUser;
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_expires_in: number;
  /** Camel-case aliases for app compatibility. */
  accessToken: string;
  refreshToken: string;
}

interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
  role?: string;
  registration_id: string;
}

interface LoginInput {
  email: string;
  password: string;
  device_id?: string;
}

interface DeviceContext {
  ip?: string;
  userAgent?: string;
}

const OTP_EXPIRY_MS = (parseInt(process.env.OTP_EXPIRY_MINUTES || "10", 10)) * 60 * 1000;
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || "5", 10);
const OTP_COOLDOWN_MS = parseInt(process.env.OTP_COOLDOWN_MINUTES || "1", 10) * 60 * 1000;

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function toPublicUser(user: Pick<UserDocument, "_id" | "name" | "email" | "phone" | "role" | "registrationId" | "status" | "emailVerified" | "phoneVerified" | "avatar" | "createdAt">): PublicUser {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    registrationId: user.registrationId,
    status: user.status,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    ...(user.avatar ? { avatar: user.avatar } : {}),
    ...(user.createdAt ? { createdAt: user.createdAt } : {}),
  };
}

class AuthService {
  // ------------------------------------------------------------------ utils

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private async ensureUnique(email: string, phone: string, registrationId: string): Promise<void> {
    const existing = await User.findOne({
      $or: [{ email }, { phone }, { registrationId }],
    });
    if (!existing) return;

    if (existing.email === email) {
      throw new ApiError(409, "An account with this email already exists", "EMAIL_IN_USE");
    }
    if (existing.phone === phone) {
      throw new ApiError(409, "An account with this phone number already exists", "PHONE_IN_USE");
    }
    throw new ApiError(409, "An account with this registration ID already exists", "REGISTRATION_ID_IN_USE");
  }

  private async getUserForSession(userId: string): Promise<UserDocument> {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found", "USER_NOT_FOUND");
    }
    return user;
  }

  private async issueTokenResult(
    user: UserDocument,
    deviceContext: DeviceContext,
    deviceObjectId?: mongoose.Types.ObjectId
  ): Promise<TokenResult> {
    return tokenService.issueTokenPair({
      userId: String(user._id),
      email: user.email,
      role: user.role,
      deviceId: deviceObjectId,
      deviceKey: deviceObjectId
        ? (await Device.findById(deviceObjectId).select("deviceId"))?.deviceId
        : undefined,
      ip: deviceContext.ip,
      userAgent: deviceContext.userAgent,
    });
  }

  private toAuthPayload(user: UserDocument, tokens: TokenResult): AuthPayload {
    return {
      user: toPublicUser(user),
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_type: "Bearer",
      expires_in: tokens.accessTokenExpiresIn,
      refresh_expires_in: tokens.refreshTokenExpiresIn,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  // -------------------------------------------------------------- registration

  async register(input: RegisterInput, deviceContext: DeviceContext = {}): Promise<AuthPayload> {
    const name = input.name.trim();
    const email = this.normalizeEmail(input.email);
    const phone = input.phone.trim();
    const registrationId = input.registration_id.trim().toLowerCase();
    const passwordConfirmationOk = input.password === input.password_confirmation;

    if (!passwordConfirmationOk) {
      throw new ApiError(400, "Password confirmation does not match", "PASSWORD_MISMATCH");
    }

    // Public registration can create buyer or seller accounts only. Admin
    // accounts must be provisioned internally.
    const role = input.role === "seller" ? "seller" : "buyer";

    await this.ensureUnique(email, phone, registrationId);

    const hashedPassword = await bcrypt.hash(input.password, parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10));

    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role,
      registrationId,
    });

    // Auto-verify if the email/phone match a verification code issued pre-registration
    // (kept simple: new accounts start unverified; verify endpoints handle it).

    const tokens = await this.issueTokenResult(user, deviceContext);
    return this.toAuthPayload(user, tokens);
  }

  async login(input: LoginInput, deviceContext: DeviceContext = {}): Promise<AuthPayload> {
    const email = this.normalizeEmail(input.email);
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await bcrypt.compare(input.password, user.password))) {
      throw new ApiError(401, "Invalid email or password", "INVALID_CREDENTIALS");
    }

    this.assertUserCanLogin(user);

    user.lastLoginAt = new Date();
    await user.save();

    let device: DeviceDocument | undefined;
    if (input.device_id) {
      device = await Device.findOne({ user: user._id, deviceId: input.device_id, isActive: true }) || undefined;
      if (!device) {
        throw new ApiError(404, "Device is not registered for this account", "DEVICE_NOT_REGISTERED");
      }
    }

    const tokens = await this.issueTokenResult(user, deviceContext, device?._id as mongoose.Types.ObjectId | undefined);
    return this.toAuthPayload(user, tokens);
  }

  private assertUserCanLogin(user: UserDocument): void {
    if (user.status === "suspended") {
      throw new ApiError(403, "Your account has been suspended", "ACCOUNT_SUSPENDED");
    }
    if (user.status === "banned") {
      throw new ApiError(403, "Your account has been banned", "ACCOUNT_BANNED");
    }
    if (user.status === "pending") {
      throw new ApiError(403, "Your account is pending approval", "ACCOUNT_PENDING");
    }
  }

  async refresh(input: { refresh_token: string; device_id?: string }, deviceContext: DeviceContext = {}): Promise<AuthPayload> {
    const session = await this.resolveRefreshSession(input.refresh_token);
    const user = await this.getUserForSession(session.userId);
    this.assertUserCanLogin(user);

    let deviceId = session.deviceId;
    if (input.device_id) {
      const device = await Device.findOne({ user: user._id, deviceId: input.device_id, isActive: true });
      if (!device || !session.deviceId || !session.deviceId.equals(device._id)) {
        throw new ApiError(401, "Refresh token is not valid for this device", "DEVICE_MISMATCH");
      }
      deviceId = device._id as mongoose.Types.ObjectId;
    }

    const tokens = await tokenService.rotateRefreshToken({
      refreshToken: input.refresh_token,
      email: user.email,
      role: user.role,
      deviceId,
      ip: deviceContext.ip,
      userAgent: deviceContext.userAgent,
    });

    return this.toAuthPayload(user, tokens);
  }

  private async resolveRefreshSession(token: string): Promise<{ userId: string; deviceId?: mongoose.Types.ObjectId }> {
    const dotIndex = token.lastIndexOf(".");
    if (dotIndex <= 0 || dotIndex === token.length - 1) {
      throw new ApiError(401, "Invalid refresh token", "INVALID_REFRESH_TOKEN");
    }
    const tokenHash = sha256(token);
    const doc = await RefreshToken.findOne({ tokenHash });
    if (!doc) {
      throw new ApiError(401, "Invalid refresh token", "INVALID_REFRESH_TOKEN");
    }
    return { userId: String(doc.user), deviceId: doc.device as mongoose.Types.ObjectId | undefined };
  }

  async logout(input: { refresh_token?: string }): Promise<void> {
    if (input.refresh_token) {
      await tokenService.revokeRefreshToken(input.refresh_token);
      return;
    }
    // Logout without a token is a no-op (idempotent).
  }

  async getMe(userId: string): Promise<PublicUser> {
    const user = await this.getUserForSession(userId);
    return toPublicUser(user);
  }

  // --------------------------------------------------------------- biometric

  async biometricChallenge(input: { device_id: string }): Promise<{ challenge_id: string; nonce: string; expires_in: number }> {
    const device = await Device.findOne({ deviceId: input.device_id, isActive: true });
    if (!device || !device.publicKey) {
      throw new ApiError(404, "Biometric login is not set up for this device", "BIOMETRIC_NOT_ENROLLED");
    }

    const nonce = crypto.randomBytes(32).toString("base64url");
    device.pendingBiometricChallenge = {
      challengeId: crypto.randomUUID(),
      nonce,
      expiresAt: new Date(Date.now() + 120 * 1000),
    };
    await device.save();

    return {
      challenge_id: device.pendingBiometricChallenge.challengeId,
      nonce,
      expires_in: 120,
    };
  }

  async biometricVerify(
    input: { device_id: string; challenge_id: string; signature: string; format?: "base64" | "hex" },
    deviceContext: DeviceContext = {}
  ): Promise<AuthPayload> {
    const device = await Device.findOne({ deviceId: input.device_id, isActive: true });
    if (!device) {
      throw new ApiError(404, "Device not found or deactivated", "DEVICE_NOT_FOUND");
    }

    const challenge = device.pendingBiometricChallenge;
    if (
      !challenge ||
      challenge.challengeId !== input.challenge_id ||
      challenge.expiresAt.getTime() <= Date.now()
    ) {
      throw new ApiError(400, "Biometric challenge is invalid or has expired", "CHALLENGE_INVALID");
    }
    if (!device.publicKey) {
      throw new ApiError(400, "Device has no registered public key", "NO_PUBLIC_KEY");
    }

    const signature = input.format === "hex" ? input.signature : input.signature;
    const signatureBuffer = input.format === "hex" ? Buffer.from(signature, "hex") : Buffer.from(signature, "base64");

    const verifier = crypto.createVerify("sha256");
    verifier.update(challenge.nonce);
    verifier.end();

    let valid = false;
    try {
      valid = verifier.verify(device.publicKey, signatureBuffer);
    } catch {
      valid = false;
    }

    if (!valid) {
      throw new ApiError(401, "Biometric signature verification failed", "SIGNATURE_INVALID");
    }

    // Consume the challenge atomically so it cannot be replayed concurrently.
    const consumed = await Device.findOneAndUpdate(
      {
        _id: device._id,
        isActive: true,
        "pendingBiometricChallenge.challengeId": input.challenge_id,
        "pendingBiometricChallenge.expiresAt": { $gt: new Date() },
      },
      {
        $unset: { pendingBiometricChallenge: 1 },
        $set: { lastActiveAt: new Date() },
      },
      { new: true }
    );
    if (!consumed) {
      throw new ApiError(400, "Biometric challenge is invalid or has expired", "CHALLENGE_INVALID");
    }

    const user = await this.getUserForSession(String(device.user));
    this.assertUserCanLogin(user);

    user.lastLoginAt = new Date();
    await user.save();

    const tokens = await this.issueTokenResult(user, deviceContext, device._id as mongoose.Types.ObjectId);
    return this.toAuthPayload(user, tokens);
  }

  // ----------------------------------------------------------------- devices

  async registerDevice(input: {
    userId: string;
    device_id: string;
    name?: string;
    platform?: "ios" | "android" | "web";
    model?: string;
    app_version?: string;
    push_token?: string;
    public_key?: string;
    ip?: string;
    userAgent?: string;
  }): Promise<DeviceDocument> {
    const existing = await Device.findOne({ deviceId: input.device_id });
    if (existing && String(existing.user) !== input.userId) {
      throw new ApiError(409, "This device is already registered to another account", "DEVICE_IN_USE");
    }

    const data = {
      name: input.name,
      platform: input.platform,
      deviceModel: input.model,
      appVersion: input.app_version,
      pushToken: input.push_token,
      ...(input.public_key ? { publicKey: input.public_key } : {}),
      lastActiveAt: new Date(),
      lastIp: input.ip,
      lastUserAgent: input.userAgent,
    };

    if (existing) {
      const publicKeyChanged = Boolean(input.public_key && existing.publicKey && input.public_key !== existing.publicKey);
      Object.assign(existing, data);
      existing.isActive = true;
      if (publicKeyChanged) {
        existing.pendingBiometricChallenge = undefined;
        await tokenService.revokeAllForDevice(existing._id as mongoose.Types.ObjectId);
      }
      await existing.save();
      return existing;
    }

    return Device.create({ user: input.userId, deviceId: input.device_id, ...data, isActive: true });
  }

  async listDevices(userId: string): Promise<Array<Record<string, unknown>>> {
    const devices = await Device.find({ user: userId }).lean();
    return devices.map((d) => ({
      id: String(d._id),
      device_id: d.deviceId,
      name: d.name,
      platform: d.platform,
      model: d.deviceModel,
      app_version: d.appVersion,
      is_active: d.isActive,
      last_active_at: d.lastActiveAt,
      created_at: d.createdAt,
      updated_at: d.updatedAt,
    }));
  }

  async deleteDevice(userId: string, deviceId: string): Promise<void> {
    const device = await Device.findOneAndDelete({ user: userId, deviceId });
    if (!device) {
      throw new ApiError(404, "Device not found", "DEVICE_NOT_FOUND");
    }
    await tokenService.revokeAllForDevice(device._id as mongoose.Types.ObjectId);
  }

  async updateDeviceActive(userId: string, deviceId: string, isActive: boolean): Promise<void> {
    await Device.findOneAndUpdate(
      { user: userId, deviceId },
      { isActive },
      { new: true }
    );
  }

  // -------------------------------------------------------------------- OTP

  private async createOtp(params: {
    userId: string;
    purpose: OtpPurpose;
    channel: "email" | "phone";
    contact: string;
  }): Promise<string> {
    // Respect cooldown: block resending until the previous code expires or is consumed.
    const latest = await OtpVerification.findOne({
      user: params.userId,
      purpose: params.purpose,
      channel: params.channel,
      contact: params.contact,
      consumedAt: null,
    }).sort({ createdAt: -1 });

    if (latest) {
      if (latest.expiresAt.getTime() > Date.now()) {
        const remaining = Math.max(1, Math.ceil((latest.expiresAt.getTime() - Date.now()) / 1000));
        throw new ApiError(429, `An OTP was already sent. Try again in ${remaining} seconds.`, "OTP_ACTIVE");
      }
      if (latest.cooldownUntil && latest.cooldownUntil.getTime() > Date.now()) {
        const remaining = Math.max(1, Math.ceil((latest.cooldownUntil.getTime() - Date.now()) / 1000));
        throw new ApiError(429, `Too many attempts. Try again in ${remaining} seconds.`, "OTP_COOLDOWN");
      }
    }

    const code = generateOtpCode(6);
    await OtpVerification.create({
      user: params.userId,
      purpose: params.purpose,
      channel: params.channel,
      contact: params.contact,
      codeHash: sha256(code),
      attempts: 0,
      maxAttempts: OTP_MAX_ATTEMPTS,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
      cooldownUntil: new Date(Date.now() + OTP_COOLDOWN_MS),
    });
    return code;
  }

  private async verifyOtpCode(params: {
    userId: string;
    purpose: OtpPurpose;
    channel: "email" | "phone";
    contact: string;
    code: string;
  }): Promise<void> {
    const record = await OtpVerification.findOne({
      user: params.userId,
      purpose: params.purpose,
      channel: params.channel,
      contact: params.contact,
      consumedAt: null,
    }).sort({ createdAt: -1 });

    if (!record) {
      throw new ApiError(400, "No active verification code found. Request a new one.", "OTP_NOT_FOUND");
    }

    if (record.attempts >= record.maxAttempts) {
      throw new ApiError(400, "Too many incorrect attempts. Request a new code.", "OTP_EXHAUSTED");
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      throw new ApiError(400, "Verification code has expired. Request a new one.", "OTP_EXPIRED");
    }

    if (record.codeHash !== sha256(params.code)) {
      record.attempts += 1;
      await record.save();
      throw new ApiError(400, "Incorrect verification code", "OTP_INVALID");
    }

    record.consumedAt = new Date();
    await record.save();
  }

  async sendEmailVerification(userId: string): Promise<{ debug_code?: string }> {
    const user = await this.getUserForSession(userId);
    if (user.emailVerified) {
      throw new ApiError(400, "Email is already verified", "EMAIL_ALREADY_VERIFIED");
    }

    const code = await this.createOtp({
      userId,
      purpose: "email_verification",
      channel: "email",
      contact: user.email,
    });

    await sendEmail({
      to: user.email,
      subject: "Verify your FortuneMart email",
      body: `Your FortuneMart verification code is ${code}. It expires in ${process.env.OTP_EXPIRY_MINUTES || "10"} minutes.`,
    });

    return this.isDev() ? { debug_code: code } : {};
  }

  async verifyEmail(input: { email: string; code: string }, authenticatedUserId?: string): Promise<{ message: string }> {
    const email = this.normalizeEmail(input.email);
    const user = await User.findOne({ email });
    if (!user) {
      throw new ApiError(404, "No account found for this email", "USER_NOT_FOUND");
    }
    if (user.emailVerified) {
      throw new ApiError(400, "Email is already verified", "EMAIL_ALREADY_VERIFIED");
    }
    if (authenticatedUserId && String(user._id) !== authenticatedUserId) {
      throw new ApiError(403, "You can only verify your own email address", "FORBIDDEN");
    }

    await this.verifyOtpCode({
      userId: String(user._id),
      purpose: "email_verification",
      channel: "email",
      contact: email,
      code: input.code,
    });

    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    await user.save();

    return { message: "Email verified successfully" };
  }

  async sendPhoneOtp(userId: string): Promise<{ debug_code?: string }> {
    const user = await this.getUserForSession(userId);
    const code = await this.createOtp({
      userId,
      purpose: "phone_verification",
      channel: "phone",
      contact: user.phone,
    });

    await sendSms({
      to: user.phone,
      body: `Your FortuneMart verification code is ${code}. It expires in ${process.env.OTP_EXPIRY_MINUTES || "10"} minutes.`,
    });

    return this.isDev() ? { debug_code: code } : {};
  }

  async verifyPhoneOtp(input: { phone: string; code: string }, authenticatedUserId?: string): Promise<{ message: string }> {
    const user = await User.findOne({ phone: input.phone });
    if (!user) {
      throw new ApiError(404, "No account found for this phone number", "USER_NOT_FOUND");
    }
    if (user.phoneVerified) {
      throw new ApiError(400, "Phone number is already verified", "PHONE_ALREADY_VERIFIED");
    }
    if (authenticatedUserId && String(user._id) !== authenticatedUserId) {
      throw new ApiError(403, "You can only verify your own phone number", "FORBIDDEN");
    }

    await this.verifyOtpCode({
      userId: String(user._id),
      purpose: "phone_verification",
      channel: "phone",
      contact: input.phone,
      code: input.code,
    });

    user.phoneVerified = true;
    user.phoneVerifiedAt = new Date();
    await user.save();

    return { message: "Phone number verified successfully" };
  }

  // ---------------------------------------------------------- password reset

  async forgotPassword(input: { email: string }): Promise<{ message: string; debug_code?: string }> {
    const email = this.normalizeEmail(input.email);
    const user = await User.findOne({ email });
    // Always respond generically to avoid account enumeration.
    if (!user) {
      return { message: "If an account exists for this email, a reset code has been sent." };
    }

    const code = await this.createOtp({
      userId: String(user._id),
      purpose: "password_reset",
      channel: "email",
      contact: email,
    });

    await sendEmail({
      to: email,
      subject: "Reset your FortuneMart password",
      body: `Your password reset code is ${code}. It expires in ${process.env.OTP_EXPIRY_MINUTES || "10"} minutes.`,
    });

    return {
      message: "If an account exists for this email, a reset code has been sent.",
      ...(this.isDev() ? { debug_code: code } : {}),
    };
  }

  async resetPassword(input: { email: string; code: string; password: string; password_confirmation: string }): Promise<{ message: string }> {
    if (input.password !== input.password_confirmation) {
      throw new ApiError(400, "Password confirmation does not match", "PASSWORD_MISMATCH");
    }
    if (input.password.length < 8 || !(/[A-Za-z]/.test(input.password) && /[0-9]/.test(input.password))) {
      throw new ApiError(400, "Password must be at least 8 characters with at least one letter and one number", "WEAK_PASSWORD");
    }

    const email = this.normalizeEmail(input.email);
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      throw new ApiError(404, "No account found for this email", "USER_NOT_FOUND");
    }

    await this.verifyOtpCode({
      userId: String(user._id),
      purpose: "password_reset",
      channel: "email",
      contact: email,
      code: input.code,
    });

    user.password = await bcrypt.hash(input.password, parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10));
    user.passwordChangedAt = new Date();
    await user.save();

    // Invalidate every session after a password reset.
    await tokenService.revokeAllForUser(String(user._id));

    return { message: "Password reset successfully. Please log in again." };
  }

  private isDev(): boolean {
    return (process.env.NODE_ENV || "development") !== "production";
  }
}

export default new AuthService();
