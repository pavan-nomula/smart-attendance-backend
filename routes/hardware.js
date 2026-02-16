const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// POST /api/hardware/upload-csv
// Processes attendance from Raspberry Pi CSV file
router.post('/upload-csv', authenticateToken, upload.single('file'), async (req, res) => {
    if (!['admin', 'incharge'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Permission denied' });
    }

    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const results = [];
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            try {
                let count = 0;
                for (const row of results) {
                    // Expected CSV headers: student_id, status, marked_at (optional), period_id (optional)
                    const studentId = row.student_id || row.id;
                    const status = row.status || 'P';
                    const markedAt = row.marked_at || row.timestamp || new Date();
                    const periodId = parseInt(row.period_id || 1);

                    // Find student to verify exists
                    const student = await User.findOne({
                        $or: [
                            { uid: studentId },
                            { student_id: studentId },
                            { email: studentId }
                        ]
                    });

                    if (student) {
                        // Create or Update Attendance
                        await Attendance.findOneAndUpdate(
                            {
                                student_id: student._id,
                                period_id: periodId,
                                marked_at: {
                                    $gte: new Date(markedAt).setHours(0, 0, 0, 0),
                                    $lte: new Date(markedAt).setHours(23, 59, 59, 999)
                                }
                            },
                            {
                                student_id: student._id,
                                name: student.name,
                                email: student.email,
                                status: status,
                                period_id: periodId,
                                marked_at: new Date(markedAt)
                            },
                            { upsert: true, new: true }
                        );
                        count++;
                    }
                }

                // Cleanup
                fs.unlinkSync(req.file.path);
                res.json({ ok: true, message: `Processed ${count} attendance records` });
            } catch (err) {
                if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                res.status(500).json({ error: err.message });
            }
        });
});

module.exports = router;
