import { Router } from 'express';
import { asyncHandler } from '@middleware/async-handler';
import { authenticate } from '@middleware/auth.middleware';
import * as controller from '@controllers/notifications.controller';

const router = Router();

router.use(authenticate);

router.get('/me', asyncHandler(controller.listMine));
router.post('/read-all', asyncHandler(controller.markAllRead));
router.patch('/:id/read', asyncHandler(controller.markRead));

export default router;
