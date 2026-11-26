// CSRF defence in depth (on top of SameSite=Strict session cookies):
//  1. every state-changing request must carry the custom X-Requested-With header. A cross-site page cannot add
//     custom headers without a CORS pre-flight, which our CORS policy refuses for foreign origins.
//  2. in production the Origin header (when present) must be one of our own origins.
const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

export function csrfProtection(allowedOrigins) {
  return (req, res, next) => {
    if (SAFE.has(req.method)) return next();

    if (req.get('x-requested-with') !== 'bursalink') {
      return res.status(403).json({ error: 'Request blocked' });
    }

    const origin = req.get('origin');
    if (process.env.NODE_ENV === 'production' && origin && !allowedOrigins.includes(origin)) {
      return res.status(403).json({ error: 'Request blocked' });
    }
    next();
  };
}
