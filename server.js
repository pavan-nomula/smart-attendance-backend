/* 
 * ============================================================
 * SMART ATTENDANCE SYSTEM - HARDWARE-OPTIMIZED SERVER
 * ============================================================
 * 
 * This server is specifically configured to handle connections 
 * from the Raspberry Pi and the React Dashboard.
 * 
 * ARCHITECTURE:
 * - Express.js API on Port 4001
 * - Unified Backend for API and Hardware Events
 * - MongoDB Atlas for cloud storage
 * - Local CSV logging for redundancy
 * ============================================================
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Route Imports
const authRoutes = require('./routes/auth');
const attendanceRoutes = require('./routes/attendance');
const usersRoutes = require('./routes/users');
const permissionsRoutes = require('./routes/permissions');
const timetableRoutes = require('./routes/timetable');
const reportsRoutes = require('./routes/reports');
const complaintsRoutes = require('./routes/complaints');
const hardwareRoutes = require('./routes/hardware');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
        });
        console.log('✅ MongoDB Connected Successfully');
    } catch (err) {
        console.error('❌ MongoDB Connection Failed:', err.message);
        console.log('Ensure your IP is whitelisted in MongoDB Atlas and MONGODB_URI is correct in .env');
    }
};

connectDB();

// Middleware to log all requests (useful for debugging hardware/frontend connection)
app.use((req, res, next) => {
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} from ${clientIP}`);
    next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/complaints', complaintsRoutes);
app.use('/api/hardware', hardwareRoutes);

// Health & Base Routes
app.get('/api', (req, res) => {
    res.json({ ok: true, message: 'Smart Attendance Hardware Server is Active' });
});

app.get('/health', (req, res) => {
    res.json({
        ok: mongoose.connection.readyState === 1,
        db: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        port: 4001,
        time: new Date()
    });
});

app.get('/', (req, res) => {
    res.send('<h1>Smart Attendance Backend</h1><p>Status: Running</p>');
});

// Error Handling
app.use((err, req, res, next) => {
    console.error('Server Error:', err.stack);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

const PORT = process.env.PORT || 4001;
const HOST = '0.0.0.0'; // Essential for external Raspberry Pi access

app.use('/api/attendance', attendanceRoutes);

app.listen(PORT, HOST, () => {
    console.log('==============================================');
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📡 Hardware Access: http://<YOUR_IP>:${PORT}/api/attendance`);
    console.log('==============================================');
});
