import { Router } from 'express';
import {
  register, login, verifyOtpCode, resendOtp, forgotPassword, resetPassword,
  changePassword, deleteAccount, getMe, logout
} from '../controllers/authController.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';
import {
  loginLimiter, loginEmailLimiter, registerLimiter, otpSendLimiter, otpVerifyLimiter, emailOtpLimiter,
  passwordChangeLimiter
} from '../middleware/rateLimiter.js';

const router = Router();

// Auth responses must never be cached by browsers or proxies.
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.post('/register', registerLimiter, emailOtpLimiter, register);
router.post('/login', loginLimiter, loginEmailLimiter, login);
router.post('/verify-otp', otpVerifyLimiter, verifyOtpCode);
router.post('/resend-otp', otpSendLimiter, resendOtp);
router.post('/forgot-password', otpSendLimiter, emailOtpLimiter, forgotPassword);
router.post('/reset-password', otpVerifyLimiter, resetPassword);
router.post('/change-password', authenticate, passwordChangeLimiter, changePassword);
router.delete('/account', authenticate, passwordChangeLimiter, deleteAccount);
router.get('/me', authenticate, getMe);
router.post('/logout', optionalAuthenticate, logout);

export default router;
