const fs = require('fs');
const path = require('path');
const pool = require('./config/db'); // Tái sử dụng file kết nối bạn vừa tạo

async function initializeDatabase() {
  try {
    const sqlPath = path.join(__dirname, 'database.sql');
    const sqlString = fs.readFileSync(sqlPath, 'utf8');

    console.log('⏳ Đang khởi tạo các bảng trong Database...');
    await pool.query(sqlString);
    console.log('✅ Tạo bảng thành công! Database đã sẵn sàng.');
  } catch (err) {
    console.error('❌ Lỗi khi tạo bảng:', err);
  } finally {
    pool.end(); // Đóng kết nối sau khi chạy xong
    process.exit();
  }
}

initializeDatabase();