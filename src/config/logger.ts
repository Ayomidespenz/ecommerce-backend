import winston from 'winston';
import path from 'path';
import fs from 'fs';

const logDir = 'logs';

// Create logs directory if it Ayomidesn't exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

export class Logger {
  private static instance: winston.Logger;

  private static getFormat() {
    return winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
      winston.format.printf((info) => {
        let log = `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`;
        const metadata = (info.metadata || {}) as Record<string, unknown>;
        if (Object.keys(metadata).length > 0) {
          log += ` ${JSON.stringify(metadata)}`;
        }
        if ((info as any).stack) {
          log += `\n${(info as any).stack}`;
        }
        return log;
      })
    );
  }

  private static getConsoleFormat() {
    return winston.format.combine(
      winston.format.colorize(),
      winston.format.printf((info) => `${info.message}`)
    );
  }

  static getInstance(): winston.Logger {
    if (!Logger.instance) {
      Logger.instance = winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: Logger.getFormat(),
        transports: [
          // Console transport - simple format for development
          new winston.transports.Console({
            format: Logger.getConsoleFormat(),
          }),
          // Combined log file
          new winston.transports.File({
            filename: path.join(logDir, 'app.log'),
            maxsize: 10485760, // 10MB
            maxFiles: 5,
          }),
          // Error log file
          new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 10485760, // 10MB
            maxFiles: 5,
          }),
        ],
      });
    }
    return Logger.instance;
  }

  static info(message: string, meta?: Record<string, unknown>): void {
    Logger.getInstance().info(message, meta);
  }

  static error(message: string, error?: Error | Record<string, unknown>): void {
    Logger.getInstance().error(message, error);
  }

  static warn(message: string, meta?: Record<string, unknown>): void {
    Logger.getInstance().warn(message, meta);
  }

  static debug(message: string, meta?: Record<string, unknown>): void {
    Logger.getInstance().debug(message, meta);
  }
}

export default Logger.getInstance();
