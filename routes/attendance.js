const express = require('express');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'student') {
      filter.student_id = req.user.userId;
    }
    const logs = await Attendance.find(filter).populate('student_id', 'name email').sort({ marked_at: -1 });
    res.json({ rows: logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/today', authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { period_id } = req.query;
    let filter = { date: today };
    if (period_id) filter.period_id = period_id;

    const logs = await Attendance.find(filter).populate('student_id', 'name email uid');
    const rows = logs.map(log => ({
      student_id: log.student_id?.uid || log.student_id?._id,
      name: log.student_id?.name || 'Unknown',
      email: log.student_id?.email || 'N/A',
      status: log.status,
      marked_at: log.marked_at,
      source: log.source
    }));
    res.json({ rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/manual', authenticateToken, async (req, res) => {
  const { student_id, period_id, status } = req.body;
  try {
    const today = new Date().toISOString().split('T')[0];
    const update = {
      status,
      marked_at: new Date(),
      source: 'web'
    };

    const log = await Attendance.findOneAndUpdate(
      { student_id, date: today, period_id: period_id || 1 },
      update,
      { upsert: true, new: true }
    );

    res.json({ ok: true, data: log });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------------------
// RASPBERRY PI HARDWARE INTEGRATION SECTION
// -------------------------------------------------------------------------

/**
 * @route   POST /api/attendance
 * @desc    Receives real-time attendance data from Raspberry Pi Python scripts.
 * @logic   1. Attempts to sync data with MongoDB Atlas for the central dashboard.
 *          2. Appends a raw record to the local CSV file as requested for logging.
 */
router.post('/', async (req, res) => {
  const { uid, name, status, time, student_id, date, period_id, source } = req.body;
  const CSV_FILE = process.env.CSV_PATH || path.join(__dirname, '../attendance.csv');

  // 1. Save to MongoDB (Keep existing functionality)
  try {
    let finalStudentId = student_id;
    if (uid && !finalStudentId) {
      const user = await User.findOne({ uid });
      if (user) finalStudentId = user._id;
    }

    if (finalStudentId) {
      const newLog = new Attendance({
        student_id: finalStudentId,
        date: date || new Date().toISOString().split('T')[0],
        period_id: period_id || 1,
        status: status === 'IN' ? 'P' : (status || 'P'),
        source: source || 'hardware'
      });
      await newLog.save().catch(e => console.log("MDB Save Skip (Duplicate/Error):", e.message));
    }
  } catch (err) {
    console.log("MongoDB sync error:", err.message);
  }

  // 2. Append to CSV (User's specific request: RegNo, Name, Status, Timestamp)
  const regNo = uid || 'N/A';
  const timestamp = time || new Date().toLocaleString();
  const line = `${regNo},${name || 'Unknown'},${status || 'P'},${timestamp}\n`;

  fs.appendFile(CSV_FILE, line, (err) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Write error");
    }
    console.log("Saved to CSV:", line.trim());
    res.send("OK");
  });
});

/**
 * @route   GET /api/attendance/csv
 * @desc    Fetches the history of attendance logs from the CSV file.
 * @return  JSON array of attendance records in reverse order (Latest First).
 */
router.get('/csv', (req, res) => {
  const CSV_FILE = path.join(__dirname, '../attendance.csv');
  console.log(`[${new Date().toLocaleTimeString()}] GET /api/attendance/csv requested...`);

  try {
    if (!fs.existsSync(CSV_FILE)) {
      console.log("Monitor: attendance.csv not found at", CSV_FILE);
      return res.json([]);
    }

    const content = fs.readFileSync(CSV_FILE, "utf8");
    const lines = content.trim().split(/\r?\n/);
    console.log(`Monitor: Found ${lines.length} lines in CSV`);

    // Skip header line "RegNo,Name,Status,Timestamp"
    const dataLines = lines.length > 1 ? lines.slice(1) : [];

    const formattedData = dataLines.map((l, index) => {
      const [regNo, name, status, time] = l.split(",");
      return {
        regNo: regNo || 'N/A',
        name: name || 'Unknown',
        status: status || 'N/A',
        time: time || 'N/A'
      };
    });

    console.log(`Monitor: Returning ${formattedData.length} records`);
    res.json(formattedData.reverse());
  } catch (err) {
    console.error("Monitor Error:", err.message);
    res.status(500).json({ error: "Failed to read logs" });
  }
});

/**
 * @route   GET /api/attendance/live
 * @desc    Aggregates entry and exit times from the CSV for real-time monitoring.
 */
router.get('/live', (req, res) => {
  const CSV_FILE = path.join(__dirname, '../attendance.csv');
  try {
    if (!fs.existsSync(CSV_FILE)) return res.json([]);

    const content = fs.readFileSync(CSV_FILE, "utf8");
    const lines = content.trim().split(/\r?\n/);
    const dataLines = lines.length > 1 ? lines.slice(1) : [];

    const stats = {};

    dataLines.forEach(l => {
      const [regNo, name, status, time] = l.split(",");
      if (!regNo || regNo === 'N/A' || !time) return;

      if (!stats[regNo]) {
        // Initialize with first scan
        stats[regNo] = {
          regNo,
          name: name || 'Unknown',
          entryTime: time,  // First scan time
          exitTime: null,   // Will be updated with subsequent scans
          lastStatus: status
        };
      } else {
        // Always update exit time with the latest scan
        stats[regNo].exitTime = time;
        stats[regNo].lastStatus = status;

        // Keep the earliest entry time if status is IN
        if (status === 'IN' && !stats[regNo].entryTime) {
          stats[regNo].entryTime = time;
        }
      }
    });

    res.json(Object.values(stats));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

