const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// POST /api/attendance/mark
// body: { uid }  OR { studentId, period_id }
router.post('/mark', async (req, res) => {
  const { uid, studentId, period_id, timestamp } = req.body;
  try {
    let student;
    if (uid) {
      const { rows } = await db.query('SELECT id FROM users WHERE uid=$1', [uid]);
      student = rows[0];
      if (!student) return res.status(404).json({ error: 'UID not mapped to any student' });
    } else if (studentId) {
      const { rows } = await db.query('SELECT id FROM users WHERE id=$1', [studentId]);
      student = rows[0];
      if (!student) return res.status(404).json({ error: 'Student not found' });
    } else {
      return res.status(400).json({ error: 'uid or studentId required' });
    }

    const date = timestamp ? new Date(timestamp).toISOString().slice(0,10) : new Date().toISOString().slice(0,10);
    const markedAt = timestamp ? new Date(timestamp) : new Date();

    const upsert = `INSERT INTO attendance (student_id,date,period_id,status,marked_at,source)
      VALUES ($1,$2,$3,'P',$4,$5)
      ON CONFLICT (student_id,date,period_id) DO UPDATE SET status='P', marked_at=EXCLUDED.marked_at, source=EXCLUDED.source
      RETURNING *`;

    const source = uid ? 'pi' : 'web';
    const values = [student.id, date, period_id || null, markedAt, source];
    const { rows } = await db.query(upsert, values);
    res.json({ ok: true, attendance: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/attendance/today?period_id=...
router.get('/today', authenticateToken, async (req, res) => {
  const { period_id } = req.query;
  try {
    const date = new Date().toISOString().slice(0,10);
    const currentDay = new Date().getDay(); // 0 = Sunday, 6 = Saturday
    
    // If period_id is provided, use it; otherwise try to find current period from timetable
    let targetPeriodId = period_id ? parseInt(period_id, 10) : null;
    
    if (!targetPeriodId) {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
      
      // Find current period based on time
      const periodQuery = `SELECT period_id FROM timetable 
        WHERE day_of_week = $1 
        AND start_time <= $2 
        AND end_time >= $2 
        LIMIT 1`;
      const periodResult = await db.query(periodQuery, [currentDay, currentTime]);
      if (periodResult.rows.length > 0) {
        targetPeriodId = periodResult.rows[0].period_id;
      }
    }
    
    const q = `SELECT u.id as student_id, u.name, u.email, a.status, a.marked_at, a.source, a.period_id
      FROM users u
      LEFT JOIN attendance a ON a.student_id = u.id AND a.date = $1 AND (a.period_id = $2 OR ($2 IS NULL AND a.period_id IS NULL))
      WHERE u.role = 'student'
      ORDER BY u.name`;
    const { rows } = await db.query(q, [date, targetPeriodId]);
    res.json({ date, period_id: targetPeriodId, rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark attendance manually (faculty/incharge only)
router.post('/manual', authenticateToken, async (req, res) => {
  if (!['faculty','incharge','admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const { studentId, period_id, status, date } = req.body;
  
  if (!studentId || !status || !['P','A'].includes(status)) {
    return res.status(400).json({ error: 'Invalid parameters' });
  }
  
  try {
    const attendanceDate = date || new Date().toISOString().slice(0,10);
    const markedAt = new Date();
    
    const upsert = `INSERT INTO attendance (student_id,date,period_id,status,marked_at,source)
      VALUES ($1,$2,$3,$4,$5,'web')
      ON CONFLICT (student_id,date,period_id) DO UPDATE SET status=$4, marked_at=$5, source='web'
      RETURNING *`;
    
    const { rows } = await db.query(upsert, [studentId, attendanceDate, period_id || null, status, markedAt]);
    res.json({ ok: true, attendance: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
