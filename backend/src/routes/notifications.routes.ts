import { Router } from 'express';
import { asyncHandler } from '@middleware/async-handler';
import { authenticate } from '@middleware/auth.middleware';
import * as controller from '@controllers/notifications.controller';

const router = Router();

router.use(authenticate);

router.get('/me', asyncHandler(controller.listMine));

export default router;
