const pool = require('../config/db');

// @desc    Lấy danh sách tất cả lớp sinh hoạt
// @route   GET /api/classes
// @access  Private (Chỉ Giảng viên đã đăng nhập mới được xem)
exports.getClass = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM Home_class ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách lớp' });
    }
};

// @desc    Thêm lớp sinh hoạt mới
// @route   POST /api/classes
// @access  Private
exports.createClass = async (req, res) => {
    const {class_code, major, department} = req.body;

    try {
        // 1. Kiểm tra xem mã lớp đã bị trùng
        const checkExist = await pool.query('SELECT * FROM Home_class WHERE class_code = $1', [class_code]);
        if(checkExist.rows.length > 0) {
            return res.status(400).json({message: 'Mã lớp này đã tồn tại trong hệ thống!'});
        }
        
        // 2. Thêm lớp mới vào DB
        const newClass = await pool.query(
            'INSERT INTO Home_class (class_code, major, department) VALUES ($1, $2, $3) RETURNING *',
            [class_code, major, department]
        );

        res.status(201).json({
            message: 'Thêm lớp sinh hoạt thành công',
            data: newClass.rows[0]
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Lỗi server khi tạo lớp mới' });
    }
};