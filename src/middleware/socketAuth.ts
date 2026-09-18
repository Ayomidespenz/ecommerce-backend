import type { Socket } from "socket.io";
import jwt, { JwtPayload } from "jsonwebtoken";
import mongoose from "mongoose";
import User, { UserRole } from "../models/User";
import Device from "../models/Device";

export interface SocketAuthUser {
  id: string;
  role: UserRole;
  deviceId?: string;
}

function tokenFromSocket(socket: Socket): string | undefined {
  const authToken = socket.handshake.auth?.token;
  const header = socket.handshake.headers.authorization;
  const value = typeof authToken === "string" ? authToken : typeof header === "string" ? header : undefined;
  if (!value) return undefined;
  return value.startsWith("Bearer ") ? value.slice(7).trim() : value.trim();
}

export async function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void,
): Promise<void> {
  try {
    const token = tokenFromSocket(socket);
    const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
    if (!token || !secret) throw new Error("Socket authentication required");

    const payload = jwt.verify(token, secret) as string | JwtPayload;
    const allowedRoles: UserRole[] = ["buyer", "seller"];
    if (
      typeof payload === "string" ||
      !payload.sub ||
      payload.type !== "access" ||
      !allowedRoles.includes(payload.role as UserRole)
    ) {
      throw new Error("Invalid socket access token");
    }

    const userId = String(payload.sub);
    const user = await User.findOne({ _id: userId, status: "active", role: payload.role }).select("_id role");
    if (!user) throw new Error("User is not active");

    const deviceId = typeof payload.device_id === "string" ? payload.device_id : undefined;
    if (deviceId) {
      const deviceFilter = mongoose.Types.ObjectId.isValid(deviceId)
        ? { $or: [{ deviceId }, { _id: deviceId }] }
        : { deviceId };
      const device = await Device.findOne({ user: userId, ...deviceFilter, isActive: true }).select("_id");
      if (!device) throw new Error("Device is not active");
    }

    const authUser: SocketAuthUser = { id: userId, role: user.role, deviceId };
    socket.data.user = authUser;
    socket.data.userId = userId;
    next();
  } catch (error) {
    next(new Error(error instanceof Error ? error.message : "Socket authentication failed"));
  }
}

export default socketAuthMiddleware;
