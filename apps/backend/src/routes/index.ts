import { Router } from 'express';
import { authRoutes } from './auth.routes';
import { projectsRoutes } from './projects.routes';
import { authGuard } from '../middleware/auth';

const router = Router();

router.use('/auth', authRoutes);
router.use('/projects', authGuard, projectsRoutes);

export const apiRouter = router;
