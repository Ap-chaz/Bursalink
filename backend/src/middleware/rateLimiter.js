import rateLimit from 'express-rate-limit';

const isProd = process.env.NODE_ENV === 'production';
const normEmail = v => (typeof v === 'string' ? v.trim().toLowerCase().slice(0, 254) : '');

const base = {
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  skip: () => process.env.NODE_ENV === 'test'
};

// Global API Rate Limiter
export const globalLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max: isProd ? 1500 : 10000,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});

// ---- Per-IP limiters ----
export const loginLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max: isProd ? 20 : 200,
  skipSuccessfulRequests: true, // only failures count toward the cap
  message: { error: 'Too many sign-in attempts. Please wait 15 minutes and try again.' }
});

export const registerLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  max: isProd ? 10 : 200,
  message: { error: 'Too many sign-up attempts from this network. Please try again later.' }
});

export const otpSendLimiter = rateLimit({
  ...base,
  windowMs: 10 * 60 * 1000,
  max: isProd ? 15 : 200,
  message: { error: 'Too many verification code requests. Please wait 10 minutes before requesting another code.' }
});

export const otpVerifyLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max: isProd ? 20 : 200,
  skipSuccessfulRequests: true,
  message: { error: 'Too many failed verification attempts. Please wait 15 minutes or request a new code.' }
});

// ---- Per-account limiters (keyed by email, so rotating IPs does not help a credential-stuffing attacker) ----
const byEmail = req => `email:${normEmail(req.body?.email) || 'none'}`;

export const loginEmailLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max: isProd ? 10 : 100,
  keyGenerator: byEmail,
  skipSuccessfulRequests: true,
  message: { error: 'Too many sign-in attempts for this account. Please wait 15 minutes and try again.' }
});

export const emailOtpLimiter = rateLimit({
  ...base,
  windowMs: 10 * 60 * 1000,
  max: isProd ? 5 : 100,
  keyGenerator: byEmail,
  skipFailedRequests: true, // validation errors do not use up the quota; only codes actually sent do
  message: { error: 'Too many verification codes requested for this email. Please wait 10 minutes.' }
});

export const passwordChangeLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max: isProd ? 10 : 100,
  skipSuccessfulRequests: true,
  message: { error: 'Too many failed password attempts. Please wait 15 minutes and try again.' }
});

export const trackLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max: isProd ? 60 : 500,
  message: { error: 'Too many tracking requests. Please wait a few minutes and try again.' }
});
