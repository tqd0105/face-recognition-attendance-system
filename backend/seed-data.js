const bcrypt = require('bcryptjs');
const pool = require('./config/db');

async function seedData() {
    try {
        console.log('⏳ Đang khởi tạo dữ liệu mẫu...');

        const salt = await bcrypt.genSalt(10);
        const hashedPwd = await bcrypt.hash('123456', salt);

        const teacherQuery = `
            INSERT INTO Teacher (teacher_code, teacher_name, email, password_hash, status)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (teacher_code) DO NOTHING;
        `;
        await pool.query(teacherQuery, [
            'GV001',
            'Nguyễn Văn A',
            'gva@school.edu.vn',
            hashedPwd,
            'active'
        ]);

        const classQuery = `
            INSERT INTO Home_class (class_code, major, department)
            VALUES ($1, $2, $3)
            ON CONFLICT (class_code) DO NOTHING;
        `;
        await pool.query(classQuery, [
            'DCT1211',
            'Công nghệ thông tin',
            'CNTT'
        ]);

        console.log('✅ Đã nạp dữ liệu mẫu thành công!');
    } catch (err) {
        console.error('❌ Lỗi nạp dữ liệu:', err);
    } finally {
        pool.end();
        process.exit();
    }
}

seedData();