// fix_students.js

const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function fix() {
    try {
        console.log('Connecting to MongoDB...');
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in .env');
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const incharge = await User.findOne({ role: 'incharge' });
        if (!incharge) {
            console.warn('⚠️ No incharge found. Using default values.');
        } else {
            console.log(`Using Incharge: ${incharge.name} (${incharge.department} / ${incharge.class_name})`);
        }

        const students = await User.find({
            role: 'student',
            $or: [
                { department: null },
                { class_name: null }
            ]
        });

        console.log(`Found ${students.length} students to fix.`);

        for (const student of students) {
            const oldDept = student.department;
            const oldClass = student.class_name;
            student.department = student.department || (incharge ? incharge.department : 'General');
            student.class_name = student.class_name || (incharge ? incharge.class_name : 'All');
            await student.save();
            console.log(`Fixed ${student.email}: (${oldDept} -> ${student.department}, ${oldClass} -> ${student.class_name})`);
        }

        console.log('✅ Migration complete.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during migration:');
        console.error(err);
        process.exit(1);
    }
}

fix();
