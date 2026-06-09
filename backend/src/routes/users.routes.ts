import { Router } from 'express';
import { asyncHandler } from '@middleware/async-handler';
import * as controller from '@controllers/users.controller';

const router = Router();

router.get('/', asyncHandler(controller.list));
router.get('/:id', asyncHandler(controller.getById));
router.post('/', asyncHandler(controller.create));

export default router;