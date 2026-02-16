const express = require('express');
const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Timetable = require('../models/Timetable');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/overall-stats', authenticateToken, async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const today = new Date().toISOString().split('T')[0];
    const presentToday = await Attendance.countDocuments({ date: today, status: 'P' });

    res.json({
      totalStudents,
      presentToday,
      activeRequests: 0 // Placeholder
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/faculty-stats', authenticateToken, async (req, res) => {
  try {
    // Basic aggregation for faculty stats (can be expanded)
    const stats = await Attendance.aggregate([
      { $group: { _id: "$period_id", present: { $sum: { $cond: [{ $eq: ["$status", "P"] }, 1, 0] } }, total: { $sum: 1 } } }
    ]);
    res.json({ rows: stats.map(s => ({ period_id: s._id, total_present: s.present, total_classes: s.total, subject: 'Class ' + s._id })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/attendance-percent/:studentId', authenticateToken, async (req, res) => {
  try {
    const total = await Attendance.countDocuments({ student_id: req.params.studentId });
    const present = await Attendance.countDocuments({ student_id: req.params.studentId, status: 'P' });
    res.json({ total, present, percent: total > 0 ? (present / total) * 100 : 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/attendance-history/:studentId', authenticateToken, async (req, res) => {
  try {
    const logs = await Attendance.find({ student_id: req.params.studentId }).sort({ date: -1 });
    res.json({ rows: logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/subject-wise/:studentId', authenticateToken, async (req, res) => {
  try {
    // Using period_id as subject placeholder for now
    const stats = await Attendance.aggregate([
      { $match: { student_id: new mongoose.Types.ObjectId(req.params.studentId) } },
      { $group: { _id: "$period_id", present: { $sum: { $cond: [{ $eq: ["$status", "P"] }, 1, 0] } }, total: { $sum: 1 } } }
    ]);
    res.json({ rows: stats.map(s => ({ subject: 'Period ' + s._id, present_classes: s.present, total_classes: s.total, percentage: s.total > 0 ? (s.present / s.total) * 100 : 0 })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

