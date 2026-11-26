import { resolveSession } from '../services/sessionService.js';
import { SESSION_COOKIE } from '../config/security.js';

// Sessions travel ONLY in the HttpOnly cookie. Authorization headers / tokens in JS-readable storage are not accepted.
async function attachSession(req) {
  const token = req.cookies?.[SESSION_COOKIE()];
  if (!token) return false;
  const session = await resolveSession(token);
  if (!session) return false;
  req.user = session.user;
  req.sessionId = session.sessionId;
  return true;
}

export async function authenticate(req, res, next) {
  try {
    if (await attachSession(req)) return next();
    return res.status(401).json({ error: 'Authentication required' });
  } catch (err) {
    next(err);
  }
}

export async function optionalAuthenticate(req, res, next) {
  try {
    await attachSession(req);
  } catch {
    // treat lookup failure as anonymous
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
