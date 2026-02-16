const mongoose = require('mongoose');

const activationCodeSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    is_used: { type: Boolean, default: false }
});

module.exports = mongoose.model('ActivationCode', activationCodeSchema);
