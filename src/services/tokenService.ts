import crypto from "crypto";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import RefreshToken from "../models/RefreshToken";
import Device from "../models/Device";
import { ApiError } from "../utils/apiErrors";
import { UserRole } from "../models/User";

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  device_id?: string;
  type: "access";
}

export interface TokenResult {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number; // seconds
  refreshTokenExpiresIn: number; // seconds
}

interface IssuedRefreshToken {
  token: string; // "<tokenId>.<secret>"
  expiresInSeconds: number;
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function getAccessSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new ApiError(500, "JWT access secret is not configured", "CONFIG_ERROR");
  return secret;
}

function parseDurationToSeconds(duration: string, fallbackSeconds: number): number {
  const match = /^(\d+)\s*(s|m|h|d|w|sec|min|hr|day|week)?s?$/i.exec(duration.trim());
  if (!match) return fallbackSeconds;
  const value = parseInt(match[1], 10);
  const unit = (match[2] || "s").toLowerCase();
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
    w: 604800,
    sec: 1,
    min: 60,
    hr: 3600,
    day: 86400,
    week: 604800,
  };
  return value * (multipliers[unit] || 1);
}

function randomSecret(): string {
  return crypto.randomBytes(48).toString("base64url");
}

function refreshExpirySeconds(): number {
  return parseDurationToSeconds(process.env.JWT_REFRESH_EXPIRY || "3d", 3 * 24 * 3600);
}

function accessExpirySeconds(): number {
  return parseDurationToSeconds(process.env.JWT_ACCESS_EXPIRY || "15m", 15 * 60);
}

function parseToken(token: string): { tokenId: string; secret: string } | null {
  const dotIndex = token.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === token.length - 1) return null;
  return {
    tokenId: token.slice(0, dotIndex),
    secret: token.slice(dotIndex + 1),
  };
}

export class TokenService {
  async issueAccessToken(params: {
    userId: string;
    email: string;
    role: UserRole;
    deviceId?: string;
    deviceKey?: string;
  }): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: params.userId,
      email: params.email,
      role: params.role,
      ...(params.deviceKey ? { device_id: params.deviceKey } : {}),
      type: "access",
    };
    return jwt.sign(payload, getAccessSecret(), {
      expiresIn: accessExpirySeconds(),
    } as jwt.SignOptions);
  }

  /**
   * Creates and persists a new refresh token. `familyId` is the id of the
   * original token in the rotation chain (used to revoke whole families).
   */
  private async createRefreshToken(params: {
    userId: string;
    familyId: string;
    deviceId?: mongoose.Types.ObjectId;
    ip?: string;
    userAgent?: string;
  }): Promise<IssuedRefreshToken> {
    const tokenId = crypto.randomUUID();
    const secret = randomSecret();
    const expiresInSeconds = refreshExpirySeconds();

    await RefreshToken.create({
      user: params.userId,
      device: params.deviceId,
      familyId: params.familyId,
      tokenHash: sha256(`${tokenId}.${secret}`),
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
      ip: params.ip,
      userAgent: params.userAgent,
    });

    return { token: `${tokenId}.${secret}`, expiresInSeconds };
  }

  async issueTokenPair(params: {
    userId: string;
    email: string;
    role: UserRole;
    deviceId?: mongoose.Types.ObjectId;
    ip?: string;
    userAgent?: string;
    deviceKey?: string;
  }): Promise<TokenResult> {
    const familyId = crypto.randomUUID();
    const accessToken = await this.issueAccessToken({
      userId: params.userId,
      email: params.email,
      role: params.role,
      deviceId: params.deviceId ? String(params.deviceId) : undefined,
      deviceKey: params.deviceKey,
    });
    const refreshToken = await this.createRefreshToken({
      userId: params.userId,
      familyId,
      deviceId: params.deviceId,
      ip: params.ip,
      userAgent: params.userAgent,
    });
    return {
      accessToken,
      refreshToken: refreshToken.token,
      accessTokenExpiresIn: accessExpirySeconds(),
      refreshTokenExpiresIn: refreshToken.expiresInSeconds,
    };
  }

  /**
   * Validates a refresh token, rotates it (revokes the old one) and returns
   * a fresh pair. Detects reuse of an already-rotated token and revokes the
   * entire family (token theft protection).
   */
  async rotateRefreshToken(params: {
    refreshToken: string;
    email: string;
    role: UserRole;
    deviceId?: mongoose.Types.ObjectId;
    ip?: string;
    userAgent?: string;
    deviceKey?: string;
  }): Promise<TokenResult> {
    const parsed = parseToken(params.refreshToken);
    if (!parsed) {
      throw new ApiError(401, "Invalid refresh token", "INVALID_REFRESH_TOKEN");
    }
    const tokenHash = sha256(`${parsed.tokenId}.${parsed.secret}`);

    const existing = await RefreshToken.findOne({ tokenHash });
    if (!existing) {
      throw new ApiError(401, "Invalid refresh token", "INVALID_REFRESH_TOKEN");
    }

    if (
      params.deviceId &&
      existing.device &&
      !existing.device.equals(params.deviceId)
    ) {
      throw new ApiError(401, "Refresh token is not valid for this device", "DEVICE_MISMATCH");
    }

    if (existing.revokedAt) {
      await this.revokeFamily(existing.familyId);
      throw new ApiError(401, "Refresh token has already been used", "REUSED_REFRESH_TOKEN");
    }

    if (existing.expiresAt.getTime() <= Date.now()) {
      throw new ApiError(401, "Refresh token has expired", "REFRESH_TOKEN_EXPIRED");
    }

    if (existing.device) {
      const device = await Device.findOne({ _id: existing.device, isActive: true }).select("_id");
      if (!device) {
        throw new ApiError(401, "This device has been deactivated", "DEVICE_DEACTIVATED");
      }
    }

    const deviceId = params.deviceId || existing.device;
    const issued = await this.createRefreshToken({
      userId: String(existing.user),
      familyId: existing.familyId,
      deviceId,
      ip: params.ip,
      userAgent: params.userAgent,
    });

    const revoked = await RefreshToken.findOneAndUpdate(
      { _id: existing._id, revokedAt: null },
      { revokedAt: new Date(), replacedByToken: issued.token.split(".")[0] },
      { new: true }
    );

    if (!revoked) {
      await this.revokeFamily(existing.familyId);
      await this.revokeRefreshToken(issued.token);
      throw new ApiError(401, "Refresh token has already been used", "REUSED_REFRESH_TOKEN");
    }

    const accessToken = await this.issueAccessToken({
      userId: String(existing.user),
      email: params.email,
      role: params.role,
      deviceId: deviceId ? String(deviceId) : undefined,
      deviceKey: deviceId
        ? (await Device.findById(deviceId).select("deviceId"))?.deviceId
        : undefined,
    });

    return {
      accessToken,
      refreshToken: issued.token,
      accessTokenExpiresIn: accessExpirySeconds(),
      refreshTokenExpiresIn: issued.expiresInSeconds,
    };
  }

  /** Revokes every token in a refresh-token family. */
  async revokeFamily(familyId: string): Promise<void> {
    await RefreshToken.updateMany(
      { familyId, revokedAt: null },
      { revokedAt: new Date() }
    );
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const parsed = parseToken(refreshToken);
    if (!parsed) return;
    const tokenHash = sha256(`${parsed.tokenId}.${parsed.secret}`);
    await RefreshToken.updateOne({ tokenHash, revokedAt: null }, { revokedAt: new Date() });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await RefreshToken.updateMany({ user: userId, revokedAt: null }, { revokedAt: new Date() });
  }

  async revokeAllForDevice(deviceObjectId: mongoose.Types.ObjectId): Promise<void> {
    await RefreshToken.updateMany(
      { device: deviceObjectId, revokedAt: null },
      { revokedAt: new Date() }
    );
  }
}

export default new TokenService();
