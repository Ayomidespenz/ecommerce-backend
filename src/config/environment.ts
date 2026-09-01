import { Logger } from './logger';

const logger = Logger.getInstance();

interface EnvironmentVariables {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  API_VERSION: string;
  API_BASE_URL: string;
  MONGODB_URI: string;
  MONGODB_TEST_URI: string;
  REDIS_URL: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_EXPIRY: string;
  JWT_REFRESH_EXPIRY: string;
  OTP_EXPIRY_MINUTES: number;
  OTP_MAX_ATTEMPTS: number;
  OTP_COOLDOWN_MINUTES: number;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASS: string;
  SMTP_FROM_EMAIL: string;
  SMTP_FROM_NAME: string;
  RESEND_API_KEY: string;
  RESEND_FROM_EMAIL: string;
  BREVO_API_KEY: string;
  BREVO_SENDER_EMAIL: string;
  BREVO_SENDER_NAME: string;
  BREVO_TEMPLATE_VERIFICATION: number;
  BREVO_TEMPLATE_PASSWORD_RESET: number;
  BREVO_TEMPLATE_OTP: number;
  BREVO_TEMPLATE_BOOKING: number;
  BREVO_TEMPLATE_PAYMENT: number;
  BREVO_TEMPLATE_BULK: number;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_PHONE_NUMBER: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  CLOUDINARY_UPLOAD_PRESET: string;
  FIREBASE_KEY_PATH: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_PRIVATE_KEY: string;
  FIREBASE_CLIENT_EMAIL: string;
  CORS_ORIGIN: string;
  FRONTEND_URL: string;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  LOG_LEVEL: string;
  BCRYPT_SALT_ROUNDS: number;
  CACHE_TTL_PROPERTY_DETAILS: number;
  CACHE_TTL_PROPERTY_SEARCH: number;
}

class EnvironmentConfig {
  private static instance: EnvironmentConfig;
  private env: EnvironmentVariables;

  private constructor() {
    this.env = this.loadEnvironment();
  }

  private loadEnvironment(): EnvironmentVariables {
    const requiredEnvVars = [
      'NODE_ENV',
      'PORT',
      'MONGODB_URI',
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET',
      'BREVO_API_KEY',
    ];

    const missing = requiredEnvVars.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      logger.error(`Missing required environment variables: ${missing.join(', ')}`);
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    return {
      NODE_ENV: (process.env.NODE_ENV as any) || 'development',
      PORT: parseInt(process.env.PORT || '5000', 10),
      API_VERSION: process.env.API_VERSION || 'v1',
      API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:5000',
      MONGODB_URI: process.env.MONGODB_URI || '',
      MONGODB_TEST_URI: process.env.MONGODB_TEST_URI || '',
      REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
      REDIS_HOST: process.env.REDIS_HOST || 'localhost',
      REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
      REDIS_PASSWORD: process.env.REDIS_PASSWORD,
      JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || '',
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || '',
      // Mobile app token strategy:
      // - Access Token: 15 minutes (short-lived for security)
      // - Refresh Token: 3 days (user re-login every 3 days)
      JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
      JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '3d',
      OTP_EXPIRY_MINUTES: parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10),
      OTP_MAX_ATTEMPTS: parseInt(process.env.OTP_MAX_ATTEMPTS || '3', 10),
      OTP_COOLDOWN_MINUTES: parseInt(process.env.OTP_COOLDOWN_MINUTES || '15', 10),
      SMTP_HOST: process.env.SMTP_HOST || '',
      SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
      SMTP_USER: process.env.SMTP_USER || '',
      SMTP_PASS: process.env.SMTP_PASS || '',
      SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL || 'noreply@habitra.com',
      SMTP_FROM_NAME: process.env.SMTP_FROM_NAME || 'Habitra',
      RESEND_API_KEY: process.env.RESEND_API_KEY || '',
      RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      BREVO_API_KEY: process.env.BREVO_API_KEY || '',
      BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL || 'noreply@habitra.com',
      BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME || 'Habitra',
      BREVO_TEMPLATE_VERIFICATION: parseInt(process.env.BREVO_TEMPLATE_VERIFICATION || '1', 10),
      BREVO_TEMPLATE_PASSWORD_RESET: parseInt(process.env.BREVO_TEMPLATE_PASSWORD_RESET || '2', 10),
      BREVO_TEMPLATE_OTP: parseInt(process.env.BREVO_TEMPLATE_OTP || '3', 10),
      BREVO_TEMPLATE_BOOKING: parseInt(process.env.BREVO_TEMPLATE_BOOKING || '4', 10),
      BREVO_TEMPLATE_PAYMENT: parseInt(process.env.BREVO_TEMPLATE_PAYMENT || '5', 10),
      BREVO_TEMPLATE_BULK: parseInt(process.env.BREVO_TEMPLATE_BULK || '6', 10),
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
      TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || '',
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
      CLOUDINARY_UPLOAD_PRESET: process.env.CLOUDINARY_UPLOAD_PRESET || 'habitra_upload',
      FIREBASE_KEY_PATH: process.env.FIREBASE_KEY_PATH || '',
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
      FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY || '',
      FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || '',
      CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
      FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
      RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
      RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
      LOG_LEVEL: process.env.LOG_LEVEL || 'info',
      BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
      CACHE_TTL_PROPERTY_DETAILS: parseInt(process.env.CACHE_TTL_PROPERTY_DETAILS || '3600', 10), // 1 hour
      CACHE_TTL_PROPERTY_SEARCH: parseInt(process.env.CACHE_TTL_PROPERTY_SEARCH || '600', 10), // 10 minutes
    };
  }

  static getInstance(): EnvironmentConfig {
    if (!EnvironmentConfig.instance) {
      EnvironmentConfig.instance = new EnvironmentConfig();
    }
    return EnvironmentConfig.instance;
  }

  get(key: keyof EnvironmentVariables): any {
    return this.env[key];
  }

  getAll(): EnvironmentVariables {
    return this.env;
  }

  isDevelopment(): boolean {
    return this.env.NODE_ENV === 'development';
  }

  isProduction(): boolean {
    return this.env.NODE_ENV === 'production';
  }

  isTest(): boolean {
    return this.env.NODE_ENV === 'test';
  }
}

export default EnvironmentConfig.getInstance();
