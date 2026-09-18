import { Router } from 'express';
import authRouter from './auth';
import apiRouter from './api';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ message: 'API is working' });
});

router.use('/auth', authRouter);

router.use(apiRouter);

export default router;
