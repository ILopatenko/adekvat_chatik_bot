require('dotenv').config();

const { Pool } = require('pg');

const pool = new Pool({
   host: process.env.DB_HOST,
   port: Number(process.env.DB_PORT),
   database: process.env.DB_NAME,
   user: process.env.DB_USER,
   password: process.env.DB_PASSWORD,
});

pool.on('error', error => {
   console.error('PostgreSQL error:', error);
});

async function connectDatabase() {
   const client = await pool.connect();

   try {
      await client.query('SELECT 1');
      console.log('PostgreSQL connected');
   } finally {
      client.release();
   }

   return pool;
}

module.exports = {
   connectDatabase,
   pool,
};
