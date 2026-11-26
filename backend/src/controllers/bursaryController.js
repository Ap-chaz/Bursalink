import pool from '../config/db.js';

export async function listBursaries(req, res, next) {
  try {
    const isAdmin = req.user?.role === 'admin';
    const query = isAdmin
      ? 'SELECT * FROM bursaries ORDER BY opens DESC'
      : "SELECT * FROM bursaries WHERE status != 'draft' ORDER BY opens DESC";

    const [rows] = await pool.execute(query);

    // Parse JSON columns
    const bursaries = rows.map(b => ({
      ...b,
      place: typeof b.place === 'string' ? JSON.parse(b.place) : b.place,
      levels: typeof b.levels === 'string' ? JSON.parse(b.levels) : (b.levels || []),
      docs: typeof b.docs === 'string' ? JSON.parse(b.docs) : (b.docs || []),
      opens: b.opens ? new Date(b.opens).toISOString().slice(0, 10) : null,
      closes: b.closes ? new Date(b.closes).toISOString().slice(0, 10) : null
    }));

    res.json(bursaries);
  } catch (err) {
    next(err);
  }
}

export async function getBursaryById(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute('SELECT * FROM bursaries WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Bursary not found' });
    }

    const b = rows[0];
    const isAdmin = req.user?.role === 'admin';
    if (!isAdmin && b.status === 'draft') {
      return res.status(404).json({ error: 'Bursary not found' });
    }
    res.json({
      ...b,
      place: typeof b.place === 'string' ? JSON.parse(b.place) : b.place,
      levels: typeof b.levels === 'string' ? JSON.parse(b.levels) : (b.levels || []),
      docs: typeof b.docs === 'string' ? JSON.parse(b.docs) : (b.docs || []),
      opens: b.opens ? new Date(b.opens).toISOString().slice(0, 10) : null,
      closes: b.closes ? new Date(b.closes).toISOString().slice(0, 10) : null
    });
  } catch (err) {
    next(err);
  }
}

export async function createBursary(req, res, next) {
  try {
    const {
      id = 'b_' + Date.now(),
      title,
      org,
      type,
      place,
      min = 0,
      max = 0,
      levels = [],
      opens,
      closes,
      status = 'published',
      docs = [],
      desc = '',
      how = '',
      contact = '',
      q = ''
    } = req.body;

    if (!title || !org || !type || !opens || !closes) {
      return res.status(400).json({ error: 'Missing required bursary fields' });
    }

    await pool.execute(
      `INSERT INTO bursaries (id, title, org, type, place, min, max, levels, opens, closes, status, docs, \`desc\`, how, contact, q)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        title,
        org,
        type,
        place ? JSON.stringify(place) : null,
        min,
        max,
        JSON.stringify(levels),
        opens,
        closes,
        status,
        JSON.stringify(docs),
        desc,
        how,
        contact,
        q
      ]
    );

    res.status(201).json({ success: true, id, message: 'Bursary created successfully' });
  } catch (err) {
    next(err);
  }
}

export async function updateBursary(req, res, next) {
  try {
    const { id } = req.params;
    const updates = req.body;

    const fields = [];
    const values = [];

    const allowed = ['title', 'org', 'type', 'min', 'max', 'opens', 'closes', 'status', 'desc', 'how', 'contact', 'q'];
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        fields.push(`\`${key}\` = ?`);
        values.push(updates[key]);
      }
    }

    if (updates.place !== undefined) {
      fields.push('place = ?');
      values.push(updates.place ? JSON.stringify(updates.place) : null);
    }
    if (updates.levels !== undefined) {
      fields.push('levels = ?');
      values.push(JSON.stringify(updates.levels));
    }
    if (updates.docs !== undefined) {
      fields.push('docs = ?');
      values.push(JSON.stringify(updates.docs));
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update' });
    }

    values.push(id);
    const [result] = await pool.execute(`UPDATE bursaries SET ${fields.join(', ')} WHERE id = ?`, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Bursary not found' });
    }

    res.json({ success: true, message: 'Bursary updated successfully' });
  } catch (err) {
    next(err);
  }
}
