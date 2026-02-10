const { pool } = require('./db');

async function fixRoles() {
    try {
        console.log('Fixing user roles...');

        // Update the admin user to have 'admin' role instead of 'incharge'
        const result = await pool.query(
            "UPDATE users SET role = 'admin' WHERE email = 'admin@vishnu.edu.in' RETURNING *"
        );

        if (result.rowCount > 0) {
            console.log('Successfully updated admin user:', result.rows[0].email);
        } else {
            console.log('Admin user admin@vishnu.edu.in not found or already correct.');
        }

        // Also ensure we have an incharge for testing
        const inchargeCheck = await pool.query("SELECT * FROM users WHERE role = 'incharge'");
        if (inchargeCheck.rowCount === 0) {
            console.log('Adding a test incharge user...');
            await pool.query(
                "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)",
                ['Test Incharge', 'incharge@vishnu.edu.in', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'incharge'] // password: admin123
            );
            console.log('Test incharge added: incharge@vishnu.edu.in');
        }

        process.exit(0);
    } catch (err) {
        console.error('Error fixing roles:', err);
        process.exit(1);
    }
}

fixRoles();
