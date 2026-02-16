const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ActivationCode = require('../models/ActivationCode');
require('dotenv').config();

const router = express.Router();

const STUDENT_EMAIL_RE = /^(24pa|25pa)[a-z0-9]+$/i;
const FACULTY_EMAIL_RE = /^[a-z]+(\.[a-z]+)*@vishnu\.edu\.in$/;
const INCHARGE_EMAILS = ['admin@vishnu.edu.in'];

function detectRoleFromEmail(email) {
  const lowerEmail = email.toLowerCase().trim();
  const emailPrefix = lowerEmail.split('@')[0];

  if (INCHARGE_EMAILS.includes(lowerEmail) || lowerEmail.includes('incharge') || lowerEmail.includes('admin')) {
    return 'incharge';
  }
  if (emailPrefix && STUDENT_EMAIL_RE.test(emailPrefix)) {
    return 'student';
  }
  if (FACULTY_EMAIL_RE.test(lowerEmail) && emailPrefix && !STUDENT_EMAIL_RE.test(emailPrefix)) {
    return 'faculty';
  }
  return null;
}

router.post('/signup', async (req, res) => {
  const { name, email, password, role: requestedRole, inviteCode, activationCode } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });

  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail.endsWith('@vishnu.edu.in')) {
    return res.status(400).json({ error: 'Email must be a @vishnu.edu.in email address' });
  }

  let role = requestedRole || detectRoleFromEmail(cleanEmail);
  if (!role) {
    return res.status(400).json({ error: 'Could not determine role from email.' });
  }

  // Verification for non-student roles
  if (role !== 'student' && !INCHARGE_EMAILS.includes(cleanEmail)) {
    if (role === 'faculty') {
      if (!activationCode) return res.status(400).json({ error: 'Activation code required for faculty.' });
      const codeRecord = await ActivationCode.findOne({ code: activationCode.trim(), is_used: false });
      if (!codeRecord) return res.status(403).json({ error: 'Invalid or used activation code.' });
      codeRecord.is_used = true;
      await codeRecord.save();
    } else {
      if (!inviteCode || inviteCode !== process.env.ADMIN_INVITE_CODE) {
        return res.status(403).json({ error: 'Invite code required.' });
      }
    }
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const newUser = new User({
      name: name.trim(),
      email: cleanEmail,
      password_hash: hashed,
      role
    });

    await newUser.save();

    const token = jwt.sign(
      {
        userId: newUser._id,
        role: newUser.role,
        name: newUser.name,
        email: newUser.email,
        department: newUser.department,
        class_name: newUser.class_name
      },
      process.env.JWT_SECRET || 'secret'
    );
    res.json({ token, user: { id: newUser._id, email: newUser.email, role: newUser.role, name: newUser.name, department: newUser.department, class_name: newUser.class_name } });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    if (!user.is_active) return res.status(403).json({ error: 'Account deactivated.' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        name: user.name,
        email: user.email,
        department: user.department,
        class_name: user.class_name
      },
      process.env.JWT_SECRET || 'secret'
    );
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        class_name: user.class_name,
        must_change_password: user.must_change_password
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(payload.userId).select('name email role uid');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
});

module.exports = router;
