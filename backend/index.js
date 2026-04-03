require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/db');
const axios = require('axios');
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
app.use(express.json({ limit: '8mb' })); // Cho phép nhận frame base64 từ realtime recognition
app.use(express.urlencoded({ limit: '8mb', extended: true }));

// Connect with Route
app.use('/api/auth', authRoutes);

// API Test thử
app.get('/', (req, res) => {
  res.send('Face Recognition Backend is running! 🚀');
});

app.get('/api/health/services', async (req, res) => {
  const { aiServiceUrl } = resolveAiConfig();

  try {
    await db.query('SELECT 1');
  } catch (error) {
    return res.status(500).json({
      message: 'Backend database is not reachable',
      data: {
        backend: 'down',
        database: 'down',
        ai: 'unknown',
        ai_url: aiServiceUrl,
      },
    });
  }

  let aiStatus = 'down';
  try {
    const aiResponse = await axios.get(`${aiServiceUrl}/health`, { timeout: 3000 });
    aiStatus = aiResponse?.status === 200 ? 'up' : 'down';
  } catch {
    aiStatus = 'down';
  }

  return res.status(200).json({
    message: 'Service health checked successfully',
    data: {
      backend: 'up',
      database: 'up',
      ai: aiStatus,
      ai_url: aiServiceUrl,
    },
  });
});

app.use('/api/home-classes', classRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/course-classes', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/biometrics', biometricRoutes);

function resolveAiConfig() {
  return {
    aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
    aiServiceToken: process.env.AI_SERVICE_TOKEN || process.env.API_TOKEN || 'change_me',
  };
}

let isSessionLifecycleJobRunning = false;

async function runSessionLifecycleJob() {
  if (isSessionLifecycleJobRunning) {
    return;
  }

  isSessionLifecycleJobRunning = true;
  try {
    const endedActive = await db.query(
      `UPDATE Session
       SET status = 'completed'
       WHERE status = 'active'
         AND (session_date + end_time) <= NOW()
       RETURNING id`
    );

    const overdueScheduled = await db.query(
      `UPDATE Session
       SET status = 'canceled'
       WHERE status = 'scheduled'
         AND (session_date + end_time) <= NOW()
       RETURNING id`
    );

    const sessionIdsToUnload = [
      ...endedActive.rows.map((row) => Number(row.id)),
      ...overdueScheduled.rows.map((row) => Number(row.id)),
    ].filter((id) => Number.isFinite(id) && id > 0);

    if (sessionIdsToUnload.length > 0) {
      const { aiServiceUrl, aiServiceToken } = resolveAiConfig();
      await Promise.all(
        sessionIdsToUnload.map((id) =>
          axios.post(
            `${aiServiceUrl}/ai/unload-embeddings`,
            { session_id: String(id) },
            { headers: { 'X-Service-Token': aiServiceToken } }
          ).catch(() => undefined)
        )
      );
    }
  } catch (error) {
    console.error('Session lifecycle job error:', error.message);
  } finally {
    isSessionLifecycleJobRunning = false;
  }
}

// Khởi động server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

void runSessionLifecycleJob();
setInterval(runSessionLifecycleJob, Number(process.env.SESSION_LIFECYCLE_INTERVAL_MS || 60000));