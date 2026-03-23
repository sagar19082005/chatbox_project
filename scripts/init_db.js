const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function run() {
  const file = path.join(__dirname, '..', 'db', 'schema_postgres.sql');
  const sql = fs.readFileSync(file, 'utf8');

  const connectionString = process.env.DATABASE_URL || (process.env.DB_HOST ?
    `postgresql://${encodeURIComponent(process.env.DB_USER || 'postgres')}:${encodeURIComponent(process.env.DB_PASSWORD || '')}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'chatbox'}` : undefined);

  if (!connectionString) {
    console.error('No DATABASE_URL or DB_HOST provided in environment.');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    console.log('Running DB schema (Postgres)...');
    await client.query(sql);
    console.log('Schema applied successfully.');
  } catch (err) {
    console.error('Failed to apply schema:', err.message || err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run();
