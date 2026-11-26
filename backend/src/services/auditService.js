import pool from '../config/db.js';

export async function logAudit(action, { userId = null, details = null, req = null } = {}) {
  try {
    // req.ip honours the configured trust-proxy setting; never trust a raw client-supplied X-Forwarded-For.
    const ip = req ? (req.ip || req.socket?.remoteAddress || 'unknown') : null;
    const userAgent = req ? (req.headers['user-agent'] || 'unknown').slice(0, 255) : null;

    await pool.execute(
      `INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        action,
        details ? JSON.stringify(details) : null,
        typeof ip === 'string' ? ip.slice(0, 45) : null,
        userAgent
      ]
    );
  } catch (err) {
    console.error('Audit logging error:', err.message);
  }
}
