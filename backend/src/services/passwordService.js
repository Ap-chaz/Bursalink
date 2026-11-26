import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { BCRYPT_COST, passwordPepper } from '../config/security.js';

// 1. HMAC-SHA256 with a server-side pepper, then base64 (44 chars).
//    - removes bcrypt's 72-byte truncation / NUL-byte pitfalls
//    - a leaked database alone cannot be cracked without the pepper
function prehash(password) {
  return crypto.createHmac('sha256', passwordPepper()).update(password, 'utf8').digest('base64');
}

export function hashPassword(password) {
  return bcrypt.hash(prehash(password), BCRYPT_COST);
}

export function verifyPassword(password, hash) {
  return bcrypt.compare(prehash(password), hash);
}

// 2. Dummy hash: computed once at start-up with the same cost factor. When an account does not
//    exist (or has no password yet) we still run a full bcrypt comparison so response time does
//    not reveal whether the email is registered.
const dummyHashPromise = bcrypt.hash(crypto.randomBytes(24).toString('hex'), BCRYPT_COST);

export async function dummyVerify(password) {
  await bcrypt.compare(prehash(String(password ?? '')), await dummyHashPromise);
  return false;
}

export function needsRehash(hash) {
  try {
    return bcrypt.getRounds(hash) < BCRYPT_COST;
  } catch {
    return true;
  }
}

const COMMON = new Set([
  'password', 'password1', 'password12', 'password123', 'password1234', '1234567890', '12345678910',
  'qwertyuiop', 'qwerty12345', 'iloveyou123', 'welcome123', 'welcome1234', 'admin12345', 'letmein1234',
  'bursalink', 'bursalink123', 'bursalink2026', 'kenya12345', 'nairobi123', 'abcdefghij', 'abc1234567',
  'changeme123', 'passw0rd123', 'monkey12345', 'football123', 'student1234'
]);

/** Returns an error message, or null when the password is acceptable. */
export function validatePassword(password, { email = '' } = {}) {
  if (typeof password !== 'string') return 'Password is required.';
  if (password.length < 10) return 'Password must be at least 10 characters long.';
  if (password.length > 128) return 'Password must be at most 128 characters long.';
  if (!/[A-Za-z]/.test(password) || !/[0-9\W_]/.test(password)) {
    return 'Password must contain letters and at least one number or symbol.';
  }
  const lower = password.toLowerCase();
  if (COMMON.has(lower) || /^(.)\1+$/.test(password)) return 'That password is too common. Choose a less predictable one.';
  const local = String(email).split('@')[0].toLowerCase();
  if (local.length >= 4 && lower.includes(local)) return 'Password must not contain your email name.';
  return null;
}
