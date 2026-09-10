import { Router } from 'express';
import AuthController from '../controller/AuthController';

const router = Router();

router.post('/register', (req, res) => AuthController.register(req, res));
router.post('/login', (req, res) => AuthController.login(req, res));

export default router;