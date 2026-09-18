import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import mongoose from "mongoose";
import { ApiError } from "../utils/apiErrors";
import { UserRole } from "../models/User";
import Device from "../models/Device";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  deviceId?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      deviceId?: string;
    }
  }
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

function readDeviceId(req: Request): string | undefined {
  const header = req.headers["x-device-id"];
  return Array.isArray(header) ? header[0] : (header as string | undefined);
}

function verifyAccessToken(token: string): AuthUser {
  const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new ApiError(500, "JWT access secret is not configured", "CONFIG_ERROR");
  }

  let payload: string | JwtPayload;
  try {
    payload = jwt.verify(token, secret);
  } catch (e) {
    const error = e as Error;
    throw new ApiError(
      401,
      error.name === "TokenExpiredError" ? "Access token has expired" : "Invalid access token",
      error.name === "TokenExpiredError" ? "TOKEN_EXPIRED" : "INVALID_TOKEN"
    );
  }

  if (typeof payload === "string" || !payload.sub || payload.type !== "access") {
    throw new ApiError(401, "Invalid access token payload", "INVALID_TOKEN");
  }

  const allowedRoles: UserRole[] = ["buyer", "seller", "admin"];
  if (!allowedRoles.includes(payload.role as UserRole)) {
    throw new ApiError(401, "Invalid access token role", "INVALID_TOKEN");
  }

  return {
    id: String(payload.sub),
    email: String(payload.email || ""),
    role: payload.role as UserRole,
    deviceId: typeof payload.device_id === "string" ? payload.device_id : undefined,
  };
}

async function assertDeviceIsActive(user: AuthUser): Promise<void> {
  if (!user.deviceId) return;

  const deviceFilter = mongoose.Types.ObjectId.isValid(user.deviceId)
    ? { $or: [{ deviceId: user.deviceId }, { _id: user.deviceId }] }
    : { deviceId: user.deviceId };

  const device = await Device.findOne({
    user: user.id,
    ...deviceFilter,
    isActive: true,
  }).select("_id");

  if (!device) {
    throw new ApiError(401, "This device has been deactivated", "DEVICE_DEACTIVATED");
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    next(new ApiError(401, "Authentication required. Provide a Bearer token.", "UNAUTHENTICATED"));
    return;
  }

  void (async () => {
    try {
      req.user = verifyAccessToken(token);
      req.deviceId = req.user.deviceId || readDeviceId(req);
      await assertDeviceIsActive(req.user);
      next();
    } catch (error) {
      next(error);
    }
  })();
}

export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    next();
    return;
  }

  void (async () => {
    try {
      req.user = verifyAccessToken(token);
      req.deviceId = req.user.deviceId || readDeviceId(req);
      await assertDeviceIsActive(req.user);
    } catch {
      req.user = undefined;
      req.deviceId = undefined;
    }
    next();
  })();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ApiError(401, "Authentication required", "UNAUTHENTICATED"));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new ApiError(403, "You do not have permission to perform this action", "FORBIDDEN"));
      return;
    }
    next();
  };
}

export const requireBuyer = requireRole("buyer");
export const requireSeller = requireRole("seller");
export const requireAdmin = requireRole("admin");
