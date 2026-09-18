import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import compression from 'compression';
import { createServer } from 'http';

import appRouter from './routes';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buffer) => {
    (req as express.Request & { rawBody?: Buffer }).rawBody = Buffer.from(buffer);
  },
}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(compression());
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', message: 'Ecommerce backend is running' });
});

app.use('/api/v1', appRouter);

// 404 + error handling must come last
app.use(notFoundHandler);
app.use(errorHandler);

export const httpServer = createServer(app);

export default app;
