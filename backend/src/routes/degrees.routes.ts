import { Router } from 'express';
import { asyncHandler } from '@middleware/async-handler';
import { authenticate } from '@middleware/auth.middleware';
import * as controller from '@controllers/degrees.controller';

const router = Router();

router.use(authenticate);
router.get('/', asyncHandler(controller.list));

export default router;
