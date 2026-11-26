// Central security configuration. Values are read lazily so dotenv has always run first.
export const isProd = () => process.env.NODE_ENV === 'production';

const DEV_SECRET = 'dev-only-auth-secret-never-use-in-production-0123456789abcdef';

/** Server secret used for OTP HMACs and as the default password pepper. */
export function authSecret() {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 32) return s;
  if (isProd()) {
    throw new Error('AUTH_SECRET (min 32 characters) must be set when NODE_ENV=production');
  }
  return DEV_SECRET;
}

export function passwordPepper() {
  return process.env.PASSWORD_PEPPER || authSecret();
}

export const BCRYPT_COST = Math.min(15, Math.max(10, parseInt(process.env.BCRYPT_COST || '12', 10) || 12));

export const POLICY = {
  maxFailedLogins: 5,            // failures before the account is temporarily locked
  lockMinutes: 15,
  otpTtlMinutes: 10,
  otpMaxAttempts: 5,
  student: { absoluteSeconds: 7 * 24 * 3600, idleSeconds: 24 * 3600 },
  admin: { absoluteSeconds: 8 * 3600, idleSeconds: 30 * 60 },
  maxSessionsPerUser: 5
};

export const adminEmails = () =>
  (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

export const SESSION_COOKIE = () => (isProd() ? '__Host-bl_session' : 'bl_session');
