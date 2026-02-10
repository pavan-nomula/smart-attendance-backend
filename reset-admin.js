const { pool } = require('./db');
const bcrypt = require('bcrypt');

async function resetAdmin() {
    try {
        const email = 'admin@vishnu.edu.in';
        const password = 'admin123';
        const hash = await bcrypt.hash(password, 10);

        console.log(`Resetting admin user ${email}...`);

        const result = await pool.query(
            "UPDATE users SET password_hash = $1, role = 'admin' WHERE email = $2 RETURNING *",
            [hash, email]
        );

        if (result.rowCount > 0) {
            console.log('Success! Admin user updated.');
        } else {
            console.log('Admin user not found. Creating new admin user...');
            await pool.query(
                "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)",
                ['System Admin', email, hash, 'admin']
            );
            console.log('Success! New admin user created.');
        }

        // Also create/update incharge for testing
        const inchargeEmail = 'incharge@vishnu.edu.in';
        const inchargeHash = await bcrypt.hash('admin123', 10);
        const inchargeResult = await pool.query(
            "UPDATE users SET password_hash = $1, role = 'incharge' WHERE email = $2 RETURNING *",
            [inchargeHash, inchargeEmail]
        );
        if (inchargeResult.rowCount === 0) {
            await pool.query(
                "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)",
                ['Test Incharge', inchargeEmail, inchargeHash, 'incharge']
            );
            console.log('Success! Test incharge user created.');
        } else {
            console.log('Success! Test incharge user updated.');
        }

        process.exit(0);
    } catch (err) {
        console.error('Error resetting admin:', err);
        process.exit(1);
    }
}

resetAdmin();
