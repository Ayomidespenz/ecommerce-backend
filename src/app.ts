import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';

import appRouter from './routes/index.js';

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use('/api', appRouter);

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', message: 'Ecommerce backend is running' });
});

export const httpServer = createServer(app);

export default app;
