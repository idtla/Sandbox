import { Router } from 'express';
import { ProjectsController } from '../controllers/projects.controller';
import { roleGuard } from '../middleware/roleGuard';
import { Role } from '../generated/prisma/client';

const router = Router();

router.get('/', ProjectsController.list);
router.post('/', roleGuard([Role.PMO]), ProjectsController.create);

router.post(
  '/:projectId/teams',
  roleGuard([Role.PMO]),
  ProjectsController.createTeam,
);
router.post(
  '/:projectId/teams/:teamId/members',
  roleGuard([Role.PMO]),
  ProjectsController.addMember,
);

router.post(
  '/:projectId/epics',
  roleGuard([Role.PMO]),
  ProjectsController.createEpic,
);
router.post(
  '/epics/:epicId/tasks',
  roleGuard([Role.PMO, Role.LEAD]),
  ProjectsController.createTask,
);
router.post(
  '/tasks/:taskId/subtasks',
  roleGuard([Role.PMO, Role.LEAD]),
  ProjectsController.createSubtask,
);
router.patch(
  '/subtasks/:subtaskId',
  roleGuard([Role.PMO, Role.LEAD]),
  ProjectsController.updateSubtask,
);
router.post(
  '/subtasks/:subtaskId/assignments',
  roleGuard([Role.PMO]),
  ProjectsController.assignSubtask,
);
router.post(
  '/dependencies',
  roleGuard([Role.PMO, Role.LEAD]),
  ProjectsController.addDependency,
);

router.get('/:projectId/dashboard', ProjectsController.dashboard);
router.get('/:projectId/plan', ProjectsController.plan);
router.get('/:projectId/export', ProjectsController.export);

export const projectsRoutes = router;
