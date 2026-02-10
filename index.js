const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const attendanceRoutes = require('./routes/attendance');
const permissionsRoutes = require('./routes/permissions');
const usersRoutes = require('./routes/users');
const timetableRoutes = require('./routes/timetable');
const reportsRoutes = require('./routes/reports');
const complaintsRoutes = require('./routes/complaints');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Return 503 when database is not connected to avoid leaking ECONNREFUSED to clients
app.use((req, res, next) => {
  try {
    const db = require('./db');
    if (!db.isReady || !db.isReady()) {
      return res.status(503).json({ error: 'Service temporarily unavailable: database not connected' });
    }
  } catch (e) {
    // If db module cannot be loaded for any reason, return 503
    return res.status(503).json({ error: 'Service temporarily unavailable: database module error' });
  }
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/complaints', complaintsRoutes);

app.get('/health', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT NOW()');
    res.json({ ok: true, now: rows[0].now });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Error handling middleware - must be last
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

const PORT = process.env.PORT || 4000;

app.get("/", (req, res) => {
  res.send(`<h2>Backend server is running on port ${PORT}</h2>`);
});


app.listen(PORT, () => {
  // console.log(`Server running on port ${PORT}`);
  console.log(`Backend server is running on port ${PORT}`);
});

