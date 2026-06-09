import { Router } from 'express';
import { asyncHandler } from '@middleware/async-handler';
import * as controller from '@controllers/auth.controller';

const router = Router();

router.post('/register', asyncHandler(controller.register));
router.post('/login',    asyncHandler(controller.login));
router.post('/forgot',   asyncHandler(controller.forgotPassword));
router.post('/reset',    asyncHandler(controller.resetPassword));

export default router;
