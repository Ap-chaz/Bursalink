import pool from '../config/db.js';

export async function listNotifications(req, res, next) {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    const notifs = rows.map(n => ({
      id: n.id,
      text: n.text,
      go: typeof n.go === 'string' ? JSON.parse(n.go) : n.go,
      read: !!n.is_read,
      at: n.created_at
    }));

    res.json(notifs);
  } catch (err) {
    next(err);
  }
}

export async function markRead(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?', [id, userId]);

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
}

export async function markAllRead(req, res, next) {
  try {
    const userId = req.user.id;
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [userId]);

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
}

export async function getSaved(req, res, next) {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query('SELECT bursary_id FROM saved_bursaries WHERE user_id = ?', [userId]);

    const saved = rows.map(r => r.bursary_id);
    res.json(saved);
  } catch (err) {
    next(err);
  }
}

export async function toggleSave(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [existing] = await pool.query(
      'SELECT * FROM saved_bursaries WHERE user_id = ? AND bursary_id = ?',
      [userId, id]
    );

    let isSaved = false;
    if (existing.length > 0) {
      await pool.query('DELETE FROM saved_bursaries WHERE user_id = ? AND bursary_id = ?', [userId, id]);
      isSaved = false;
    } else {
      await pool.query('INSERT INTO saved_bursaries (user_id, bursary_id) VALUES (?, ?)', [userId, id]);
      isSaved = true;
    }

    const [all] = await pool.query('SELECT bursary_id FROM saved_bursaries WHERE user_id = ?', [userId]);
    const saved = all.map(r => r.bursary_id);

    res.json({ success: true, isSaved, saved });
  } catch (err) {
    next(err);
  }
}
