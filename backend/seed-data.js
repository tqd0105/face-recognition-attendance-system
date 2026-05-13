const bcrypt = require('bcryptjs');
const pool = require('./config/db');
require('dotenv').config();

async function ensureTeacherRoleSchema() {
    await pool.query("ALTER TABLE Teacher ADD COLUMN IF NOT EXISTS role VARCHAR(20)");
    await pool.query("UPDATE Teacher SET role = 'teacher' WHERE role IS NULL OR role NOT IN ('teacher', 'admin')");
    await pool.query("ALTER TABLE Teacher ALTER COLUMN role SET DEFAULT 'teacher'");
    await pool.query("ALTER TABLE Teacher ALTER COLUMN role SET NOT NULL");
    await pool.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'teacher_role_check'
                  AND conrelid = 'teacher'::regclass
            ) THEN
                ALTER TABLE Teacher
                ADD CONSTRAINT teacher_role_check CHECK (role IN ('teacher', 'admin'));
            END IF;
        END $$;
    `);
}

async function seedData() {
    try {
        console.log('⏳ Đang khởi tạo dữ liệu mẫu...');
        await ensureTeacherRoleSchema();

        const defaultPassword = '123456';
        const teacherPassword = process.env.TEACHER_SEED_PASSWORD || defaultPassword;
        const adminPassword = process.env.ADMIN_SEED_PASSWORD || defaultPassword;
        const adminEmail = String(process.env.ADMIN_SEED_EMAIL || '').trim().toLowerCase();

        const teacherHash = await bcrypt.hash(teacherPassword, 10);

        const teacherQuery = `
            INSERT INTO Teacher (teacher_code, teacher_name, email, password_hash, role, status)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (teacher_code) DO UPDATE
            SET email = EXCLUDED.email,
                teacher_name = EXCLUDED.teacher_name,
                password_hash = EXCLUDED.password_hash,
                role = EXCLUDED.role,
                status = EXCLUDED.status;
        `;
        await pool.query(teacherQuery, [
            'GV001',
            'Nguyễn Văn Anh',
            'anhnv@ut.edu.vn',
            teacherHash,
            'teacher',
            'active'
        ]);

        await pool.query(teacherQuery, [
            'GV002',
            'Trần Văn Bảo',
            'baotv@ut.edu.vn',
            teacherHash,
            'teacher',
            'active'
        ]);

        if (adminEmail) {
            const adminHash = await bcrypt.hash(adminPassword, 10);
            await pool.query(teacherQuery, [
                'AD001',
                'System Admin',
                adminEmail,
                adminHash,
                'admin',
                'active'
            ]);
        } else {
            console.warn('⚠️ Chưa cấu hình ADMIN_SEED_EMAIL, bỏ qua seed tài khoản admin.');
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
