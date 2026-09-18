import { Request, Response } from "express";
import AuthService from "../services/AuthService";
import { asyncHandler } from "../utils/apiErrors";

function deviceContext(req: Request) {
  return {
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  };
}

class AuthController {
  register = asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.register(req.body, deviceContext(req));
    res.status(201).json(result);
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, device_id } = req.body;
    const result = await AuthService.login({ email, password, device_id }, deviceContext(req));
    res.json(result);
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.body.refresh_token || req.body.refreshToken;
    await AuthService.logout({ refresh_token: refreshToken });
    res.json({ message: "Logged out successfully" });
  });

  refresh = asyncHandler(async (req: Request, res: Response) => {
    const refresh_token = req.body.refresh_token || req.body.refreshToken;
    const result = await AuthService.refresh({ refresh_token, device_id: req.body.device_id }, deviceContext(req));
    res.json(result);
  });

  me = asyncHandler(async (req: Request, res: Response) => {
    const user = await AuthService.getMe(req.user!.id);
    res.json({ user });
  });

  biometricChallenge = asyncHandler(async (req: Request, res: Response) => {
    const challenge = await AuthService.biometricChallenge(req.body);
    res.json(challenge);
  });

  biometricVerify = asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.biometricVerify(req.body, deviceContext(req));
    res.json(result);
  });

  registerDevice = asyncHandler(async (req: Request, res: Response) => {
    const device = await AuthService.registerDevice({
      userId: req.user!.id,
      ...req.body,
      ...deviceContext(req),
    });
    res.status(201).json({
      device: {
        id: String(device._id),
        device_id: device.deviceId,
        name: device.name,
        platform: device.platform,
        model: device.deviceModel,
        app_version: device.appVersion,
        is_active: device.isActive,
        last_active_at: device.lastActiveAt,
      },
    });
  });

  listDevices = asyncHandler(async (req: Request, res: Response) => {
    const devices = await AuthService.listDevices(req.user!.id);
    res.json({ devices });
  });

  deleteDevice = asyncHandler(async (req: Request, res: Response) => {
    await AuthService.deleteDevice(req.user!.id, req.params.deviceId);
    res.json({ message: "Device removed successfully" });
  });

  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.forgotPassword(req.body);
    res.json(result);
  });

  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.resetPassword(req.body);
    res.json(result);
  });

  sendEmailVerification = asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.sendEmailVerification(req.user!.id);
    res.json(result);
  });

  verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.verifyEmail(req.body, req.user!.id);
    res.json(result);
  });

  sendPhoneOtp = asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.sendPhoneOtp(req.user!.id);
    res.json(result);
  });

  verifyPhoneOtp = asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.verifyPhoneOtp(req.body, req.user!.id);
    res.json(result);
  });
}

export default new AuthController();
