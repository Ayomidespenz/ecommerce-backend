import dotenv from 'dotenv';

dotenv.config();

import { httpServer } from '../app';
import { DatabaseConnection } from '../config/database';
import { Logger } from '../config/logger';

const logger = Logger.getInstance();

async function startServer(): Promise<void> {
  try {
    const db = DatabaseConnection.getInstance();
    await db.connect();

    const PORT = Number(process.env.PORT) || 3000;

    const server = httpServer.listen(PORT, () => {
      logger.info(`E-commerce backend running on port ${PORT}`);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT signal received: closing HTTP server');
      server.close(async () => {
        await db.disconnect();
        process.exit(0);
      });
    });

    process.on('SIGTERM', async () => {
      logger.info('SIGTERM signal received: closing HTTP server');
      server.close(async () => {
        await db.disconnect();
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

startServer();
