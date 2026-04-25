async function initializeDatabase() {
  try {
    const sqlPath = path.join(__dirname, 'database.sql');
    const sqlString = fs.readFileSync(sqlPath, 'utf8');

    const queries = sqlString
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0);

    console.log('⏳ Đang khởi tạo các bảng...');

    for (const query of queries) {
      await pool.query(query);
    }

    console.log('✅ Tạo bảng thành công!');
  } catch (err) {
    console.error('❌ Lỗi:', err);
  } finally {
    await pool.end();
    process.exit();
  }
}