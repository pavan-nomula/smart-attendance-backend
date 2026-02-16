const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
    day_of_week: { type: String, required: true },
    subject: { type: String, required: true },
    start_time: { type: String, required: true },
    end_time: { type: String, required: true },
    faculty_name: { type: String },
    faculty_email: { type: String },
    department: { type: String },
    class_name: { type: String },
    period_id: { type: Number },
    location: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Timetable', timetableSchema);
