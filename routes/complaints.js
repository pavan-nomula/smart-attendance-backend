const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Student creates a complaint/suggestion
router.post('/', authenticateToken, async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Only students can submit complaints' });
  }
  
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }
  
  try {
    const q = `INSERT INTO complaints (student_id, message) VALUES ($1, $2) RETURNING *`;
    const { rows } = await db.query(q, [req.user.userId, message.trim()]);
    res.json({ ok: true, complaint: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Student gets their own complaints
router.get('/mine', authenticateToken, async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  try {
    const { rows } = await db.query(
      'SELECT * FROM complaints WHERE student_id=$1 ORDER BY created_at DESC',
      [req.user.userId]
    );
    res.json({ rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Incharge/Admin gets all complaints
router.get('/', authenticateToken, async (req, res) => {
  if (!['incharge','admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  try {
    const q = `SELECT c.*, u.name as student_name, u.email as student_email
      FROM complaints c
      JOIN users u ON u.id = c.student_id
      ORDER BY c.created_at DESC`;
    const { rows } = await db.query(q);
    res.json({ rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update complaint status (incharge/admin only)
router.put('/:id', authenticateToken, async (req, res) => {
  if (!['incharge','admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const { id } = req.params;
  const { status } = req.body;
  
  if (!['pending','resolved','dismissed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  try {
    const { rows } = await db.query(
      'UPDATE complaints SET status=$1, updated_at=now() WHERE id=$2 RETURNING *',
      [status, id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Complaint not found' });
    }
    
    res.json({ ok: true, complaint: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;