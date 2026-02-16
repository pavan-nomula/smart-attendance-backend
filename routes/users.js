const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('name email role uid');
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', authenticateToken, async (req, res) => {
  if (!['incharge', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { role, department, class_name, search } = req.query;

  try {
    let filter = {};
    if (role) filter.role = role;

    // Scoping for Incharges
    if (req.user.role === 'incharge') {
      filter.role = 'student';
      if (req.user.department) {
        filter.department = req.user.department;
      }
    } else {
      // Admin can filter by any params
      if (department) filter.department = department;
      if (class_name) filter.class_name = class_name;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const rows = await User.find(filter).sort({ name: 1 });
    res.json({ rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  if (!['incharge', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { name, email, role, uid, id_number, password, department, class_name } = req.body;

  if (req.user.role === 'incharge' && role !== 'student') {
    return res.status(403).json({ error: 'Incharges can only create Student accounts.' });
  }

  try {
    const hashed = await bcrypt.hash(password || 'Welcome#4', 10);

    // Auto-assign department and class_name from the creator (Incharge) if applicable
    let finalDept = department;
    let finalClass = class_name;

    if (req.user.role === 'incharge') {
      finalDept = req.user.department || finalDept;
      finalClass = req.user.class_name || finalClass;
    }

    const newUser = new User({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password_hash: hashed,
      role,
      uid: uid ? uid.trim() : null,
      id_number: id_number ? id_number.trim() : null,
      department: finalDept,
      class_name: finalClass,
      must_change_password: true
    });

    await newUser.save();
    res.json({ ok: true, user: newUser });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  if (!['incharge', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ ok: true, user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  if (!['incharge', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  if (String(req.params.id) === String(req.user.userId)) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ ok: true, deleted: user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/toggle-status/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.is_active = !user.is_active;
    await user.save();
    res.json({ ok: true, user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/promote/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  try {
    const user = await User.findOneAndUpdate({ _id: req.params.id, role: 'faculty' }, { role: 'incharge' }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found or not faculty' });
    res.json({ ok: true, user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/demote/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  try {
    const user = await User.findOneAndUpdate({ _id: req.params.id, role: 'incharge' }, { role: 'faculty' }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found or not incharge' });
    res.json({ ok: true, user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/change-password/:id', authenticateToken, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ error: 'New password is required' });

    // Authorization check: either admin or the user themselves
    if (req.user.role !== 'admin' && String(req.user.userId) !== String(req.params.id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    const user = await User.findByIdAndUpdate(req.params.id, {
      password_hash: hashed,
      must_change_password: false
    }, { new: true });

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ ok: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/map-uid/:id', authenticateToken, async (req, res) => {
  if (!['admin', 'incharge'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: 'UID is required' });

    const user = await User.findByIdAndUpdate(req.params.id, { uid: uid.trim() }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ ok: true, user });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'UID already mapped to another user' });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
