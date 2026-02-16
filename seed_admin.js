const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');
require('dotenv').config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for seeding...');

        const adminEmail = 'admin@vishnu.edu.in';
        const existing = await User.findOne({ email: adminEmail });

        if (existing) {
            console.log('Admin already exists.');
        } else {
            const hashed = await bcrypt.hash('Admin@123', 10);
            const admin = new User({
                name: 'System Admin',
                email: adminEmail,
                password_hash: hashed,
                role: 'admin',
                is_active: true
            });
            await admin.save();
            console.log('Admin user created successfully!');
            console.log('Email: admin@vishnu.edu.in');
            console.log('Password: Admin@123');
        }

        await mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
};

seedAdmin();
