import crypto from "crypto";
import { Logger } from "../config/logger";

const logger = Logger.getInstance();

/** Generate a numeric OTP code. */
export function generateOtpCode(length = 6): string {
  const digits = "0123456789";
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += digits[crypto.randomInt(0, digits.length)];
  }
  return code;
}

function isProduction(): boolean {
  return (process.env.NODE_ENV || "development") === "production";
}

function logOnly(message: string, meta?: Record<string, unknown>): void {
  logger.info(message, meta);
}

/**
 * Sends a verification email. Falls back to logging the message in
 * non-production environments. If BREVO_API_KEY is configured, sends via Brevo.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  body?: string;
  html?: string;
}): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (isProduction() && apiKey) {
    try {
      const Brevo = await import("@getbrevo/brevo");
      const apiInstance = new Brevo.TransactionalEmailsApi();
      apiInstance.setApiKey(
        Brevo.TransactionalEmailsApiApiKeys.apiKey,
        apiKey
      );
      const sendSmtpEmail = new Brevo.SendSmtpEmail();
      sendSmtpEmail.to = [{ email: params.to }];
      sendSmtpEmail.sender = {
        email: process.env.BREVO_SENDER_EMAIL || "noreply@fortunemart.com",
        name: process.env.BREVO_SENDER_NAME || "FortuneMart",
      };
      sendSmtpEmail.subject = params.subject;
      if (params.html) sendSmtpEmail.htmlContent = params.html;
      else if (params.body) sendSmtpEmail.textContent = params.body;
      await apiInstance.sendTransacEmail(sendSmtpEmail);
      return;
    } catch (error) {
      logger.error("Failed to send email via Brevo", error instanceof Error ? error : new Error(String(error)));
    }
  }

  logOnly(`[EMAIL] To: ${params.to} | Subject: ${params.subject}`, {
    body: params.body || params.html,
  });
}

/**
 * Sends an SMS via Twilio if configured; otherwise logs it.
 */
export async function sendSms(params: { to: string; body: string }): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (isProduction() && accountSid && authToken && from) {
    try {
      const twilio = (await import("twilio")).default;
      const client = twilio(accountSid, authToken);
      await client.messages.create({ to: params.to, from, body: params.body });
      return;
    } catch (error) {
      logger.error("Failed to send SMS via Twilio", error instanceof Error ? error : new Error(String(error)));
    }
  }

  logOnly(`[SMS] To: ${params.to}`, { body: params.body });
}