import { Router } from 'express';
import { sendCode, verifyCode, getMe, logout } from '../controllers/authController.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';
import { otpSendLimiter, otpVerifyLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/send-code', otpSendLimiter, sendCode);
router.post('/verify-code', otpVerifyLimiter, verifyCode);
router.get('/me', authenticate, getMe);
router.post('/logout', optionalAuthenticate, logout);

export default router;
