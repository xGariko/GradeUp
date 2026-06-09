import { Router } from 'express';
import { asyncHandler } from '@middleware/async-handler';
import { authenticate, requireRole } from '@middleware/auth.middleware';
import * as controller from '@controllers/courses.controller';

const router = Router();

router.use(authenticate);
router.get('/',           requireRole('student'), asyncHandler(controller.catalog));
router.get('/:id',        requireRole('student'), asyncHandler(controller.detail));
router.get('/:id/exams',  requireRole('student'), asyncHandler(controller.examsForCourse));
router.get('/:id/archive', requireRole('student'), asyncHandler(controller.materials));

export default router;
