const express = require('express');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'student') {
      filter.student_id = req.user.userId;
    } else if (req.user.role === 'incharge') {
      // Branch-based scoping: Incharges only see complaints from their department
      const studentIds = await User.find({ department: req.user.department, role: 'student' }).distinct('_id');
      filter.student_id = { $in: studentIds };
    }

    const items = await Complaint.find(filter).populate('student_id', 'name department').sort({ createdAt: -1 });
    res.json({ rows: items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/mine', authenticateToken, async (req, res) => {
  try {
    const items = await Complaint.find({ student_id: req.user.userId }).sort({ createdAt: -1 });
    res.json({ rows: items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const newItem = new Complaint({
      student_id: req.user.userId,
      message: req.body.message
    });
    await newItem.save();
    res.json({ ok: true, data: newItem });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  if (!['incharge', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Permission denied' });
  try {
    const item = await Complaint.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json({ ok: true, data: item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
