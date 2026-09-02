import dotenv from 'dotenv';

dotenv.config();

import { httpServer } from '../app';
import { DatabaseConnection } from '../config/database';
import { Logger } from '../config/logger';

const logger = Logger.getInstance();

async function startServer(): Promise<void> {
  const db = DatabaseConnection.getInstance();
  const PORT = Number(process.env.PORT) || 5000;

  try {
    await db.connect();
    logger.info('MongoDB connection established');
  } catch (error) {
    logger.warn('MongoDB not available, continuing without DB connection for local startup');
    logger.warn(String(error));
  }

  const server = httpServer.listen(PORT, () => {
    logger.info(`E-commerce backend running on port ${PORT}`);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT signal received: closing HTTP server');
    server.close(async () => {
      try {
        await db.disconnect();
      } catch {
        // no-op
      }
      process.exit(0);
    });
  });

  process.on('SIGTERM', async () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    server.close(async () => {
      try {
        await db.disconnect();
      } catch {
        // no-op
      }
      process.exit(0);
    });
  });
}

startServer();
