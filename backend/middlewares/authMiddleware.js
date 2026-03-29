const jwt = require('jsonwebtoken');

const protect = async (req, res, next) => {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            next();
        } catch (error){
            console.error('Lỗi xác thực Token:', error.message);
            return res.status(401).json({ message: 'Không có quyền truy cập, token không hợp lệ hoặc đã hết hạn' });
        }
    }
    if (!token) {
        return res.status(401).json({ message: 'Không có quyền truy cập, không tìm thấy token' });
    }
};

module.exports = { protect };