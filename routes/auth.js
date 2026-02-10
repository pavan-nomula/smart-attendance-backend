const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
require('dotenv').config();

const router = express.Router();

// Email pattern matching for role detection
// Student emails: 24pa or 25pa followed by alphanumeric characters (e.g., 24pa1a0250, 25pa2b1234)
// Updated to be more flexible - just check the prefix before @
const STUDENT_EMAIL_RE = /^(24pa|25pa)[a-z0-9]+$/i;
const FACULTY_EMAIL_RE = /^[a-z]+(\.[a-z]+)*@vishnu\.edu\.in$/; // Matches naveen.m@vishnu.edu.in, p.mohith@vishnu.edu.in, etc.
const INCHARGE_EMAILS = ['admin@vishnu.edu.in']; // Add more incharge emails here

/**
 * Detect role from email address
 */
function detectRoleFromEmail(email) {
  const lowerEmail = email.toLowerCase().trim();
  const emailPrefix = lowerEmail.split('@')[0]; // Get part before @

  // Check if it's an incharge/admin email
  if (INCHARGE_EMAILS.includes(lowerEmail) || lowerEmail.includes('incharge') || lowerEmail.includes('admin')) {
    return 'incharge';
  }

  // Check if it's a student email (24pa/25pa pattern) - check only the prefix
  if (emailPrefix && STUDENT_EMAIL_RE.test(emailPrefix)) {
    return 'student';
  }

  // Check if it's a faculty email (has .m@ or similar pattern)
  if (FACULTY_EMAIL_RE.test(lowerEmail) && emailPrefix && !STUDENT_EMAIL_RE.test(emailPrefix)) {
    return 'faculty';
  }

  // Default to student if pattern matches vishnu.edu.in and starts with 24pa or 25pa
  if (lowerEmail.endsWith('@vishnu.edu.in') && emailPrefix && (emailPrefix.startsWith('24pa') || emailPrefix.startsWith('25pa'))) {
    return 'student';
  }

  return null; // Unknown pattern
}

router.post('/signup', async (req, res) => {
  const { name, email, password, role: requestedRole, inviteCode, activationCode } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Missing fields' });

  // Clean and normalize email
  const cleanEmail = email.trim().toLowerCase();

  // Basic email validation
  if (!cleanEmail.endsWith('@vishnu.edu.in')) {
    return res.status(400).json({ error: 'Email must be a @vishnu.edu.in email address' });
  }

  // Detect role from email if not provided
  let role = requestedRole;
  if (!role) {
    role = detectRoleFromEmail(cleanEmail);
    if (!role) {
      return res.status(400).json({ error: 'Could not determine role from email. Please provide a valid @vishnu.edu.in email.' });
    }
  }

  // For non-student roles, require invite code or activation code
  if (role !== 'student' && !INCHARGE_EMAILS.includes(cleanEmail)) {
    // If faculty, must have a valid activation code
    if (role === 'faculty') {
      if (!activationCode) {
        return res.status(400).json({ error: 'Activation code is required for faculty signup.' });
      }
      const codeCheck = await db.query('SELECT * FROM activation_codes WHERE code = $1 AND is_used = false', [activationCode.trim()]);
      if (codeCheck.rowCount === 0) {
        return res.status(403).json({ error: 'Invalid or already used activation code.' });
      }
    } else {
      // For Admin/Incharge (if not listed in INCHARGE_EMAILS)
      if (!inviteCode || inviteCode !== process.env.ADMIN_INVITE_CODE) {
        return res.status(403).json({ error: 'Invite code required for higher privilege accounts.' });
      }
    }
  }

  // Validate email patterns - for students, check if it starts with 24pa or 25pa followed by alphanumeric
  if (role === 'student') {
    const emailPrefix = cleanEmail.split('@')[0]; // Get part before @
    const pattern = /^(24pa|25pa)[a-z0-9]+$/i;
    if (!pattern.test(emailPrefix)) {
      return res.status(400).json({
        error: `Student email must start with 24pa or 25pa followed by letters and numbers. Example: 24pa1a0250@vishnu.edu.in`
      });
    }
  }

  if (role === 'faculty' && !FACULTY_EMAIL_RE.test(cleanEmail)) {
    return res.status(400).json({ error: 'Faculty email must match pattern name.m@vishnu.edu.in' });
  }

  try {
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const insert = 'INSERT INTO users (name,email,password_hash,role) VALUES ($1,$2,$3,$4) RETURNING id,email,role,name';
    const values = [name.trim(), cleanEmail, hashed, role];
    const { rows } = await db.query(insert, values);
    const user = rows[0];

    // Mark activation code as used if faculty
    if (role === 'faculty' && activationCode) {
      await db.query('UPDATE activation_codes SET is_used = true WHERE code = $1', [activationCode.trim()]);
    }

    const token = jwt.sign({ userId: user.id, role: user.role, name: user.name }, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    res.json({ token, user });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    console.error('Signup error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  try {
    const { rows } = await db.query('SELECT id,name,email,password_hash,role,is_active,must_change_password FROM users WHERE email=$1', [email.toLowerCase().trim()]);
    if (!rows[0]) return res.status(401).json({ error: 'Invalid email or password' });
    const user = rows[0];

    if (user.is_active === false) {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact the administrator.' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ userId: user.id, role: user.role, name: user.name }, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, must_change_password: user.must_change_password } });
  } catch (err) {
    console.error('Login error:', err);
    // Return the error message to help debugging in development/deployment.
    // NOTE: Exposing detailed errors to clients is a security risk in production;
    // revert this change once the underlying issue is fixed.
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Get current user info
router.get('/me', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    const { rows } = await db.query('SELECT id,name,email,role,uid FROM users WHERE id=$1', [payload.userId]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
});

module.exports = router;
