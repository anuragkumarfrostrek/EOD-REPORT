const { Pool } = require('pg');
const { parse } = require('pg-connection-string');

// Parse the connection string to extract individual parameters
// This lets us override SSL settings independently of URL sslmode
const config = parse(process.env.DATABASE_URL);

const pool = new Pool({
  host: config.host,
  port: parseInt(config.port, 10) || 6543,
  database: config.database,
  user: config.user,
  password: config.password,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 8000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

const query = (text, params) => pool.query(text, params);

const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
