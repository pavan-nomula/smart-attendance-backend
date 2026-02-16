const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    role: { type: String, enum: ['student', 'faculty', 'incharge', 'admin'], default: 'student' },
    uid: { type: String, default: null },
    id_number: { type: String, default: null },
    department: { type: String, default: null },
    is_active: { type: Boolean, default: true },
    must_change_password: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
