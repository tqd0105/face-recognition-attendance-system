const pool = require('../config/db');

function isAdminRole(role) {
    return String(role || '').toLowerCase() === 'admin';
}

function normalizeTeacherIds(input) {
    const raw = Array.isArray(input) ? input : input ? [input] : [];
    const ids = raw
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0);
    return Array.from(new Set(ids));
}

async function fetchClassWithTeachers(classId) {
    const result = await pool.query(
        `SELECT hc.*,
                COALESCE(array_agg(t.id) FILTER (WHERE t.id IS NOT NULL), '{}') AS teacher_ids,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', t.id,
                            'teacher_code', t.teacher_code,
                            'teacher_name', t.teacher_name,
                            'email', t.email,
                            'role', t.role
                        )
                    ) FILTER (WHERE t.id IS NOT NULL),
                    '[]'::json
                ) AS teachers
         FROM Home_class hc
         LEFT JOIN Home_class_teachers hct ON hct.home_class_id = hc.id
         LEFT JOIN Teacher t ON t.id = hct.teacher_id
         WHERE hc.id = $1
         GROUP BY hc.id`,
        [classId]
    );

    return result.rows[0] || null;
}

// @desc    Lấy danh sách tất cả lớp sinh hoạt 
// @route   GET /api/home-classes
// @access  Private (Chỉ Giảng viên đã đăng nhập mới được xem) (Có hỗ trợ phân trang và lọc)
exports.getClass = async (req, res) => {
    try {
        const { page = 1, limit = 10, department, major } = req.query;
        const isAdmin = isAdminRole(req.user?.role);

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const offset = (pageNum - 1) * limitNum;

        let conditions = [];
        let values = [];
        let paramIndex = 1;

        // Lọc theo Khoa (department)
        if (department) {
            conditions.push(`hc.department ILIKE $${paramIndex}`);
            values.push(`%${department}%`);
            paramIndex++;
        }

        // Lọc theo Ngành (major)
        if (major) {
            conditions.push(`hc.major ILIKE $${paramIndex}`);
            values.push(`%${major}%`);
            paramIndex++;
        }

        if (!isAdmin) {
            conditions.push(`hct.teacher_id = $${paramIndex}`);
            values.push(Number(req.user?.id));
            paramIndex++;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const joinClause = isAdmin
            ? 'LEFT JOIN Home_class_teachers hct ON hct.home_class_id = hc.id'
            : 'JOIN Home_class_teachers hct ON hct.home_class_id = hc.id';

        const dataQuery = `
            SELECT hc.*,
                   COALESCE(array_agg(t.id) FILTER (WHERE t.id IS NOT NULL), '{}') AS teacher_ids,
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'id', t.id,
                               'teacher_code', t.teacher_code,
                               'teacher_name', t.teacher_name,
                               'email', t.email,
                               'role', t.role
                           )
                       ) FILTER (WHERE t.id IS NOT NULL),
                       '[]'::json
                   ) AS teachers
            FROM Home_class hc
            ${joinClause}
            LEFT JOIN Teacher t ON t.id = hct.teacher_id
            ${whereClause}
            GROUP BY hc.id
            ORDER BY hc.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        const dataValues = [...values, limitNum, offset];
        const countQuery = `
            SELECT COUNT(DISTINCT hc.id) FROM Home_class hc
            ${joinClause}
            ${whereClause}
        `;
        const [dataResult, countResult] = await Promise.all([
            pool.query(dataQuery, dataValues),
            pool.query(countQuery, values) // Câu đếm thì không cần limit và offset
        ]);

        const totalItems = parseInt(countResult.rows[0].count, 10);
        const totalPages = Math.ceil(totalItems / limitNum);

        res.status(200).json({
            message: 'Fetched home classes successfully',
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
        res.status(500).json({ message: 'Server error while fetching home classes' });
    }
};

// @desc    Thêm lớp sinh hoạt mới
// @route   POST /api/home-classes
// @access  Private
exports.createClass = async (req, res) => {
    const { class_code, major, department } = req.body;
    const teacherIds = normalizeTeacherIds(req.body?.teacher_ids ?? req.body?.teacherIds);

    try {
        // 1. Kiểm tra xem mã lớp đã bị trùng
        const checkExist = await pool.query('SELECT * FROM Home_class WHERE class_code = $1', [class_code]);
        if (checkExist.rows.length > 0) {
            return res.status(400).json({ message: 'This class code already exists in the system!' });
        }

        if (teacherIds.length > 0) {
            const existingTeachers = await pool.query(
                'SELECT id FROM Teacher WHERE id = ANY($1::int[])',
                [teacherIds]
            );

            if (existingTeachers.rows.length !== teacherIds.length) {
                return res.status(400).json({ message: 'One or more teacher_ids are invalid.' });
            }
        }

        // 2. Thêm lớp mới vào DB
        const newClass = await pool.query(
            'INSERT INTO Home_class (class_code, major, department) VALUES ($1, $2, $3) RETURNING *',
            [class_code, major, department]
        );

        if (teacherIds.length > 0) {
            await pool.query(
                `INSERT INTO Home_class_teachers (home_class_id, teacher_id)
                 SELECT $1, UNNEST($2::int[])
                 ON CONFLICT DO NOTHING`,
                [newClass.rows[0].id, teacherIds]
            );
        }

        const response = await fetchClassWithTeachers(newClass.rows[0].id);

        res.status(201).json({
            message: 'Home class created successfully',
            data: response || newClass.rows[0]
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Server error while creating home class' });
    }
};

// @desc    Cập nhật lớp sinh hoạt
// @route   PUT /api/home-classes/:id
// @access  Private
exports.updateClass = async (req, res) => {
    const { id } = req.params;
    const { class_code, major, department } = req.body;
    const hasTeacherIds = Array.isArray(req.body?.teacher_ids) || Array.isArray(req.body?.teacherIds);
    const teacherIds = normalizeTeacherIds(req.body?.teacher_ids ?? req.body?.teacherIds ?? []);

    try {
        const checkExist = await pool.query(
            'SELECT * FROM Home_class WHERE class_code = $1 AND id != $2',
            [class_code, id]
        );

        if (checkExist.rows.length > 0) {
            return res.status(400).json({ message: 'This class code already exists in the system!' });
        }

        if (hasTeacherIds && teacherIds.length > 0) {
            const existingTeachers = await pool.query(
                'SELECT id FROM Teacher WHERE id = ANY($1::int[])',
                [teacherIds]
            );

            if (existingTeachers.rows.length !== teacherIds.length) {
                return res.status(400).json({ message: 'One or more teacher_ids are invalid.' });
            }
        }

        const updated = await pool.query(
            `UPDATE Home_class
             SET class_code = $1, major = $2, department = $3
             WHERE id = $4
             RETURNING *`,
            [class_code, major, department, id]
        );

        if (updated.rows.length === 0) {
            return res.status(404).json({ message: 'Home class not found for update!' });
        }

        if (hasTeacherIds) {
            await pool.query('DELETE FROM Home_class_teachers WHERE home_class_id = $1', [id]);

            if (teacherIds.length > 0) {
                await pool.query(
                    `INSERT INTO Home_class_teachers (home_class_id, teacher_id)
                     SELECT $1, UNNEST($2::int[])
                     ON CONFLICT DO NOTHING`,
                    [id, teacherIds]
                );
            }
        }

        const response = await fetchClassWithTeachers(id);

        return res.status(200).json({
            message: 'Home class updated successfully!',
            data: response || updated.rows[0],
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: 'Server error while updating home class' });
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
            return res.status(404).json({ message: 'Home class not found for delete!' });
        }

        return res.status(200).json({
            message: 'Home class deleted successfully!',
            data: deleted.rows[0],
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: 'Server error while deleting home class' });
    }
};