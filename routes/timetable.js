const express = require('express');
const Timetable = require('../models/Timetable');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { day } = req.query;
    let filter = {};
    if (day) filter.day_of_week = day;

    // Student Visibility: Filter by their specific branch/class
    if (req.user.role === 'student') {
      if (req.user.department) filter.department = req.user.department;
      if (req.user.class_name) filter.class_name = req.user.class_name;
    }

    const items = await Timetable.find(filter).sort({ day_of_week: 1, start_time: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/my-schedule', authenticateToken, async (req, res) => {
  try {
    // Faculty search strictly by their verified email from JWT
    const items = await Timetable.find({
      faculty_email: req.user.email
    }).sort({ day_of_week: 1, start_time: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  if (!['admin', 'incharge'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const newItem = new Timetable(req.body);
    await newItem.save();
    res.json({ ok: true, data: newItem });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  if (!['admin', 'incharge'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  try {
    await Timetable.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

