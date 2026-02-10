const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Student creates a leave/permission request
router.post('/', authenticateToken, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Only students can create requests' });
  const { reason, start_date, end_date, faculty_id } = req.body;
  try {
    const q = `INSERT INTO permissions (student_id, faculty_id, reason, start_date, end_date)
      VALUES ($1,$2,$3,$4,$5) RETURNING *`;
    const vals = [req.user.userId, faculty_id || null, reason || '', start_date || null, end_date || null];
    const { rows } = await db.query(q, vals);
    res.json({ ok: true, permission: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Student gets their own requests
router.get('/mine', authenticateToken, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM permissions WHERE student_id=$1 ORDER BY created_at DESC', [req.user.userId]);
    res.json({ rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Faculty/Incharge: list pending requests
router.get('/', authenticateToken, async (req, res) => {
  if (!['faculty','incharge','admin'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const { rows } = await db.query("SELECT p.*, u.name as student_name, u.email as student_email FROM permissions p JOIN users u ON u.id = p.student_id WHERE p.status='pending' ORDER BY p.created_at DESC");
    res.json({ rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Approve or reject
router.put('/:id', authenticateToken, async (req, res) => {
  if (!['faculty','incharge','admin'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { id } = req.params;
  const { status } = req.body;
  if (!['approved','rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    const { rows } = await db.query('UPDATE permissions SET status=$1, updated_at=now() WHERE id=$2 RETURNING *', [status, id]);
    res.json({ ok: true, permission: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
