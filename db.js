const { Pool } = require('pg');
require('dotenv').config();

let poolConfig;
if (process.env.DATABASE_URL) {
  // Use single DATABASE_URL in deployed environments (Heroku/Vercel)
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    // Many hosted Postgres providers require SSL; allow opt-out via env
    ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
  };
} else {
  poolConfig = {
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'Hello@',
    host: process.env.PGHOST || 'localhost',
    port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
    database: process.env.PGDATABASE || 'attendance_db'
  };
}

const pool = new Pool(poolConfig);

// Log unexpected errors from the pool
pool.on('error', (err) => {
  console.error('Unexpected Postgres pool error', err);
});

// DB readiness flag
let _dbReady = false;

// Perform a quick connectivity check on startup to surface configuration/credential issues
pool.query('SELECT NOW()')
  .then((res) => {
    _dbReady = true;
    console.log('Postgres connected, now=', res.rows[0].now);
  })
  .catch((err) => {
    _dbReady = false;
    console.error('Postgres connectivity check failed:', err && err.message ? err.message : err);
  });

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  isReady: () => _dbReady,
};
