const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

// Middleware to verify token (Inline for simplicity or import if available)
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

// GET all timetable entries (For Incharge/Admin/Student view)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { day } = req.query;
    let query = 'SELECT * FROM weekly_timetable';
    const params = [];

    if (day) {
      query += ' WHERE day_of_week = $1';
      params.push(day);
    }

    query += ' ORDER BY day_of_week, start_time';

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET My Schedule (For Faculty)
router.get('/my-schedule', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { rows } = await db.query(
      'SELECT * FROM weekly_timetable WHERE faculty_id = $1 ORDER BY day_of_week, start_time',
      [req.user.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST Create new entry (Incharge only)
router.post('/', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'incharge' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { day_of_week, subject, start_time, end_time, faculty_email, faculty_name } = req.body;

    if (!day_of_week || !subject || !start_time || !end_time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let faculty_id = null;
    let final_faculty_name = faculty_name;

    // Resolve faculty email to ID if provided
    if (faculty_email) {
      const userRes = await db.query('SELECT id, name FROM users WHERE email = $1 AND role = $2', [faculty_email.trim().toLowerCase(), 'faculty']);
      if (userRes.rows.length > 0) {
        faculty_id = userRes.rows[0].id;
        final_faculty_name = userRes.rows[0].name; // Auto-update name if matched
      } else {
        // Optional: Error if email provided but not found? Or just store as text?
        // Current plan: store as text if ID not found, but prefer ID.
        // Let's just warn or keep null.
      }
    }

    const { rows } = await db.query(
      `INSERT INTO weekly_timetable (day_of_week, subject, start_time, end_time, faculty_id, faculty_name)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [day_of_week, subject, start_time, end_time, faculty_id, final_faculty_name]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE Entry (Incharge only)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'incharge' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.query('DELETE FROM weekly_timetable WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
