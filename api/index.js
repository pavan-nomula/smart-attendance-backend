/* 
 * ============================================================
 * SMART ATTENDANCE SYSTEM - CORE BACKEND
 * ============================================================
 * 
 * ARCHITECTURE OVERVIEW:
 * This is a "Unified Backend" system running on port 4001.
 * 
 * Why it is Unified:
 * To avoid port conflicts and ensure a stable connection between 
 * the Raspberry Pi and the React Dashboard, we merged the hardware 
 * listeners directly into this main server.
 * 
 * Key Features:
 * - Express.js API for Mobile and Web Dashboards
 * - Real-time Hardware Listener for Raspberry Pi (CSV Support)
 * - MongoDB Atlas Cloud Integration
 * ============================================================
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('../routes/auth');
const attendanceRoutes = require('../routes/attendance');
const permissionsRoutes = require('../routes/permissions');
const usersRoutes = require('../routes/users');
const timetableRoutes = require('../routes/timetable');
const reportsRoutes = require('../routes/reports');
const complaintsRoutes = require('../routes/complaints');
const hardwareRoutes = require('../routes/hardware');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      connectTimeoutMS: 10000,
    });
    console.log('✅ Connected to MongoDB Atlas');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('Please check your MONGODB_URI in .env and ensure your IP is whitelisted or DNS is working.');
  }
};

connectDB();

app.get('/api', (req, res) => {
  res.json({ ok: true, message: 'Smart Attendance API is running on port 4001' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/complaints', complaintsRoutes);
app.use('/api/hardware', hardwareRoutes);

app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  res.json({
    ok: mongoose.connection.readyState === 1,
    status: 'Active',
    database: dbStatus,
    message: 'Smart Attendance MongoDB API is running'
  });
});

app.get("/", (req, res) => {
  res.send(`<h2>Smart Attendance MongoDB Backend is running</h2><p>DB Status: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}</p>`);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message || 'Something went wrong'
  });
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend server is running on port ${PORT}`);
  console.log(`🏠 Local URL: http://localhost:${PORT}/api`);
  console.log(`📡 Network URL: http://192.168.0.107:${PORT}/api`);
});
