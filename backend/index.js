const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const db = require('./config/db');

// Middleware
app.use(cors());
app.use(express.json()); // Cho phép backend đọc được data JSON từ Frontend gửi lên

// API Test thử
app.get('/', (req, res) => {
  res.send('Face Recognition Backend is running! 🚀');
});

// Khởi động server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});