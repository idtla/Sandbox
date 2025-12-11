import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authGuard } from '../middleware/auth';

const router = Router();

router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);
router.get('/me', authGuard, AuthController.me);

export const authRoutes = router;
