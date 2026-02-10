const db = require('./db');

async function dumpUsers() {
    try {
        const res = await db.query('SELECT * FROM users ORDER BY id');
        console.log('--- ALL USERS ---');
        console.log(JSON.stringify(res.rows, null, 2));
        console.log('-----------------');
        console.log(`Total users: ${res.rows.length}`);
    } catch (err) {
        console.error('Error dumping database:', err);
    } finally {
        // We need to close the pool to exit the script
        // heavily depends on how db.js is implemented, but usually the process exit is enough if not persistent.
        // simpler: just exit.
        process.exit();
    }
}

dumpUsers();
