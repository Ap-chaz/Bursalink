import rateLimit from 'express-rate-limit';

const isTest = process.env.NODE_ENV === 'test';

// Global API Rate Limiter
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 10000 : 300, // Limit each IP to 300 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
  skip: () => isTest
});

// Stricter Limiter for requesting OTPs (anti-spam / anti-cost)
export const otpSendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: isTest ? 10000 : 5, // Limit each IP to 5 OTP requests per 10 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many verification code requests. Please wait 10 minutes before requesting another code.' },
  skip: () => isTest
});

// Stricter Limiter for verifying OTPs (anti-brute-force)
export const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 10000 : 10, // Limit each IP to 10 verification attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many failed verification attempts. Please wait 15 minutes or request a new code.' },
  skip: () => isTest
});
