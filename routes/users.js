const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const emailService = require('../services/emailService');

const router = express.Router();

// Get current user info
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id,name,email,role,uid FROM users WHERE id=$1', [req.user.userId]);
    res.json({ user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Incharge/admin: list users (with optional filters)
router.get('/', authenticateToken, async (req, res) => {
  if (!['incharge', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { role, department, class_name, search } = req.query;
  console.log(`GET /users - Requester Role: ${req.user.role}, Query Role: ${role}`);
  try {
    let q = 'SELECT id,name,email,role,uid,is_active,department,class_name,created_at FROM users WHERE 1=1';
    const vals = [];
    let paramIdx = 1;

    if (role) {
      q += ` AND role=$${paramIdx++}`;
      vals.push(role);
    }
    // FIX: Restrict Incharge to only see students
    if (req.user.role === 'incharge') {
      q += ` AND role=$${paramIdx++}`;
      vals.push('student');
    }

    if (department) {
      q += ` AND department=$${paramIdx++}`;
      vals.push(department);
    }
    if (class_name) {
      q += ` AND class_name=$${paramIdx++}`;
      vals.push(class_name);
    }
    if (search) {
      q += ` AND (name ILIKE $${paramIdx} OR email ILIKE $${paramIdx})`;
      vals.push(`%${search}%`);
      paramIdx++;
    }

    q += ' ORDER BY name';
    const { rows } = await db.query(q, vals);
    res.json({ rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create user (incharge/admin only). Admin can provide `password`; if not provided a temporary password is generated.
router.post('/', authenticateToken, async (req, res) => {
  if (!['incharge', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { name, email, role, uid, password, department, class_name } = req.body;
  if (!name || !email || !role) return res.status(400).json({ error: 'Missing required fields' });

  // STRICT SCOPING: Incharge can ONLY create students
  if (req.user.role === 'incharge' && role !== 'student') {
    return res.status(403).json({ error: 'Incharges can only create Student accounts.' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith('@vishnu.edu.in')) {
      return res.status(400).json({ error: 'Email must be a @vishnu.edu.in email address' });
    }

    if (role === 'student') {
      const emailPrefix = cleanEmail.split('@')[0];
      if (!emailPrefix.match(/^(24pa|25pa)[a-z0-9]+$/i)) {
        return res.status(400).json({
          error: 'Student email must start with 24pa or 25pa followed by letters and numbers (e.g., 24pa1a0250@vishnu.edu.in)'
        });
      }
    }

    let hashed;
    let mustChangePassword = false;
    let tempPassword = password || 'Welcome#2026';

    hashed = await bcrypt.hash(tempPassword, 10);
    mustChangePassword = true; // Admins create accounts with default password, user must change it.

    const insertQuery = 'INSERT INTO users (name, email, password_hash, role, uid, must_change_password, department, class_name) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id,name,email,role,uid';
    const insertValues = [name.trim(), cleanEmail, hashed, role, uid ? uid.trim() : null, mustChangePassword, department, class_name];

    const { rows } = await db.query(insertQuery, insertValues);

    // Send mock email
    await emailService.sendWelcomeEmail(cleanEmail, name.trim(), tempPassword);

    res.json({ ok: true, user: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    console.error('Create user error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Update user (incharge/admin only)
router.put('/:id', authenticateToken, async (req, res) => {
  if (!['incharge', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { id } = req.params;
  const { name, email, role, uid } = req.body;

  try {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (email) {
      updates.push(`email = $${paramCount++}`);
      values.push(email.toLowerCase());
    }
    if (role) {
      updates.push(`role = $${paramCount++}`);
      values.push(role);
    }
    if (uid !== undefined) {
      updates.push(`uid = $${paramCount++}`);
      values.push(uid);
    }
    if (department !== undefined) {
      updates.push(`department = $${paramCount++}`);
      values.push(department);
    }
    if (class_name !== undefined) {
      updates.push(`class_name = $${paramCount++}`);
      values.push(class_name);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const q = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id,name,email,role,uid`;
    const { rows } = await db.query(q, values);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ ok: true, user: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user (incharge/admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
  if (!['incharge', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { id } = req.params;

  // Prevent deleting yourself
  if (String(id) === String(req.user.userId)) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  try {
    const { rows } = await db.query('DELETE FROM users WHERE id=$1 RETURNING id,name,email', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ ok: true, deleted: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Map UID to a student (for Raspberry Pi mapping) - incharge only
router.put('/map-uid/:id', authenticateToken, async (req, res) => {
  if (!['incharge', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { id } = req.params;
  const { uid } = req.body;
  try {
    const { rows } = await db.query('UPDATE users SET uid=$1 WHERE id=$2 RETURNING id,name,email,uid', [uid, id]);
    res.json({ ok: true, user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset or set password for a user. Admin/incharge can set or reset; users can change their own password.
router.put('/reset-password/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  // Allow if admin/incharge or the user themself
  if (!(['incharge', 'admin'].includes(req.user.role) || String(req.user.userId) === String(id))) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    let newPassword = password;
    let tempPassword = null;
    if (!newPassword) {
      tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      newPassword = tempPassword;
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    // Check if columns exist
    const { rows: columns } = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='users' AND column_name IN ('must_change_password', 'password_changed_at')
    `);
    const hasMustChange = columns.some(c => c.column_name === 'must_change_password');
    const hasChangedAt = columns.some(c => c.column_name === 'password_changed_at');

    let updateQuery = 'UPDATE users SET password_hash=$1';
    const values = [hashed];
    let paramCount = 2;

    if (hasMustChange) {
      updateQuery += `, must_change_password=$${paramCount++}`;
      // If an admin/incharge resets the password, the user MUST change it on next login.
      // If the user changes it themselves, they have already fulfilled the requirement.
      const isAdminReset = ['incharge', 'admin'].includes(req.user.role) && String(req.user.userId) !== String(id);
      values.push(isAdminReset);
    }
    if (hasChangedAt) {
      updateQuery += `, password_changed_at=now()`;
    }

    updateQuery += ` WHERE id=$${paramCount} RETURNING id,name,email,role,uid`;
    values.push(id);

    const { rows } = await db.query(updateQuery, values);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ ok: true, user: rows[0], tempPassword });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Toggle user active status
router.post('/toggle-status/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { id } = req.params;
  try {
    const { rows } = await db.query('UPDATE users SET is_active = NOT is_active WHERE id=$1 RETURNING id, name, is_active', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ ok: true, user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Promote faculty to incharge
router.post('/promote/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { id } = req.params;
  try {
    const { rows } = await db.query("UPDATE users SET role = 'incharge' WHERE id=$1 AND role='faculty' RETURNING id, name, role", [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found or not a faculty' });
    res.json({ ok: true, user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Demote incharge to faculty
router.post('/demote/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { id } = req.params;
  try {
    const { rows } = await db.query("UPDATE users SET role = 'faculty' WHERE id=$1 AND role='incharge' RETURNING id, name, role", [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found or not an incharge' });
    res.json({ ok: true, user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Delete user
router.delete('/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { id } = req.params;
  try {
    const { rows } = await db.query('DELETE FROM users WHERE id=$1 RETURNING id', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ ok: true, deletedId: rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

module.exports = router;
