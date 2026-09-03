import { Router } from 'express';
import authRouter from './auth';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ message: 'API is working' });
});

router.use('/auth', authRouter);

export default router;
