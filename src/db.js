const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || (process.env.DB_HOST ?
  `postgresql://${encodeURIComponent(process.env.DB_USER || 'postgres')}:${encodeURIComponent(process.env.DB_PASSWORD || '')}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'chatbox'}` : undefined);

const pool = new Pool(connectionString ? { connectionString } : {});

module.exports = {
  query: async (text, params) => {
    const res = await pool.query(text, params);
    return [res.rows, res];
  },
  pool
};
