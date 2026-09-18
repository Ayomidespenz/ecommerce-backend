import mongoose from 'mongoose';
import { Logger } from './logger';

const logger = Logger.getInstance();

export class DatabaseConnection {
  private static instance: DatabaseConnection;

  private constructor() {}

  static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }

    return DatabaseConnection.instance;
  }

  async connect(): Promise<void> {
    try {
      const mongoUri = process.env.MONGODB_URI;

      if (!mongoUri) {
        throw new Error('MONGODB_URI environment variable is not set');
      }

      logger.info('Connecting to MongoDB...');

      await mongoose.connect(mongoUri);

      logger.info('MongoDB connected successfully');

      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error', error);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
      });

    } catch (error) {
      logger.error('Failed to connect to MongoDB', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await mongoose.disconnect();
      logger.info('MongoDB disconnected successfully');
    } catch (error) {
      logger.error('Failed to disconnect from MongoDB', error);
      throw error;
    }
  }

  isConnected(): boolean {
    return mongoose.connection.readyState === 1;
  }
}

export default DatabaseConnection.getInstance();