const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Test thử kết nối ngay khi khởi tạo
pool.connect()
  .then(client => {
    console.log('✅ Connected to PostgreSQL Database successfully!');
    client.release(); // Giải phóng client sau khi test xong
  })
  .catch(err => {
    console.error('❌ Database connection error:', err.stack);
  });

module.exports = pool;