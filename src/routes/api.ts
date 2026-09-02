import { Router } from 'express';
import { getApiHealth } from '../controllers/healthController';

const router = Router();

router.get('/health', getApiHealth);

export default router;
