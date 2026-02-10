const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Attendance percentage for a student over a date range
router.get('/attendance-percent', authenticateToken, async (req, res) => {
  // allow incharge/admin/faculty or the student themselves
  const { studentId, from, to } = req.query;
  const targetStudentId = studentId || req.user.userId;
  
  if (!['incharge','admin','faculty'].includes(req.user.role) && String(req.user.userId) !== String(targetStudentId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  try {
    const start = from || '1970-01-01';
    const end = to || new Date().toISOString().slice(0,10);
    const totalQ = `SELECT COUNT(*) FROM attendance WHERE student_id=$1 AND date BETWEEN $2 AND $3`;
    const presentQ = `SELECT COUNT(*) FROM attendance WHERE student_id=$1 AND date BETWEEN $2 AND $3 AND status='P'`;
    const totalRes = await db.query(totalQ, [targetStudentId, start, end]);
    const presentRes = await db.query(presentQ, [targetStudentId, start, end]);
    const total = parseInt(totalRes.rows[0].count,10);
    const present = parseInt(presentRes.rows[0].count,10);
    const percent = total === 0 ? 0 : Math.round((present/total)*10000)/100;
    res.json({ studentId: targetStudentId, from: start, to: end, total, present, percent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get student attendance history
router.get('/attendance-history', authenticateToken, async (req, res) => {
  const { studentId, from, to } = req.query;
  const targetStudentId = studentId || req.user.userId;
  
  if (!['incharge','admin','faculty'].includes(req.user.role) && String(req.user.userId) !== String(targetStudentId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  try {
    const start = from || '1970-01-01';
    const end = to || new Date().toISOString().slice(0,10);
    const q = `SELECT a.*, t.subject, t.period_id, t.start_time, t.end_time
      FROM attendance a
      LEFT JOIN timetable t ON t.period_id = a.period_id AND EXTRACT(DOW FROM a.date) = t.day_of_week
      WHERE a.student_id = $1 AND a.date BETWEEN $2 AND $3
      ORDER BY a.date DESC, a.period_id`;
    const { rows } = await db.query(q, [targetStudentId, start, end]);
    res.json({ rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get subject-wise attendance breakdown
router.get('/subject-wise', authenticateToken, async (req, res) => {
  const { studentId, from, to } = req.query;
  const targetStudentId = studentId || req.user.userId;
  
  if (!['incharge','admin','faculty'].includes(req.user.role) && String(req.user.userId) !== String(targetStudentId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  try {
    const start = from || '1970-01-01';
    const end = to || new Date().toISOString().slice(0,10);
    const q = `SELECT 
      t.subject,
      COUNT(a.id) as total_classes,
      COUNT(CASE WHEN a.status='P' THEN 1 END) as present_classes,
      ROUND(COUNT(CASE WHEN a.status='P' THEN 1 END)::numeric / NULLIF(COUNT(a.id), 0) * 100, 2) as percentage
    FROM attendance a
    JOIN timetable t ON t.period_id = a.period_id AND EXTRACT(DOW FROM a.date) = t.day_of_week
    WHERE a.student_id = $1 AND a.date BETWEEN $2 AND $3
    GROUP BY t.subject
    ORDER BY t.subject`;
    const { rows } = await db.query(q, [targetStudentId, start, end]);
    res.json({ rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get attendance statistics for faculty classes
router.get('/faculty-stats', authenticateToken, async (req, res) => {
  if (req.user.role !== 'faculty') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const { from, to } = req.query;
  try {
    const start = from || '1970-01-01';
    const end = to || new Date().toISOString().slice(0,10);
    const q = `SELECT 
      t.subject,
      t.period_id,
      COUNT(DISTINCT a.date) as total_classes,
      COUNT(CASE WHEN a.status='P' THEN 1 END) as total_present,
      COUNT(CASE WHEN a.status='A' THEN 1 END) as total_absent,
      COUNT(DISTINCT a.student_id) as unique_students
    FROM attendance a
    JOIN timetable t ON t.period_id = a.period_id AND EXTRACT(DOW FROM a.date) = t.day_of_week
    WHERE t.faculty_id = $1 AND a.date BETWEEN $2 AND $3
    GROUP BY t.subject, t.period_id
    ORDER BY t.subject`;
    const { rows } = await db.query(q, [req.user.userId, start, end]);
    res.json({ rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get overall statistics for incharge
router.get('/overall-stats', authenticateToken, async (req, res) => {
  if (!['incharge','admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  try {
    const today = new Date().toISOString().slice(0,10);
    
    // Total students
    const studentsRes = await db.query("SELECT COUNT(*) FROM users WHERE role='student'");
    const totalStudents = parseInt(studentsRes.rows[0].count, 10);
    
    // Today's attendance
    const todayRes = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status='P' THEN 1 END) as present,
        COUNT(CASE WHEN status='A' THEN 1 END) as absent
      FROM attendance 
      WHERE date = $1
    `, [today]);
    
    // Pending permissions
    const pendingPermsRes = await db.query("SELECT COUNT(*) FROM permissions WHERE status='pending'");

    // Pending complaints - the complaints table may not exist in some environments
    // (e.g., before running that migration). Handle missing-relation error gracefully
    // and return 0 instead of throwing a 500.
    let pendingComplaints = 0;
    try {
      const pendingComplaintsRes = await db.query("SELECT COUNT(*) FROM complaints WHERE status='pending'");
      pendingComplaints = parseInt(pendingComplaintsRes.rows[0].count, 10);
    } catch (e) {
      // Postgres error code 42P01 = undefined_table
      if (e && e.code === '42P01') {
        console.warn('complaints table missing; returning 0 pending complaints');
        pendingComplaints = 0;
      } else {
        throw e;
      }
    }

    res.json({
      totalStudents,
      todayAttendance: todayRes.rows[0],
      pendingPermissions: parseInt(pendingPermsRes.rows[0].count, 10),
      pendingComplaints: pendingComplaints
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
