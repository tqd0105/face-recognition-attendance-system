require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/db');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const authRoutes = require('./routes/authRoutes');
const classRoutes = require('./routes/classRoutes');
const studentRoutes = require('./routes/studentRoutes');
const courseRoutes = require('./routes/courseRoutes');
const enrollmentRoutes = require('./routes/enrollmentRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const biometricRoutes = require('./routes/biometricRoutes');
const adminRoutes = require('./routes/adminRoutes');

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
app.use('/api/admin', adminRoutes);

function resolveAiConfig() {
  return {
    aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
    aiServiceToken: process.env.AI_SERVICE_TOKEN || process.env.API_TOKEN || 'change_me',
  };
}

function parseEmbedding(rawEmbedding) {
  if (Array.isArray(rawEmbedding)) {
    return rawEmbedding.map((value) => Number(value));
  }

  if (typeof rawEmbedding === 'string') {
    const normalized = rawEmbedding.trim().replace(/^\[/, '').replace(/\]$/, '');
    if (!normalized) {
      return [];
    }
    return normalized.split(',').map((value) => Number(value.trim()));
  }

  return [];
}

async function loadSessionEmbeddingsForAutoStart(sessionId, courseClassId) {
  const vectorQuery = `
    SELECT s.id AS student_id, latest.embedding
    FROM Enrollments e
    JOIN Student s ON e.student_id = s.id
    JOIN LATERAL (
      SELECT f.embedding
      FROM Face_embeddings f
      WHERE f.student_id = s.id
      ORDER BY f.created_at DESC
      LIMIT 1
    ) latest ON TRUE
    WHERE e.course_class_id = $1
  `;

  let vectorResult = await db.query(vectorQuery, [courseClassId]);

  if (vectorResult.rows.length === 0) {
    const linkedHomeClass = await db.query(
      'SELECT home_class_id FROM Course_classes WHERE id = $1',
      [courseClassId]
    );

    const homeClassId = Number(linkedHomeClass.rows[0]?.home_class_id ?? 0);
    if (Number.isFinite(homeClassId) && homeClassId > 0) {
      await db.query(
        `INSERT INTO Enrollments (student_id, course_class_id)
         SELECT s.id, $1
         FROM Student s
         WHERE s.home_class_id = $2
           AND EXISTS (
             SELECT 1
             FROM Face_embeddings f
             WHERE f.student_id = s.id
           )
         ON CONFLICT DO NOTHING`,
        [courseClassId, homeClassId]
      );

      vectorResult = await db.query(vectorQuery, [courseClassId]);
    }
  }

  if (vectorResult.rows.length === 0) {
    throw new Error('NO_FACE_DATA');
  }

  const aiPayload = vectorResult.rows.map((row) => ({
    student_id: String(row.student_id),
    embedding: parseEmbedding(row.embedding),
  }));

  const { aiServiceUrl, aiServiceToken } = resolveAiConfig();
  await axios.post(
    `${aiServiceUrl}/ai/load-embeddings`,
    {
      session_id: String(sessionId),
      items: aiPayload,
    },
    {
      headers: {
        'X-Service-Token': aiServiceToken,
      },
    }
  );
}

let isSessionLifecycleJobRunning = false;

async function bootstrapStudentCredentials() {
  try {
    await db.query('ALTER TABLE Student ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)');

    const missingPasswordStudents = await db.query(
      `SELECT id, student_code
       FROM Student
       WHERE password_hash IS NULL OR TRIM(password_hash) = ''`
    );

    for (const row of missingPasswordStudents.rows) {
      const sid = Number(row.id);
      const rawPassword = String(row.student_code || '').trim();
      if (!Number.isFinite(sid) || sid <= 0 || !rawPassword) {
        continue;
      }

      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(rawPassword, salt);

      await db.query(
        `UPDATE Student
         SET password_hash = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [hash, sid]
      );
    }

    if (missingPasswordStudents.rows.length > 0) {
      console.log(`Initialized password_hash for ${missingPasswordStudents.rows.length} student account(s).`);
    }
  } catch (error) {
    console.error('Student credential bootstrap error:', error.message);
  }
}

async function runSessionLifecycleJob() {
  if (isSessionLifecycleJobRunning) {
    return;
  }

  isSessionLifecycleJobRunning = true;
  try {
    const sessionsToAutoStart = await db.query(
      `SELECT id, course_class_id
       FROM Session
       WHERE status = 'scheduled'
         AND (session_date + start_time) <= NOW()
         AND (session_date + end_time) > NOW()
       ORDER BY session_date ASC, start_time ASC
       LIMIT 50`
    );

    for (const row of sessionsToAutoStart.rows) {
      const sessionId = Number(row.id);
      const courseClassId = Number(row.course_class_id);

      if (!Number.isFinite(sessionId) || sessionId <= 0 || !Number.isFinite(courseClassId) || courseClassId <= 0) {
        continue;
      }

      try {
        await loadSessionEmbeddingsForAutoStart(sessionId, courseClassId);

        const activated = await db.query(
          `UPDATE Session
           SET status = 'active'
           WHERE id = $1
             AND status = 'scheduled'
           RETURNING id`,
          [sessionId]
        );

        // If another action changed status in parallel, unload to avoid stale cache in AI.
        if (activated.rows.length === 0) {
          const { aiServiceUrl, aiServiceToken } = resolveAiConfig();
          await axios.post(
            `${aiServiceUrl}/ai/unload-embeddings`,
            { session_id: String(sessionId) },
            { headers: { 'X-Service-Token': aiServiceToken } }
          ).catch(() => undefined);
        }
      } catch (error) {
        console.error(`Auto-start failed for session ${sessionId}:`, error?.message || error);
      }
    }

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

void bootstrapStudentCredentials();
void runSessionLifecycleJob();
setInterval(runSessionLifecycleJob, Number(process.env.SESSION_LIFECYCLE_INTERVAL_MS || 60000));