import pool from '../config/db.js';
import { logAudit } from '../services/auditService.js';

export async function getProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query('SELECT * FROM profiles WHERE user_id = ?', [userId]);

    let profile = rows[0] || null;
    if (profile) {
      profile = {
        ...profile,
        area: typeof profile.area === 'string' ? JSON.parse(profile.area) : profile.area,
        docs: typeof profile.docs === 'string' ? JSON.parse(profile.docs) : (profile.docs || {}),
        details: typeof profile.details === 'string' ? JSON.parse(profile.details) : (profile.details || {}),
        notify: {
          status: !!profile.notify_status,
          deadline: !!profile.notify_deadline,
          match: !!profile.notify_match
        },
        saver: !!profile.saver_mode
      };
      // Flatten details to top level for convenient frontend access if present
      if (profile.details) {
        Object.assign(profile, profile.details);
      }
    }

    // Check for pending area request
    const [areaReqs] = await pool.query(
      "SELECT * FROM area_requests WHERE user_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
      [userId]
    );

    const areaReq = areaReqs.length > 0 ? {
      id: areaReqs[0].id,
      area: typeof areaReqs[0].target_area === 'string' ? JSON.parse(areaReqs[0].target_area) : areaReqs[0].target_area,
      reason: areaReqs[0].reason,
      status: areaReqs[0].status,
      created_at: areaReqs[0].created_at
    } : null;

    res.json({ profile, areaReq });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const patch = req.body;

    const [existing] = await pool.query('SELECT * FROM profiles WHERE user_id = ?', [userId]);
    if (existing.length === 0) {
      await pool.query('INSERT INTO profiles (user_id) VALUES (?)', [userId]);
    }

    const current = existing[0] || {};
    let currentDocs = typeof current.docs === 'string' ? JSON.parse(current.docs) : (current.docs || {});
    let currentDetails = typeof current.details === 'string' ? JSON.parse(current.details) : (current.details || {});

    // Update docs if provided
    if (patch.docs) {
      currentDocs = { ...currentDocs, ...patch.docs };
    }

    // Extract student details
    const detailKeys = ['name', 'phone', 'school', 'level', 'year', 'idNo', 'guardian'];
    for (const k of detailKeys) {
      if (patch[k] !== undefined) {
        currentDetails[k] = patch[k];
      }
    }

    const saver = patch.saver !== undefined ? (patch.saver ? 1 : 0) : current.saver_mode;
    const lang = patch.lang || current.lang || 'en';
    const notifyStatus = patch.notify?.status !== undefined ? (patch.notify.status ? 1 : 0) : current.notify_status;
    const notifyDeadline = patch.notify?.deadline !== undefined ? (patch.notify.deadline ? 1 : 0) : current.notify_deadline;
    const notifyMatch = patch.notify?.match !== undefined ? (patch.notify.match ? 1 : 0) : current.notify_match;

    await pool.query(
      `UPDATE profiles
       SET docs = ?, details = ?, saver_mode = ?, lang = ?, notify_status = ?, notify_deadline = ?, notify_match = ?
       WHERE user_id = ?`,
      [
        JSON.stringify(currentDocs),
        JSON.stringify(currentDetails),
        saver,
        lang,
        notifyStatus,
        notifyDeadline,
        notifyMatch,
        userId
      ]
    );

    res.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    next(err);
  }
}

export async function registerArea(req, res, next) {
  try {
    const userId = req.user.id;
    const { area } = req.body;

    if (!area) {
      return res.status(400).json({ error: 'Area information is required' });
    }

    const [rows] = await pool.query('SELECT area FROM profiles WHERE user_id = ?', [userId]);
    if (rows.length > 0 && rows[0].area && rows[0].area !== 'null') {
      return res.status(400).json({ error: 'Area is already registered and locked. Request an area change to update it.' });
    }

    await pool.query(
      'UPDATE profiles SET area = ? WHERE user_id = ?',
      [JSON.stringify(area), userId]
    );

    await logAudit('AREA_REGISTERED', {
      userId,
      details: { area },
      req
    });

    res.json({ success: true, area });
  } catch (err) {
    next(err);
  }
}

export async function requestAreaChange(req, res, next) {
  try {
    const userId = req.user.id;
    const { area, reason } = req.body;

    if (!area || !reason) {
      return res.status(400).json({ error: 'Target area and reason are required' });
    }

    // Check for existing pending request
    const [pending] = await pool.query(
      "SELECT id FROM area_requests WHERE user_id = ? AND status = 'pending'",
      [userId]
    );

    if (pending.length > 0) {
      return res.status(400).json({ error: 'You already have an area change request pending review.' });
    }

    await pool.query(
      'INSERT INTO area_requests (user_id, target_area, reason) VALUES (?, ?, ?)',
      [userId, JSON.stringify(area), reason]
    );

    await logAudit('AREA_CHANGE_REQUESTED', {
      userId,
      details: { targetArea: area, reason },
      req
    });

    res.json({ success: true, message: 'Area change request submitted successfully' });
  } catch (err) {
    next(err);
  }
}

const safeParse = v => {
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch { return v; }
};

export async function getAreaRequests(req, res, next) {
  try {
    const [rows] = await pool.query(`
      SELECT ar.*, u.email as user_email
      FROM area_requests ar
      JOIN users u ON ar.user_id = u.id
      ORDER BY ar.created_at DESC
    `);

    const requests = rows.map(r => ({
      ...r,
      target_area: safeParse(r.target_area)
    }));

    res.json(requests);
  } catch (err) {
    next(err);
  }
}

export async function getAuditLogs(req, res, next) {
  try {
    const [rows] = await pool.query(`
      SELECT a.*, u.email as actor_email
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 200
    `);

    res.json(rows.map(r => ({
      id: r.id,
      action: r.action,
      target: r.details ? (typeof r.details === 'string' ? r.details : JSON.stringify(r.details)) : '',
      actor: r.actor_email || (r.ip_address ? `IP: ${r.ip_address}` : 'System'),
      at: r.created_at
    })));
  } catch (err) {
    next(err);
  }
}

export async function reviewAreaRequest(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: "Status must be 'approved' or 'rejected'" });
    }

    const [reqs] = await pool.query('SELECT * FROM area_requests WHERE id = ?', [id]);
    if (reqs.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const areaReq = reqs[0];
    await pool.query('UPDATE area_requests SET status = ? WHERE id = ?', [status, id]);

    if (status === 'approved') {
      const areaVal = typeof areaReq.target_area === 'object'
        ? JSON.stringify(areaReq.target_area)
        : areaReq.target_area;
      await pool.query('UPDATE profiles SET area = ? WHERE user_id = ?', [areaVal, areaReq.user_id]);
    }

    // Send notification to user
    const notifId = 'notif_' + Date.now();
    const text = `Your area transfer request was ${status}.`;
    await pool.query(
      'INSERT INTO notifications (id, user_id, text, go) VALUES (?, ?, ?, ?)',
      [notifId, areaReq.user_id, text, JSON.stringify({ view: 'profile' })]
    );

    await logAudit('AREA_REQUEST_REVIEWED', {
      userId: req.user.id,
      details: { requestId: id, applicantUserId: areaReq.user_id, status },
      req
    });

    res.json({ success: true, message: `Area request ${status}` });
  } catch (err) {
    next(err);
  }
}
