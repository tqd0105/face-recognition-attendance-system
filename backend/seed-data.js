const bcrypt = require('bcryptjs');
const pool = require('./config/db');
require('dotenv').config();

function parseAdminEmails() {
    return String(process.env.ADMIN_EMAILS || '')
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
}

async function seedData() {
    try {
        console.log('⏳ Đang khởi tạo dữ liệu mẫu...');

        const defaultPassword = '123456';
        const teacherPassword = process.env.TEACHER_SEED_PASSWORD || defaultPassword;
        const adminPassword = process.env.ADMIN_SEED_PASSWORD || defaultPassword;
        const adminEmail = parseAdminEmails()[0];

        const teacherHash = await bcrypt.hash(teacherPassword, 10);

        const teacherQuery = `
            INSERT INTO Teacher (teacher_code, teacher_name, email, password_hash, status)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (email) DO UPDATE
            SET teacher_code = EXCLUDED.teacher_code,
                teacher_name = EXCLUDED.teacher_name,
                password_hash = EXCLUDED.password_hash,
                status = EXCLUDED.status;
        `;
        await pool.query(teacherQuery, [
            'GV001',
            'Nguyễn Văn A',
            'anhnv@ut.edu.vn',
            teacherHash,
            'active'
        ]);

        if (adminEmail) {
            const adminHash = await bcrypt.hash(adminPassword, 10);
            await pool.query(teacherQuery, [
                'AD001',
                'System Admin',
                adminEmail,
                adminHash,
                'active'
            ]);
        } else {
            console.warn('⚠️ Chưa cấu hình ADMIN_EMAILS, bỏ qua seed tài khoản admin.');
        }

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
