import rateLimit from 'express-rate-limit';

const isTest = process.env.NODE_ENV === 'test';
const isProd = process.env.NODE_ENV === 'production';

// Global API Rate Limiter
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProd ? 1500 : 10000, // High ceiling in dev/shared IPs so multi-tab admin & student portals never 429
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
  skip: () => isTest
});

// Stricter Limiter for requesting OTPs (anti-spam / anti-cost)
export const otpSendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: isProd ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many verification code requests. Please wait 10 minutes before requesting another code.' },
  skip: () => isTest
});

// Stricter Limiter for verifying OTPs (anti-brute-force)
export const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProd ? 15 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many failed verification attempts. Please wait 15 minutes or request a new code.' },
  skip: () => isTest
});
