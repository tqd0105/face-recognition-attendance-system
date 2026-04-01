require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const classRoutes = require('./routes/classRoutes');
const studentRoutes = require('./routes/studentRoutes');
const courseRoutes = require('./routes/courseRoutes');
const enrollmentRoutes = require('./routes/enrollmentRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const biometricRoutes = require('./routes/biometricRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Cho phép backend đọc được data JSON từ Frontend gửi lên

// Connect with Route
app.use('/api/auth', authRoutes); 

// API Test thử
app.get('/', (req, res) => {
  res.send('Face Recognition Backend is running! 🚀');
});

app.use('/api/home-classes', classRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/course-classes', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/biometrics', biometricRoutes);

// Khởi động server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});