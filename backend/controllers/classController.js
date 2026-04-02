const pool = require('../config/db');

// @desc    Lấy danh sách tất cả lớp sinh hoạt 
// @route   GET /api/home-classes
// @access  Private (Chỉ Giảng viên đã đăng nhập mới được xem) (Có hỗ trợ phân trang và lọc)
exports.getClass = async (req, res) => {
    try {
        const { page = 1, limit = 10, department, major } = req.query;

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const offset = (pageNum - 1) * limitNum;

        let conditions = [];
        let values = [];
        let paramIndex = 1;

        // Lọc theo Khoa (department)
        if (department) {
            conditions.push(`department ILIKE $${paramIndex}`);
            values.push(`%${department}%`);
            paramIndex++;
        }

        // Lọc theo Ngành (major)
        if (major) {
            conditions.push(`major ILIKE $${paramIndex}`);
            values.push(`%${major}%`);
            paramIndex++;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const dataQuery = `
            SELECT * FROM Home_class 
            ${whereClause} 
            ORDER BY created_at DESC 
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        const dataValues = [...values, limitNum, offset];
        const countQuery = `
            SELECT COUNT(*) FROM Home_class 
            ${whereClause}
        `;
        const [dataResult, countResult] = await Promise.all([
            pool.query(dataQuery, dataValues),
            pool.query(countQuery, values) // Câu đếm thì không cần limit và offset
        ]);

        const totalItems = parseInt(countResult.rows[0].count, 10);
        const totalPages = Math.ceil(totalItems / limitNum);

        res.status(200).json({
            message: 'Lấy danh sách Lớp sinh hoạt thành công',
            data: dataResult.rows,
            pagination: {
                total_items: totalItems,
                total_pages: totalPages,
                current_page: pageNum,
                limit: limitNum
            }
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách lớp sinh hoạt' });
    }
};

// @desc    Thêm lớp sinh hoạt mới
// @route   POST /api/home-classes
// @access  Private
exports.createClass = async (req, res) => {
    const { class_code, major, department } = req.body;

    try {
        // 1. Kiểm tra xem mã lớp đã bị trùng
        const checkExist = await pool.query('SELECT * FROM Home_class WHERE class_code = $1', [class_code]);
        if (checkExist.rows.length > 0) {
            return res.status(400).json({ message: 'Mã lớp này đã tồn tại trong hệ thống!' });
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

// @desc    Cập nhật lớp sinh hoạt
// @route   PUT /api/home-classes/:id
// @access  Private
exports.updateClass = async (req, res) => {
    const { id } = req.params;
    const { class_code, major, department } = req.body;

    try {
        const checkExist = await pool.query(
            'SELECT * FROM Home_class WHERE class_code = $1 AND id != $2',
            [class_code, id]
        );

        if (checkExist.rows.length > 0) {
            return res.status(400).json({ message: 'Mã lớp này đã tồn tại trong hệ thống!' });
        }

        const updated = await pool.query(
            `UPDATE Home_class
             SET class_code = $1, major = $2, department = $3
             WHERE id = $4
             RETURNING *`,
            [class_code, major, department, id]
        );

        if (updated.rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy lớp sinh hoạt để cập nhật!' });
        }

        return res.status(200).json({
            message: 'Cập nhật lớp sinh hoạt thành công!',
            data: updated.rows[0],
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: 'Lỗi server khi cập nhật lớp sinh hoạt' });
    }
};

// @desc    Xóa lớp sinh hoạt
// @route   DELETE /api/home-classes/:id
// @access  Private
exports.deleteClass = async (req, res) => {
    const { id } = req.params;

    try {
        const deleted = await pool.query(
            `DELETE FROM Home_class WHERE id = $1 RETURNING *`,
            [id]
        );

        if (deleted.rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy lớp sinh hoạt để xóa!' });
        }

        return res.status(200).json({
            message: 'Xóa lớp sinh hoạt thành công!',
            data: deleted.rows[0],
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: 'Lỗi server khi xóa lớp sinh hoạt' });
    }
};