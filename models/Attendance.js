const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // Format: YYYY-MM-DD
    period_id: { type: Number, required: true },
    status: { type: String, enum: ['P', 'A'], required: true },
    marked_at: { type: Date, default: Date.now },
    source: { type: String, default: 'manual' }
});

// Unique index to prevent duplicate attendance for a student on same day/period
attendanceSchema.index({ student_id: 1, date: 1, period_id: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
